import os
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List

import chromadb
from bs4 import BeautifulSoup
from chromadb.utils import embedding_functions
from loguru import logger
from openai import OpenAI

from infer import inference
from ocr import (
    extract_text_from_bbox,
    ocr_image,
    ocr_pdf,
)

# Import utility functions from separate files
from s3_utils import get_presigned_urls_for_images


# Add custom embedding function
class CustomOpenAIEmbeddingFunction(embedding_functions.OpenAIEmbeddingFunction):
    """
    Custom OpenAI embedding function with better error handling and debugging
    """

    def __call__(self, input: List[str]) -> List[List[float]]:
        """
        Generate embeddings with better error handling and batch processing
        """
        # Filter out empty strings
        valid_inputs = [text for text in input if text.strip()]

        if not valid_inputs:
            # Return empty embeddings for empty inputs
            # This is a fallback to prevent API errors
            logger.warning("All input texts are empty. Returning empty embeddings.")
            return [[0.0] * 1536] * len(input)  # Default dimension for embeddings

        # Process in batches of 2048
        BATCH_SIZE = 2048
        all_embeddings = []

        try:
            # Process in batches
            for i in range(0, len(valid_inputs), BATCH_SIZE):
                batch = valid_inputs[i : i + BATCH_SIZE]
                logger.info(
                    f"Processing batch {i // BATCH_SIZE + 1}/{(len(valid_inputs) + BATCH_SIZE - 1) // BATCH_SIZE} with {len(batch)} inputs"
                )

                try:
                    # Try with parent class method first
                    batch_embeddings = super().__call__(batch)
                    all_embeddings.extend(batch_embeddings)
                except Exception as e:
                    logger.error(f"Error in batch {i // BATCH_SIZE + 1}: {str(e)}")

                    # Fall back to direct API call
                    try:
                        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                        response = client.embeddings.create(
                            input=batch, model="text-embedding-3-small"
                        )
                        batch_embeddings = [item.embedding for item in response.data]
                        all_embeddings.extend(batch_embeddings)
                    except Exception as e2:
                        logger.error(
                            f"Second attempt also failed for batch {i // BATCH_SIZE + 1}: {str(e2)}"
                        )
                        # Use zero embeddings for this batch
                        all_embeddings.extend([[0.0] * 1536] * len(batch))

                # Add a small delay to avoid rate limiting
                if i + BATCH_SIZE < len(valid_inputs):
                    time.sleep(0.5)

            # If we have fewer embeddings than inputs, pad with zeros
            if len(all_embeddings) < len(input):
                logger.warning(
                    f"Padding {len(input) - len(all_embeddings)} embeddings with zeros"
                )
                all_embeddings.extend(
                    [[0.0] * 1536] * (len(input) - len(all_embeddings))
                )

            return all_embeddings

        except Exception as e:
            logger.error(f"Valid Inputs : {len(valid_inputs)}")
            logger.error(f"Error in embedding function: {str(e)}")
            logger.debug(f"Input sample: {valid_inputs[:3]}")

            # Try with the OpenAI client directly as a last resort
            try:
                all_embeddings = []
                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

                for i in range(0, len(valid_inputs), BATCH_SIZE):
                    batch = valid_inputs[i : i + BATCH_SIZE]
                    logger.info(
                        f"Last resort - processing batch {i // BATCH_SIZE + 1}/{(len(valid_inputs) + BATCH_SIZE - 1) // BATCH_SIZE}"
                    )

                    response = client.embeddings.create(
                        input=batch, model="text-embedding-3-small"
                    )
                    batch_embeddings = [item.embedding for item in response.data]
                    all_embeddings.extend(batch_embeddings)

                    # Add a small delay to avoid rate limiting
                    if i + BATCH_SIZE < len(valid_inputs):
                        time.sleep(0.5)

                return all_embeddings
            except Exception as e2:
                logger.error(f"All attempts failed: {str(e2)}")
                # Return zero embeddings as a last resort
                return [[0.0] * 1536] * len(input)


FAQs = {
    "General": [
        "What is the name of the patient?",
        "What is the date of birth of the patient?",
        "What is the address of the patient?",
        "What is the insurance name?",
        "What is the policy number?",
        "What is the patient's height and weight?",
        "What is the emergency contact number for the patient?",
        "What is the phone number of the patient?",
        "What is the prescription provider sign date?",
        "What are the diagnosis codes?",
        "What is the length of need?",
        "What is the prescribed equipment?",
        "Is the accessories included?",
        "What is the date of service?",
        "What is the delivered equipment?",
        "Who signed the delivery ticket (patient or other)?",
    ],
    "PAP": [
        "What is the type of sleep study conducted?",
        "What is the sleep study date?",
        "What is the AHI level?",
        "What are the symptoms mentioned?",
        "What is the prescribed setting?",
        "What is the compliance report date range?",
        "What is the compliance report =>4 hr value?",
    ],
    "Oxygen": [
        "What is the type of blood gas study conducted?",
        "What is the blood gas study date?",
        "What is the blood gas study result?",
        "When was the test taken (during – rest/exercise/sleep)?",
        "What is the prescribed LPM?",
        "What is the prescribed type of oxygen equipment?",
    ],
    "Wheelchair": [
        "What is the prescribed type of wheelchair?",
        "Is the patient can able to participate in MRADL with Wheelchair?",
        "What is the mobility limitation mentioned?",
        "Is the home assessment/plan of care on file?",
        "Does the patient require a caregiver?",
        "Is the patient willing to use the wheelchair?",
    ],
    "Hospital Bed": [
        "What is the prescribed type of Hospital bed?",
        "What is the medical condition mentioned?",
        "Will the patient alleviate with the use of hospital bed?",
    ],
}


class SessionManager:
    def __init__(self, session_id: str, base_directory: str = "data"):
        """
        Initialize the session manager

        Args:
            session_id: Unique identifier for the session
            base_directory: Base directory to store session data
        """
        self.session_id = session_id
        self.base_directory = Path(base_directory)
        self.base_directory.mkdir(exist_ok=True)

        # Create session directory if it doesn't exist
        self.session_dir = self.base_directory / session_id
        self.session_dir.mkdir(exist_ok=True)

        # Create images directory
        self.images_dir = self.session_dir / "images"
        self.images_dir.mkdir(exist_ok=True)
        self.s3_key_prefix = f"documents/{self.session_id}/images"

        self.client = chromadb.PersistentClient(
            path=str(self.session_dir / "chroma.db")
        )

        # Use custom embedding function instead of the default one
        self.embedding_function = CustomOpenAIEmbeddingFunction(
            model_name="text-embedding-3-small",
            api_key=os.getenv("OPENAI_API_KEY"),
        )
        self.prompt_template = (
            "You are an AI assistant tasked with answering questions based on specific lines from a document."
            " These lines are selected from a larger documentand each has a unique line ID. Your goal is to"
            " provide comprehensive answers to the given question using only the provided lines as context."
            "The lines are in the following format: LINEID|| line\n"
            "Here are the selected lines from the document:"
            "<document_lines>"
            "{DOCUMENT_LINES}"
            "</document_lines>\n"
            "The question you need to answer is:"
            "<question>"
            "{QUESTION}"
            "</question>\n"
            "Instructions:\n"
            "1. Carefully read and analyze the provided document lines.\n"
            "2. Identify all possible answers to the question based solely on the information in these lines.\n"
            "3. For each answer, provide the exact lines from the document that support it as evidence. These lines should be quoted verbatim.\n"
            "4. Include the line ID for each piece of evidence you use. This is crucial for matching with a vector database.\n"
            "5. If there are multiple possible answers to the question, provide all of them along with their respective supporting evidence.\n"
            "6. For each answer, provide key search phrases that I can use to search and find the answer anywhere in the document. The search phrases should be short and concise."
            " They should also be not generic in nature and should be specific to the answer alone. You can use common abbreviations and acronyms of the answer as well, but make sure"
            " they should be relevant to the answer and not just the document. Try to split into multiple phrases if the answer is complex or has multiple parts.\n"
            "7. Do not include any information or assumptions that are not directly supported by the given lines.\n"
            "8. If the question is not related to the document or it cant be answered using the evidences, the answer should be 'Not Available' and evidences and search phrases should be empty.\n"
            "9. Your answers should directly answer the question as short as possible, not any introduction or conclusion.\n"
            "Before providing your final answer, use a scratchpad to organize your thoughts and identify potential answers and their supporting evidence. You can use the following format:\n"
            "<scratchpad>\n"
            "Potential Answer 1:\n"
            "- Supporting evidence: [Quote from document_lines]\n"
            "- Line ID: [Corresponding line ID]\n"
            "- Search phrases: [Key search phrases]\n"
            "Potential Answer 2:\n"
            "- Supporting evidence: [Quote from document_lines]\n"
            "- Line ID: [Corresponding line ID]\n"
            "- Search phrases: [Key search phrases]\n"
            "..."
            "</scratchpad>\n"
            "After your analysis, provide your final answer in the following format:"
            "<answer>\n"
            "<text> [State only one possible complete answer using the evidences, not any introduction or conclusion] </text>"
            "<search_phrases>"
            "<phrase> [Key search phrase 1]</phrase>"
            "<phrase> [Key search phrase 2]</phrase>"
            "... continue for all key search phrases"
            "</search_phrases>"
            "<evidence>"
            "[Evidence 1: Exact line from document_lines including line ID]"
            "</evidence>"
            "<evidence>"
            "[Evidence 2: Exact line from document_lines including line ID]"
            "</evidence>"
            "\n[Continue for all possible evidences]\n"
            "</answer>"
            "\n[Continue for all possible answers]\n"
            "Remember, your goal is to provide all possible answers to the question based solely on the given document lines, "
            "along with their supporting evidence and corresponding line IDs."
        )

        # Max retries and delay for rate limiting
        self.max_retries = 3
        self.base_delay = 1  # seconds

        # Get or create collection
        self.collection = self.get_collection()

    def delete_files(self):
        """
        Deletes source files in the session directory
        """
        for file in self.session_dir.glob("*"):
            if file.suffix.lower() in [
                ".pdf",
                ".jpg",
                ".jpeg",
                ".png",
                ".bmp",
                ".tiff",
                ".tif",
            ]:
                file.unlink()

    def get_collection(self):
        """
        Get or create a Chroma collection for the session

        Returns:
            Chroma collection
        """
        collection = self.client.get_or_create_collection(
            self.session_id,
            embedding_function=self.embedding_function,
            metadata={"hnsw:space": "cosine"},
        )
        return collection

    def add_file(
        self,
        file_path: str,
        file_type: str = None,
    ) -> Dict:
        """
        Add a file to the session

        Args:
            file_path: Path to the file
            file_type: Type of file ('pdf' or 'image'). If None, will be determined by file extension.

        Returns:
            Dict with information about the added file
        """
        # Determine file type if not provided
        if file_type is None:
            file_extension = Path(file_path).suffix.lower()
            if file_extension == ".pdf":
                file_type = "pdf"
            elif file_extension in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"]:
                file_type = "image"
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")

        # Get the last page number for this session
        last_page = self.get_last_page_number()
        if file_type == "pdf":
            ocr_fn = ocr_pdf
        elif file_type == "image":
            ocr_fn = ocr_image

        ocr_results = ocr_fn(file_path)

        # Process OCR result and add to collection
        result = self._add_ocr_result_to_collection(ocr_results, last_page)

        # Add image paths
        return result

    def _add_ocr_result_to_collection(
        self, ocr_results: List[Any], last_page: int
    ) -> Dict:
        """
        Add OCR result data to Chroma collection

        Args:
            ocr_results: OCR results
            last_page: Last page number in the collection

        Returns:
            Dict with information about the added data
        """
        all_ids = []
        all_metadatas = []
        all_documents = []
        prev_page_total_lines = -1
        added_pages = 0
        added_lines = 0

        for page_id, page in enumerate(ocr_results):
            # Adjust page_id to continue from the last page in the collection
            adjusted_page_id = last_page + page_id

            # Get page dimensions
            width = page.width
            height = page.height

            # Process lines in the page
            lines = page.lines if hasattr(page, "lines") else []
            max_lines = len(lines)
            added_lines += max_lines

            for line_id, line in enumerate(lines):
                # Get line content
                content = line.content if hasattr(line, "content") else ""

                # Skip empty lines
                if not content.strip():
                    continue

                item_id = f"{adjusted_page_id}-{line_id}"

                # Get normalized bounding box coordinates
                # Azure OCR returns polygon points as (x, y) coordinates
                polygon = line.polygon if hasattr(line, "polygon") else []

                if len(polygon) >= 4:
                    # Extract and normalize coordinates
                    (xtl, ytl), (xtr, ytr), (xbr, ybr), (xbl, ybl) = [
                        (point.x / width, point.y / height) for point in polygon[:4]
                    ]
                else:
                    # Default coordinates if polygon not available
                    xtl, ytl, xtr, ytr, xbr, ybr, xbl, ybl = 0, 0, 0, 0, 0, 0, 0, 0

                # Create metadata
                metadata = {
                    "page_number": adjusted_page_id,
                    "line_id": line_id,
                    "document_id": self.session_id,
                    "xtl": xtl,
                    "ytl": ytl,
                    "xtr": xtr,
                    "ytr": ytr,
                    "xbr": xbr,
                    "ybr": ybr,
                    "xbl": xbl,
                    "ybl": ybl,
                    "max_lines": max_lines,
                    "prev_page_total_lines": prev_page_total_lines,
                    "is_last_page": page_id == len(ocr_results) - 1,
                }

                all_ids.append(item_id)
                all_metadatas.append(metadata)
                all_documents.append(content)

            prev_page_total_lines = max_lines
            added_pages += 1

        # Add to collection
        if all_ids:
            # Debug: Print the first few documents to check content
            logger.info(f"Adding {len(all_documents)} documents to collection")
            if all_documents:
                logger.info(f"Sample documents: {all_documents[:3]}")

            # Check for any empty strings
            empty_docs = [i for i, doc in enumerate(all_documents) if not doc.strip()]
            if empty_docs:
                logger.warning(
                    f"Warning: Found {len(empty_docs)} empty documents at indices: {empty_docs[:5]}..."
                )

            # Filter out empty documents
            valid_indices = [i for i, doc in enumerate(all_documents) if doc.strip()]
            if len(valid_indices) < len(all_documents):
                logger.warning(
                    f"Filtering out {len(all_documents) - len(valid_indices)} empty documents"
                )
                all_ids = [all_ids[i] for i in valid_indices]
                all_metadatas = [all_metadatas[i] for i in valid_indices]
                all_documents = [all_documents[i] for i in valid_indices]

            # Process in smaller batches if there are many documents
            MAX_BATCH_SIZE = 2000  # Slightly less than the 2048 limit to be safe

            if len(all_documents) > MAX_BATCH_SIZE:
                logger.info(
                    f"Processing {len(all_documents)} documents in batches of {MAX_BATCH_SIZE}"
                )

                for i in range(0, len(all_documents), MAX_BATCH_SIZE):
                    end_idx = min(i + MAX_BATCH_SIZE, len(all_documents))
                    batch_ids = all_ids[i:end_idx]
                    batch_metadatas = all_metadatas[i:end_idx]
                    batch_documents = all_documents[i:end_idx]

                    logger.info(
                        f"Adding batch {i // MAX_BATCH_SIZE + 1}/{(len(all_documents) + MAX_BATCH_SIZE - 1) // MAX_BATCH_SIZE} with {len(batch_documents)} documents"
                    )

                    try:
                        self.collection.add(
                            ids=batch_ids,
                            documents=batch_documents,
                            metadatas=batch_metadatas,
                        )
                        logger.info(
                            f"Successfully added batch {i // MAX_BATCH_SIZE + 1}"
                        )
                    except Exception as e:
                        logger.error(
                            f"Error adding batch {i // MAX_BATCH_SIZE + 1}: {str(e)}"
                        )
                        # Try to add one by one as a last resort
                        logger.info("Trying to add documents one by one...")
                        for j in range(len(batch_documents)):
                            try:
                                self.collection.add(
                                    ids=[batch_ids[j]],
                                    documents=[batch_documents[j]],
                                    metadatas=[batch_metadatas[j]],
                                )
                            except Exception as e2:
                                logger.error(
                                    f"Failed to add document {i + j}: {str(e2)}"
                                )
            else:
                # Add all documents at once
                try:
                    self.collection.add(
                        ids=all_ids,
                        documents=all_documents,
                        metadatas=all_metadatas,
                    )
                    logger.info(f"Successfully added {len(all_documents)} documents")
                except Exception as e:
                    logger.error(f"Error adding documents: {str(e)}")
                    # Try to add in smaller batches
                    logger.info("Trying to add documents in smaller batches...")
                    batch_size = len(all_documents) // 2
                    if batch_size > 0:
                        for i in range(0, len(all_documents), batch_size):
                            end_idx = min(i + batch_size, len(all_documents))
                            try:
                                self.collection.add(
                                    ids=all_ids[i:end_idx],
                                    documents=all_documents[i:end_idx],
                                    metadatas=all_metadatas[i:end_idx],
                                )
                                logger.info(
                                    f"Successfully added batch {i // batch_size + 1}"
                                )
                            except Exception as e2:
                                logger.error(
                                    f"Error adding batch {i // batch_size + 1}: {str(e2)}"
                                )

        return {
            "session_id": self.session_id,
            "added_pages": added_pages,
            "added_lines": added_lines,
            "total_pages": last_page + added_pages,
        }

    def get_last_page_number(self) -> int:
        """
        Get the last page number in the collection

        Returns:
            Last page number or 0 if collection is empty
        """
        # Query for items with is_last_page=True
        results = self.collection.get(where={"is_last_page": True}, include=[])

        if not results["ids"]:
            return 0  # Start from page 0 if collection is empty

        # Extract page numbers from IDs and find the maximum
        page_numbers = [int(id.split("-")[0]) for id in results["ids"]]
        return max(page_numbers) + 1 if page_numbers else 0

    def get_surrounding_lines(self, metadata: dict, neighbours: int = 50):
        """
        Get surrounding lines for a given line

        Args:
            metadata: Line metadata
            neighbours: Number of surrounding lines to retrieve

        Returns:
            List of surrounding lines
        """
        page_number = metadata["page_number"]
        line_id = metadata["line_id"]
        max_lines = metadata["max_lines"]
        prev_page_total_lines = metadata["prev_page_total_lines"]
        is_last_page = metadata["is_last_page"]
        ids = []

        # Check if we need to get lines from the previous page
        if line_id + 1 - neighbours < 0:
            if prev_page_total_lines != -1:
                prev_page_start_ix = (
                    prev_page_total_lines - 1 - (neighbours - line_id + 1)
                )
                prev_page_end_ix = prev_page_total_lines
                ids.extend(
                    [
                        f"{page_number - 1}-{i}"
                        for i in range(prev_page_start_ix, prev_page_end_ix)
                    ]
                )

        # Get lines from the current page
        start_ix = max(0, line_id - neighbours)
        end_ix = min(max_lines, line_id + neighbours)
        ids.extend([f"{page_number}-{i}" for i in range(start_ix, end_ix + 1)])

        # Check if we need to get lines from the next page
        if line_id + 1 + neighbours > max_lines:
            next_page_start_ix = 0
            next_page_end_ix = neighbours - (max_lines - line_id)
            if not is_last_page:
                ids.extend(
                    [
                        f"{page_number + 1}-{i}"
                        for i in range(next_page_start_ix, next_page_end_ix)
                    ]
                )

        # Get the lines from the collection
        results = self.collection.get(ids=ids)

        # Format the lines
        all_lines = []
        for doc_id, content in zip(results["ids"], results["documents"]):
            all_lines.append(f"{doc_id}|| {content}")

        return all_lines

    def get_answer_with_retry(self, question: str) -> str:
        """
        Get answer for a question with retry logic for rate limiting

        Args:
            question: Question to answer

        Returns:
            Answer string
        """
        retries = 0
        while retries < self.max_retries:
            try:
                return self.get_answer(question)
            except Exception as e:
                logger.error(f"Error getting answers {str(e)}")
                if "rate limit" in str(e).lower():
                    logger.warning(f"Rate limit error: {str(e)}")
                    # Exponential backoff with jitter
                    delay = self.base_delay * (2**retries) + random.uniform(0, 1)
                    time.sleep(delay)
                    retries += 1
                else:
                    # Re-raise if it's not a rate limit error
                    raise

        # If we've exhausted all retries
        raise Exception(
            f"Failed to get answer after {self.max_retries} retries due to rate limits"
        )

    def get_answer(self, question: str) -> str:
        """
        Get answer for a question

        Args:
            question: Question to answer

        Returns:
            Answer string
        """
        start_time = time.time()
        # Query for relevant lines
        results = self.collection.query(
            query_texts=[question],
            n_results=10,
        )
        logger.info(f"Time taken to query: {time.time() - start_time}")
        # Get surrounding lines for context
        all_lines = []
        for metadata in results["metadatas"][0]:
            surrounding_lines = self.get_surrounding_lines(metadata)
            all_lines.extend(surrounding_lines)
        logger.info(f"Time taken to get surrounding lines: {time.time() - start_time}")
        # Remove duplicates and sort page and line id
        all_lines = list(set(all_lines))
        sorted_lines = sorted(
            all_lines, key=lambda x: tuple(map(int, x.split("|| ")[0].split("-")))
        )
        logger.info(f"Time taken to sort lines: {time.time() - start_time}")
        # Create prompt
        context_lines = "\n".join(sorted_lines)
        prompt = self.prompt_template.format(
            DOCUMENT_LINES=context_lines, QUESTION=question
        )
        logger.info(f"Prompt:\n{prompt}")
        # Get answer from LLM
        logger.info(f"Time taken to create prompt: {time.time() - start_time}")
        response = inference(prompt)
        logger.info(f"Time taken to get response: {time.time() - start_time}")
        # logger.info(f"Response from LLM:\n{response}")
        return response

    def parse_answer(self, answer: str):
        """
        Parse answer from LLM response

        Args:
            answer: LLM response

        Returns:
            A List of dictionaries with answer_text, search_phrases, evidences
        """
        soup = BeautifulSoup(answer, "html.parser")
        answers = soup.find_all("answer")
        final_answers = []
        for answer in answers:
            answer_text = answer.find("text").text
            evidences = answer.find_all("evidence")
            search_phrases = answer.find("search_phrases")
            if search_phrases is not None:
                search_phrases = search_phrases.find_all("phrase")
                search_phrases = [tag.get_text().strip() for tag in search_phrases]
            else:
                search_phrases = []
            processed_evidences = []
            for tag in evidences:
                tag_text = tag.get_text().strip()
                if "|| " in tag_text:
                    splits = tag_text.split("|| ")
                    doc_id = splits[0]
                    content = splits[1]
                    processed_evidences.append((doc_id, content))
            # logger.debug(f"Evidences: {processed_evidences}")
            # logger.debug(f"Search phrases: {search_phrases}")
            final_answers.append(
                {
                    "answer": answer_text,
                    "search_phrases": search_phrases,
                    "evidences": [
                        {"doc_id": ev[0], "content": ev[1]}
                        for ev in processed_evidences
                    ],
                }
            )

        # logger.info(f"Parsed answers: {final_answers}")
        return final_answers

    def get_box_from_metadata(self, metadata: dict):
        """
        Get bounding box from metadata
        """
        bbox = [
            metadata["xtl"],
            metadata["ytl"],
            metadata["xtr"],
            metadata["ytr"],
            metadata["xbr"],
            metadata["ybr"],
            metadata["xbl"],
            metadata["ybl"],
        ]
        return bbox

    def get_bbox(self, evidence: list[dict] = []):
        """
        Get bounding boxes for evidence lines

        Args:
            evidence: List of evidence dictionaries

        Returns:
            List of dictionaries with doc_id, page_number, line_id, and bbox (flattened list of 8 coordinates)
        """
        if not evidence:
            return []
        # Get metadata for evidence
        results = self.collection.get(
            ids=[ev["doc_id"] for ev in evidence], include=["metadatas"]
        )

        # Format bounding boxes
        bbox_info = []
        for i, metadata in enumerate(results["metadatas"]):
            bbox = self.get_box_from_metadata(metadata)
            bbox_info.append(
                {
                    "doc_id": results["ids"][i],
                    "page_number": metadata["page_number"],
                    "line_id": metadata["line_id"],
                    "bbox": bbox,
                }
            )
        return bbox_info

    def get_all_boxes(self, answers: list[dict]):
        """
        Get all bounding boxes for a list of answers
        """
        for answer in answers:
            evidences = answer["evidences"]
            search_phrases = answer["search_phrases"]
            additional_bboxes = []
            if search_phrases:
                for search_phrase in search_phrases:
                    search_results = self.search_text(search_phrase)
                    additional_bboxes.extend(search_results)
            bboxes = self.get_bbox(evidences)
            evidences = [
                {
                    "doc_id": ev["doc_id"],
                    "text": ev["content"],
                    "page": bbox["page_number"],
                    "line": bbox["line_id"],
                    "bbox": bbox["bbox"],
                }
                for ev, bbox in zip(evidences, bboxes)
            ]
            if additional_bboxes:
                evidences.extend(additional_bboxes)
            # Deduplicate evidences based on doc_id
            evidences = list({ev["doc_id"]: ev for ev in evidences}.values())

            answer["evidences"] = evidences

        logger.info(f"Final answers: {answers}")
        return answers

    def get_image_urls(self):
        """
        Get presigned URLs for all images in the session

        Returns:
            Dictionary mapping page numbers to presigned URLs
        """
        return get_presigned_urls_for_images(self.session_id)

    def get_image_keys(self):
        """
        Get S3 object keys for all images in the session

        Returns:
            Dictionary mapping page numbers to S3 object keys
        """
        import boto3
        from botocore.config import Config

        s3_client = boto3.client(
            "s3",
            config=Config(
                signature_version="s3v4",
                region_name=os.getenv("AWS_REGION", "us-east-2"),
            ),
        )

        bucket = os.getenv("AWS_BUCKET_NAME")
        prefix = f"documents/{self.session_id}/images/"

        try:
            # List all objects with the given prefix
            logger.info(f"Listing objects with prefix {prefix}")
            response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix)

            # If there are no objects, return an empty dict
            if "Contents" not in response:
                logger.warning(f"No objects found with prefix {prefix}")
                return {}

            # Process each object
            image_keys = {}

            for obj in response["Contents"]:
                key = obj["Key"]
                # Extract page number from key (assumes format like 'documents/session_id/images/page_X.jpg')
                filename = key.split("/")[-1]
                if filename.startswith("page_") and "." in filename:
                    page_match = filename.split("_")[1].split(".")[0]
                    if page_match.isdigit():
                        page_num = int(page_match)
                        image_keys[page_num] = key

            logger.info(f"Found {len(image_keys)} image keys")
            return image_keys

        except Exception as e:
            logger.error(f"Error getting image keys: {str(e)}")
            return {}

    def get_answers(self, questions: List[str], max_workers: int = 5) -> Dict:
        """
        Get answers for multiple questions in parallel

        Args:
            questions: List of questions
            max_workers: Maximum number of workers for parallel processing

        Returns:
            Dictionary mapping questions to answers and evidence
        """
        results = []

        # Process questions in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks and create a mapping
            future_to_question = {
                executor.submit(self.get_answer_with_retry, question): question
                for question in questions
            }

            # Process as they complete
            for future in as_completed(future_to_question):
                question = future_to_question[future]
                try:
                    # Get the LLM response
                    response = future.result()

                    # Parse the answer and evidence
                    answers = self.parse_answer(response)

                    # Get bounding boxes for evidence
                    answers = self.get_all_boxes(answers)

                    # Store results
                    results.append({question.replace(".", "_"): answers})
                except Exception as e:
                    # Log the error and store as failed
                    logger.error(f"Error processing question '{question}': {str(e)}")
                    results.append(
                        {
                            question.replace(".", "_"): [
                                {"answer": "Not Available", "evidences": []}
                            ]
                        }
                    )
        return results

    def search_text(self, search_string: str, exact_match: bool = True):
        """
        Search for text in the document using Chroma's query functionality

        Args:
            search_string: Text to search for
            n_results: Maximum number of results to return

        Returns:
            List of search results with document content, page number, line number, and bounding box
        """
        try:
            # Query the collection for documents containing the search string
            if exact_match:
                results = self.collection.get(
                    where_document={
                        "$or": [
                            {"$contains": search_string},
                            {"$contains": search_string.lower()},
                        ]
                    },
                )
                documents = results["documents"]
                ids = results["ids"]
                metadatas = results["metadatas"]
            else:
                results = self.collection.query(
                    query_texts=[search_string],
                )
                documents = results["documents"][0]
                ids = results["ids"][0]
                metadatas = results["metadatas"][0]

            # Format the results
            search_results = []
            for i in range(len(ids)):
                doc_id = ids[i]
                document = documents[i]
                metadata = metadatas[i]

                # Create a flattened list of 8 coordinates
                bbox = [
                    metadata["xtl"],
                    metadata["ytl"],
                    metadata["xtr"],
                    metadata["ytr"],
                    metadata["xbr"],
                    metadata["ybr"],
                    metadata["xbl"],
                    metadata["ybl"],
                ]

                search_results.append(
                    {
                        "text": document,
                        "doc_id": doc_id,
                        "page": metadata["page_number"],
                        "line": metadata["line_id"],
                        "bbox": bbox,
                    }
                )

            return search_results
        except Exception as e:
            logger.error(f"Error searching text: {e}")
            return []

    def get_text_from_bbox(self, page_number: int, bbox: list[float]):
        """
        Get text from a bounding box
        """
        filtered_results = self.collection.get(
            where={"page_number": page_number},
            include=["documents", "metadatas"],
        )

        page_data = {
            line["line_id"]: {
                "content": content,
                "polygon": [
                    (line["xtl"], line["ytl"]),
                    (line["xtr"], line["ytr"]),
                    (line["xbr"], line["ybr"]),
                    (line["xbl"], line["ybl"]),
                ],
            }
            for line, content in zip(
                filtered_results["metadatas"], filtered_results["documents"]
            )
        }

        return extract_text_from_bbox(page_data, bbox)

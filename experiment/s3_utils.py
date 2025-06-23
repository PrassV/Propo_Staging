import os
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor

import boto3
from botocore.config import Config
from loguru import logger

# S3 bucket configuration
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")


def create_presigned_url(
    bucket_name=None,
    object_name=None,
    s3_link=None,
    expiration=3600,
    operation="get_object",
):
    """
    Generate a presigned URL for an S3 object

    Args:
        bucket_name: S3 bucket name
        object_name: S3 object name/key
        s3_link: S3 link (alternative to bucket_name and object_name)
        expiration: Expiration time in seconds
        operation: S3 operation (e.g., 'get_object')

    Returns:
        Presigned URL as string
    """
    if s3_link:
        if s3_link.startswith("s3://"):
            parts = s3_link[5:].split("/", 1)
            bucket_name = parts[0]
            object_name = parts[1] if len(parts) > 1 else ""
        elif "s3.amazonaws.com" in s3_link:
            parts = s3_link.split("s3.amazonaws.com/")
            bucket_name = parts[0].split("//")[1].split(".")[0]
            object_name = parts[1] if len(parts) > 1 else ""

    if not bucket_name or not object_name:
        raise ValueError(
            "Either provide (bucket_name AND object_name) OR a valid s3_link"
        )

    s3_client = boto3.client(
        "s3",
        config=Config(signature_version="s3v4"),
        region_name="us-east-2",
    )

    try:
        url = s3_client.generate_presigned_url(
            ClientMethod=operation,
            Params={"Bucket": bucket_name, "Key": object_name},
            ExpiresIn=expiration,
        )
        return url
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return None


def generate_presigned_url(s3_client, bucket, key, expiry=3600):
    """Generate a presigned URL for an S3 object"""
    try:
        return s3_client.generate_presigned_url(
            "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expiry
        )
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return None


def upload_file_to_s3(
    local_file_path: str,
    s3_key: str,
    s3_bucket: str = AWS_BUCKET_NAME,
    remove_local_file: bool = True,
):
    """Upload a file to S3"""
    s3_client = boto3.client("s3")
    try:
        s3_client.upload_file(local_file_path, s3_bucket, s3_key)
        # Remove the file from local storage
        if remove_local_file:
            os.remove(local_file_path)
        return True
    except Exception as e:
        print(f"Error uploading file to S3: {e}")
        return False


def upload_directory_to_s3(
    output_dir: str,
    s3_key_prefix: str,
    s3_bucket: str = AWS_BUCKET_NAME,
):
    """Upload all files in a directory to S3 in parallel"""
    try:
        subprocess.run(
            ["aws", "s3", "sync", output_dir, f"s3://{s3_bucket}/{s3_key_prefix}"],
            check=True,
        )
    except Exception as e:
        logger.error(f"Error uploading directory to S3: {e}")
        raise e

    # Delete the directory from local storage
    shutil.rmtree(output_dir)

    return True


def get_presigned_urls_for_images(
    session_id: str, bucket: str = AWS_BUCKET_NAME, max_workers: int = 10
):
    """
    Get presigned URLs for all images in a session

    Args:
        session_id: Session ID
        bucket: S3 bucket name
        max_workers: Maximum number of workers for parallel processing

    Returns:
        Dictionary mapping page numbers to presigned URLs
    """
    s3_client = boto3.client(
        "s3",
        config=Config(
            signature_version="s3v4",
            region_name=os.getenv("AWS_REGION", "us-east-2"),
        ),
    )
    prefix = f"documents/{session_id}/images/"

    try:
        # List all objects with the given prefix
        print(f"Listing objects with prefix {prefix}")
        response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix)

        # If there are no objects, return an empty dict
        if "Contents" not in response:
            return {}

        # Process each object in parallel
        images = {}

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Create a list to store the futures
            futures = {}

            for obj in response["Contents"]:
                key = obj["Key"]
                # Extract page number from key (assumes format like 'documents/session_id/images/page_X.jpg')
                filename = key.split("/")[-1]
                page_match = filename.split("_")[1].split(".")[0]
                if page_match:
                    page_num = int(page_match)
                    # Submit the URL generation task to the executor
                    futures[page_num] = executor.submit(
                        generate_presigned_url, s3_client, bucket, key
                    )

            # Collect results
            for page_num, future in futures.items():
                images[page_num] = future.result()

        return images

    except Exception as e:
        print(f"Error getting presigned URLs: {e}")
        return {}


def create_presigned_post(
    bucket_name, object_name, fields=None, conditions=None, expiration=3600
):
    """
    Generate a presigned POST URL for uploading a file directly to S3

    Args:
        bucket_name: S3 bucket name
        object_name: S3 object name/key
        fields: Dictionary of prefilled form fields
        conditions: List of conditions to include in the policy
        expiration: Expiration time in seconds

    Returns:
        Dictionary with the presigned POST URL and required fields
    """
    s3_client = boto3.client(
        "s3",
        config=Config(signature_version="s3v4"),
        region_name=os.getenv("AWS_REGION", "us-east-2"),
    )

    try:
        response = s3_client.generate_presigned_post(
            Bucket=bucket_name,
            Key=object_name,
            Fields=fields,
            Conditions=conditions,
            ExpiresIn=expiration,
        )
        return response
    except Exception as e:
        print(f"Error generating presigned POST URL: {e}")
        return None


def download_file_from_s3(
    object_key: str,
    save_to: str,
    bucket_name: str = AWS_BUCKET_NAME,
):
    """Download a file from S3 to a local path"""
    s3_client = boto3.client("s3")
    try:
        s3_client.download_file(bucket_name, object_key, save_to)
        return True
    except Exception as e:
        print(f"Error downloading file from S3: {e}")
        return False

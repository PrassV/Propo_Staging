import React, { useState, useEffect } from 'react';
import { getDocuments } from '../../../api/services/documentService'; // To fetch existing docs
import { Document } from '../../../types/document'; // Use our standard type
import DocumentUploadForm from '../../documents/DocumentUploadForm'; // Import the form
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For displaying messages
import { Loader2, FileText, Trash2 } from 'lucide-react'; // Icons
import { Button } from '@/components/ui/button'; // For delete button

// Updated Props: Now requires propertyId
interface DocumentUploadSectionProps {
  propertyId: string; // Assuming this section is only shown for existing properties
  // Add other props if needed, e.g., disabled
}

export default function DocumentUploadSection({ propertyId }: DocumentUploadSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch documents for the property
  const fetchPropertyDocuments = async () => {
    if (!propertyId) return; // Don't fetch if no ID
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDocuments({ property_id: propertyId });
      setDocuments(response.documents || []);
    } catch (err) {
      console.error("Error fetching property documents:", err);
      setError('Failed to load existing documents. Please try again.');
      setDocuments([]); // Clear documents on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch documents when the component mounts or propertyId changes
  useEffect(() => {
    fetchPropertyDocuments();
  }, [propertyId]);

  // Callback for when the inner form successfully uploads a document
  const handleUploadSuccess = (newDocument: Document) => {
    // Add the new document to the list without needing a full refetch
    setDocuments((prevDocs) => [...prevDocs, newDocument]); 
    // Optionally, show a success message or perform other actions
  };
  
  // TODO: Implement document deletion handler
  const handleDeleteDocument = async (documentId: string) => {
      console.warn(`Deletion requested for document ${documentId} - Not implemented yet.`);
      // 1. Call deleteDocument service
      // 2. If successful, remove from local state: setDocuments(docs => docs.filter(d => d.id !== documentId))
      // 3. Show toast notification
  };

  return (
    <div className="space-y-6 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <h3 className="text-lg font-semibold">Property Documents</h3>
      <p className="text-sm text-muted-foreground">
        Upload and manage documents related to this property (e.g., title deed, tax receipts, agreements).
      </p>

      {/* Section to display existing documents */}
      <div className="space-y-3">
          <h4 className="font-medium text-base">Uploaded Documents</h4>
          {isLoading && (
              <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading documents...</div>
          )}
          {error && (
              <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}
          {!isLoading && !error && documents.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No documents uploaded for this property yet.</p>
          )}
          {!isLoading && !error && documents.length > 0 && (
              <ul className="space-y-2 list-none p-0">
                  {documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between p-2 border rounded-md bg-background text-sm">
                          <div className="flex items-center space-x-2 overflow-hidden">
                            <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                            <a 
                                href={doc.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title={doc.description || doc.document_name}
                                className="truncate hover:underline text-foreground"
                            >
                                {doc.document_name}
                            </a>
                            <span className="text-xs text-muted-foreground flex-shrink-0">({doc.document_type?.replace(/_/g, ' ') || 'Other'})</span>
                          </div>
                          {/* TODO: Add delete functionality */}
                           <Button 
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80 h-7 px-2"
                                onClick={() => handleDeleteDocument(doc.id)}
                                title="Delete Document"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                      </li>
                  ))}
              </ul>
          )}
      </div>

      <hr className="my-6" />

      {/* Render the actual upload form */}
      <div>
          <h4 className="font-medium text-base mb-3">Upload New Document</h4>
           {/* Pass propertyId and the success handler */}
          <DocumentUploadForm 
              propertyId={propertyId} 
              onUploadSuccess={handleUploadSuccess} 
          />
      </div>
    </div>
  );
}
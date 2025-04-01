import React, { useState, useEffect } from 'react';
import { getDocuments, deleteDocument } from '../../../api/services/documentService'; // To fetch existing docs
import { Document } from '../../../types/document'; // Use our standard type
import DocumentUploadForm from '../../documents/DocumentUploadForm'; // Import the shared form
import { Loader2, FileText, Trash2, UploadCloud } from 'lucide-react'; // Icons
import { Button } from '@/components/ui/button'; // For delete button
import toast from 'react-hot-toast'; // Add toast
// Import Dialog components
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
} from "@/components/ui/dialog";

// Props: Requires tenantId
interface TenantDocumentSectionProps {
  tenantId: string; // This section is only shown for existing tenants
  // Add other props if needed
}

export default function TenantDocumentSection({ tenantId }: TenantDocumentSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null); // Add state for tracking deletion
  // Add state for dialog
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Function to fetch documents for the tenant
  const fetchTenantDocuments = async () => {
    if (!tenantId) return; 
    setIsLoading(true);
    setError(null);
    try {
      // Filter documents by tenant_id
      const response = await getDocuments({ tenant_id: tenantId });
      setDocuments(response.documents || []);
    } catch (err) {
      console.error("Error fetching tenant documents:", err);
      setError('Failed to load existing documents. Please try again.');
      setDocuments([]); 
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch documents when the component mounts or tenantId changes
  useEffect(() => {
    if (tenantId) { // Check tenantId before fetching
        fetchTenantDocuments();
    } else {
        setDocuments([]); // Clear if no tenantId
    }
  }, [tenantId]);

  // Update upload success handler
  const handleUploadSuccess = (newDocument: Document) => {
    setDocuments((prevDocs) => [...prevDocs, newDocument]); 
    setIsUploadDialogOpen(false); // Close dialog
    toast.success("Document uploaded successfully!");
  };
  
  // Implement the delete handler
  const handleDeleteDocument = async (documentId: string) => {
      if (!window.confirm("Are you sure you want to delete this document?")) {
          return;
      }
      setDeletingId(documentId);
      const toastId = toast.loading('Deleting document...');
      try {
          await deleteDocument(documentId);
          setDocuments(docs => docs.filter(d => d.id !== documentId));
          toast.success('Document deleted successfully', { id: toastId });
      } catch (err: unknown) {
          console.error("Error deleting document:", err);
          let message = 'Failed to delete document.';
          if (err instanceof Error) message = err.message;
          toast.error(message, { id: toastId });
      } finally {
          setDeletingId(null);
      }
  };

  return (
    <div className="space-y-6 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
       <div className="flex justify-between items-center">
         <div>
             <h3 className="text-lg font-semibold">Tenant Documents</h3>
             <p className="text-sm text-muted-foreground">
                Manage documents related to this tenant.
             </p>
         </div>
         {/* Dialog Trigger Button */} 
         <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
             <DialogTrigger asChild>
                 <Button size="sm">
                     <UploadCloud className="mr-2 h-4 w-4" />
                     Upload New
                 </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[600px]">
                 <DialogHeader>
                     <DialogTitle>Upload New Document</DialogTitle>
                 </DialogHeader>
                 {/* Form inside Dialog */}
                 <DocumentUploadForm 
                     tenantId={tenantId} 
                     onUploadSuccess={handleUploadSuccess} 
                     onCancel={() => setIsUploadDialogOpen(false)}
                 />
             </DialogContent>
         </Dialog>
       </div>

      {/* Section to display existing documents */}
      <div className="space-y-3">
          <h4 className="font-medium text-base">Uploaded Documents</h4>
          {isLoading && (
              <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading documents...</div>
          )}
          {error && (
              <div className="text-red-500">{error}</div>
          )}
          {!isLoading && !error && documents.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No documents uploaded for this tenant yet.</p>
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
                             {/* Display type if available */}
                            {doc.document_type && (
                                <span className="text-xs text-muted-foreground flex-shrink-0">({doc.document_type.replace(/_/g, ' ')})</span>
                            )}
                          </div>
                          {/* Update delete button */}
                           <Button 
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80 h-7 px-2 disabled:opacity-50"
                                onClick={() => handleDeleteDocument(doc.id)}
                                title="Delete Document"
                                disabled={deletingId === doc.id} 
                            >
                                {deletingId === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" /> 
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                      </li>
                  ))}
              </ul>
          )}
      </div>

      <hr className="my-6" />
    </div>
  );
} 
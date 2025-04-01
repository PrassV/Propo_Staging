import React, { useState, useEffect } from 'react';
import { getDocuments, deleteDocument } from '../../../api/services/documentService';
import { Document } from '../../../types/document';
import DocumentUploadForm from '../../documents/DocumentUploadForm';
import { Loader2, FileText, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
} from "@/components/ui/dialog";

interface DocumentUploadSectionProps {
  propertyId: string;
}

export default function DocumentUploadSection({ propertyId }: DocumentUploadSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const fetchPropertyDocuments = async () => {
    if (!propertyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDocuments({ property_id: propertyId });
      setDocuments(response.documents || []);
    } catch (err) {
      console.error("Error fetching property documents:", err);
      setError('Failed to load existing documents. Please try again.');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDocuments();
    } else {
        setDocuments([]);
    }
  }, [propertyId]);

  const handleUploadSuccess = (newDocument: Document) => {
    setDocuments((prevDocs) => [...prevDocs, newDocument]);
    setIsUploadDialogOpen(false);
    toast.success("Document uploaded successfully!");
  };

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
            <h3 className="text-lg font-semibold">Property Documents</h3>
            <p className="text-sm text-muted-foreground">
                Manage documents related to this property.
            </p>
        </div>
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
                <DocumentUploadForm 
                    propertyId={propertyId} 
                    onUploadSuccess={handleUploadSuccess} 
                    onCancel={() => setIsUploadDialogOpen(false)}
                />
            </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-3">
          <h4 className="font-medium text-base">Uploaded Documents</h4>
          {!isLoading && !error && documents.length === 0 && (
               <p className="text-sm text-muted-foreground italic">No documents uploaded yet.</p>
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
    </div>
  );
}

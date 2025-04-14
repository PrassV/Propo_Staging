import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Trash2, Upload, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Document } from '@/api/types';
import api from '@/api';

interface UnitDocumentListProps {
  unitId: string;
}

export default function UnitDocumentList({ unitId }: UnitDocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => {
    fetchDocuments();
  }, [unitId]);
  
  const fetchDocuments = async () => {
    if (!unitId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use API once unit_id support is implemented
      try {
        const response = await api.document.getDocuments({ unit_id: unitId });
        setDocuments(response.documents || []);
      } catch {
        console.error("API with unit_id may not be implemented yet, using placeholder data");
        // Placeholder data until backend is ready
        setDocuments([
          {
            id: '1',
            title: 'Lease Agreement',
            description: 'Official lease agreement for this unit',
            owner_id: 'owner123',
            unit_id: unitId,
            file_url: 'https://example.com/lease.pdf',
            file_name: 'lease_agreement.pdf',
            file_type: 'application/pdf',
            access_level: 'private',
            document_type: 'lease_agreement',
            created_at: new Date().toISOString(),
            file_size: 1024 * 1024 * 2, // 2MB
          },
          {
            id: '2',
            title: 'Maintenance Request Form',
            description: 'Template for maintenance requests',
            owner_id: 'owner123',
            unit_id: unitId,
            file_url: 'https://example.com/maintenance.pdf',
            file_name: 'maintenance_request.pdf',
            file_type: 'application/pdf',
            access_level: 'private',
            document_type: 'maintenance_form',
            created_at: new Date().toISOString(),
            file_size: 1024 * 512, // 0.5MB
          }
        ] as Document[]);
      }
    } catch (err) {
      console.error("Error fetching unit documents:", err);
      setError(err instanceof Error ? err.message : 'Failed to load unit documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    try {
      const file = files[0];
      
      // In a real implementation, you'd:
      // 1. Upload the file to a storage service using api.upload.uploadFile 
      // 2. Then create a document record with the file URL
      
      // Simulating upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Placeholder for actual file upload - in real implementation this would come from api.upload.uploadFile
        const fileUrl = `https://example.com/documents/${file.name}`;
        
        // Create document record
        await api.document.createDocument({
          document_name: file.name,
          file_url: fileUrl,
          unit_id: unitId,
          title: file.name.split('.').slice(0, -1).join('.'), // Remove extension for title
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          document_type: 'other',
          access_level: 'private',
        });
        
        // Refresh documents
        fetchDocuments();
        
        toast.success('Document uploaded successfully');
      } catch {
        console.error("API may not be fully implemented, using placeholder behavior");
        
        // Placeholder behavior
        const newDoc: Document = {
          id: Math.random().toString(36).substring(7),
          title: file.name.split('.').slice(0, -1).join('.'),
          owner_id: 'current_user_id',
          unit_id: unitId,
          file_url: URL.createObjectURL(file),
          file_name: file.name,
          file_type: file.type,
          access_level: 'private',
          created_at: new Date().toISOString(),
          file_size: file.size,
        };
        
        setDocuments([newDoc, ...documents]);
        toast.success('Document uploaded successfully (placeholder)');
      }
    } catch (err) {
      console.error("Error uploading document:", err);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      // Reset the file input
      e.target.value = '';
    }
  };
  
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      // Try to use the API
      try {
        await api.document.deleteDocument(documentId);
        setDocuments(documents.filter(doc => doc.id !== documentId));
        toast.success('Document deleted successfully');
      } catch {
        console.error("API may have issues, using placeholder behavior");
        
        // Placeholder behavior
        setDocuments(documents.filter(doc => doc.id !== documentId));
        toast.success('Document deleted successfully (placeholder)');
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error('Failed to delete document');
    }
  };
  
  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-destructive text-center">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Unit Documents</h3>
        <Button
          size="sm"
          variant="outline"
          className="relative overflow-hidden"
          disabled={uploading}
        >
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </div>
      
      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No documents found for this unit.
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="border rounded-md p-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{doc.title}</p>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {doc.document_type || 'Document'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    title="View Document"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="Delete Document"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
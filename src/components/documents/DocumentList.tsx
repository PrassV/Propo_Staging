import React from 'react';
import { Document as ApiDocument } from '@/api/types';
import { FileText, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DocumentListProps {
  documents: ApiDocument[];
  isLoading?: boolean;
  error?: string | null;
}

export default function DocumentList({ documents, isLoading, error }: DocumentListProps) {
  return (
    <div className="space-y-4">
       {isLoading && <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Documents...</div>}
       {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
       
       {!isLoading && !error && documents.length === 0 && (
           <p className="text-sm text-muted-foreground italic">No documents found.</p>
       )}
       
       {!isLoading && !error && documents.length > 0 && (
         <ul className="space-y-2 list-none p-0">
           {documents.map((doc) => (
             <li key={doc.id} className="flex items-center justify-between p-2 border rounded-md bg-background text-sm">
               <div className="flex items-center space-x-2 overflow-hidden">
                 <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                 <a 
                    href={doc.file_url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    title={doc.description || doc.title} 
                    className="truncate hover:underline text-foreground"
                 >
                   {doc.title || doc.file_name}
                 </a>
                 {doc.document_type && <span className="text-xs text-muted-foreground flex-shrink-0">({doc.document_type.replace(/_/g, ' ')})</span>}
               </div>
             </li>
           ))}
         </ul>
       )}
    </div>
  );
} 
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createDocument } from '../../api/services/documentService';
import { DocumentCreate, DocumentType } from '../../types/document';
import { Document } from '../../api/types';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import apiClient from '../../api/client';

interface DocumentUploadFormProps {
  propertyId?: string; // Optional pre-filled ID
  tenantId?: string;   // Optional pre-filled ID
  onUploadSuccess?: (document: Document) => void; // Use Document type
  onCancel?: () => void;
}

// Define possible document types based on the type definition
const documentTypeOptions: DocumentType[] = [
  'lease_agreement', 'id_proof', 'payment_receipt', 'maintenance_invoice', 'maintenance_photo', 'property_photo', 'other'
];

// Define Zod schema for form validation
const formSchema = z.object({
  documentName: z.string().min(1, { message: "Document name is required." }),
  documentType: z.enum(['lease_agreement', 'id_proof', 'payment_receipt', 'maintenance_invoice', 'maintenance_photo', 'property_photo', 'other']).optional(), 
  description: z.string().optional(),
  // File itself is handled outside Zod schema but checked in handleSubmit
});

type DocumentFormData = z.infer<typeof formSchema>;

export default function DocumentUploadForm({ 
    propertyId,
    tenantId,
    onUploadSuccess,
    onCancel 
}: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize react-hook-form
  const form = useForm<DocumentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentName: '',
      documentType: undefined,
      description: '',
    },
  });

  // Callback for successful file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      
      // Auto-populate document name based on file name (remove extension)
      const nameWithoutExtension = selectedFile.name.split('.').slice(0, -1).join('.');
      form.setValue('documentName', nameWithoutExtension);
      
      // Clear any previous file errors
      form.clearErrors('root.serverError');
    }
  }, [form]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 25 * 1024 * 1024 // 25MB
  });

  // Function to remove the selected file
  const handleRemoveFile = () => {
    setFile(null);
    form.clearErrors('root.serverError');
  };

  // Form submission handler
  const onSubmit: SubmitHandler<DocumentFormData> = async (data) => {
    if (!file) {
      form.setError("root.serverError", { type: "custom", message: "File is required." });
      toast.error('Please select a file to upload.');
      return;
    }
    form.clearErrors("root.serverError");

    setIsLoading(true);
    const toastId = toast.loading('Uploading file and creating document...');

    try {
      // Use backend API upload endpoint instead of direct Supabase upload
      const formData = new FormData();
      formData.append('files', file);
      formData.append('context', 'tenant_documents');
      if (propertyId) formData.append('property_id', propertyId);
      if (tenantId) formData.append('tenant_id', tenantId);

      const uploadResponse = await apiClient.post('/uploads/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!uploadResponse.data?.success || !uploadResponse.data?.uploaded_paths?.length) {
        throw new Error(uploadResponse.data?.message || 'File upload failed.');
      }

      const uploadedPath = uploadResponse.data.uploaded_paths[0];
      const publicUrl = uploadResponse.data.image_urls?.[0] || '';

      const documentData: DocumentCreate = {
        document_name: data.documentName.trim(),
        document_type: data.documentType,
        file_url: publicUrl, 
        file_path: uploadedPath, 
        mime_type: file.type,
        file_size: file.size,
        description: data.description?.trim() || undefined,
        property_id: propertyId || undefined,
        tenant_id: tenantId || undefined,
      };

      const createdDocumentResponse = await createDocument(documentData);

      toast.success('Document uploaded and record created!', { id: toastId });
      form.reset(); 
      setFile(null);

      if (onUploadSuccess && createdDocumentResponse?.document) {
        onUploadSuccess(createdDocumentResponse.document as Document);
      }

    } catch (error: unknown) {
      console.error('Error in document upload process:', error);
      if (!(error instanceof Error && error.message === 'File upload failed.')) {
        let message = 'Failed to create document record. Please try again.';
        if (error instanceof Error) { message = error.message; }
        toast.error(message, { id: toastId });
        // Set form error for feedback
        form.setError("root.serverError", { type: "custom", message: message });
      } else {
        toast.dismiss(toastId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form name if file is removed 
  useEffect(() => {
    if (!file && form.getValues('documentName')) {
        // Example: Clear name if it likely came from the removed file
        // This logic might need adjustment based on desired UX
        // form.setValue('documentName', ''); 
    }
  }, [file, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-md bg-card shadow-sm">
        <h3 className="text-lg font-semibold text-card-foreground">Upload New Document</h3>
        
        {/* File Dropzone */}
        <FormItem>
          <FormLabel>File <span className="text-destructive">*</span></FormLabel>
          <FormControl>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors duration-200 ease-in-out
                          ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-muted-foreground'}
                          ${file ? 'border-green-500 bg-green-50' : ''}
                          ${form.formState.errors.root?.serverError?.message === 'File is required.' ? 'border-destructive' : ''}`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex flex-col items-center justify-center text-green-700">
                  <FileText size={40} className="mb-2"/>
                  <p className="font-semibold">{file.name}</p>
                  <p className="text-sm text-muted-foreground">({(file.size / 1024).toFixed(2)} KB)</p>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }} 
                    className="mt-2 text-destructive hover:text-destructive/80 h-auto py-1 px-2"
                    disabled={isLoading}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <UploadCloud size={40} className="mb-2 text-primary"/>
                  {isDragActive ? (
                    <p>Drop the file here ...</p>
                  ) : (
                    <p>Drag & drop file here, or <span className="text-primary font-medium">click to select</span></p>
                  )}
                  <p className="text-xs mt-1">(PDF, DOCX, JPG, PNG, etc.)</p>
                </div>
              )}
            </div>
          </FormControl>
          {/* Show file requirement error here */}
          {form.formState.errors.root?.serverError?.message === 'File is required.' && (
             <FormMessage>{form.formState.errors.root.serverError.message}</FormMessage>
          )}
        </FormItem>

        {/* Document Name Input */}
        <FormField
          control={form.control}
          name="documentName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g., Lease Agreement March 2024" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Document Type Select */}
        <FormField
          control={form.control}
          name="documentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
               <Select 
                   onValueChange={field.onChange} 
                   defaultValue={field.value} // Should be undefined initially if optional
                   value={field.value || ""} // Control component requires value prop
                   disabled={isLoading}
                >
                <FormControl>
                   <SelectTrigger>
                     <SelectValue placeholder="Select a document type (optional)" />
                   </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {documentTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Textarea */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add an optional description..."
                  className="resize-none"
                  {...field}
                  disabled={isLoading}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

       {/* General Server Error Message Area */} 
        {form.formState.errors.root?.serverError && form.formState.errors.root.serverError.message !== 'File is required.' && (
            <p className="text-sm font-medium text-destructive">
                {form.formState.errors.root.serverError.message}
            </p>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
              <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel} 
                  disabled={isLoading}
              >
                  Cancel
              </Button>
          )}
          <Button 
              type="submit" 
              disabled={isLoading || !file} // Keep file check for visual button state
          >
            {isLoading ? (
                <><span className="animate-spin mr-2">⏳</span>Uploading...</> 
            ) : (
                'Upload Document'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 
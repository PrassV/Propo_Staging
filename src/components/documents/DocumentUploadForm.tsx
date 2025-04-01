import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { uploadFileToBucket } from '../../api/services/storageService';
import { createDocument } from '../../api/services/documentService';
import { DocumentCreate, Document, DocumentType } from '../../types/document';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface DocumentUploadFormProps {
  propertyId?: string; // Optional pre-filled ID
  tenantId?: string;   // Optional pre-filled ID
  onUploadSuccess?: (document: Document) => void; // Use Document type
  onCancel?: () => void;
}

const BUCKET_NAME = 'documents'; // Define the target bucket

// Define possible document types based on the type definition
const documentTypeOptions: DocumentType[] = [
    'lease_agreement', 
    'id_proof', 
    'payment_receipt', 
    'maintenance_invoice', 
    'maintenance_photo', 
    'property_photo', 
    'other'
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
      if (!form.getValues('documentName')) { 
        form.setValue('documentName', selectedFile.name.replace(/\.[^/.]+$/, ""), { shouldValidate: true }); 
      }
    }
  }, [form]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop,
      accept: { 
          'application/pdf': ['.pdf'],
          'image/jpeg': ['.jpeg', '.jpg'],
          'image/png': ['.png'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
      },
      multiple: false 
  });

  // Function to remove the selected file
  const handleRemoveFile = () => {
    setFile(null);
  };

  // Form submission handler
  const onSubmit: SubmitHandler<DocumentFormData> = async (data) => {
    if (!file) {
      // Explicitly set an error on a non-existent field for general file validation
      form.setError("root.serverError", { type: "custom", message: "File is required." });
      toast.error('Please select a file to upload.');
      return;
    }
    // Clear previous root error if file is now present
    form.clearErrors("root.serverError");

    setIsLoading(true);
    const toastId = toast.loading('Uploading file and creating document...');

    try {
      const folderPath = propertyId ? `properties/${propertyId}` : (tenantId ? `tenants/${tenantId}` : 'general');
      const uploadResult = await uploadFileToBucket(file, BUCKET_NAME, folderPath);

      if (!uploadResult) { 
          // Assuming uploadFileToBucket shows a toast on failure
          throw new Error('File upload failed.'); 
      }

      const documentData: DocumentCreate = {
        document_name: data.documentName.trim(),
        document_type: data.documentType,
        file_url: uploadResult.publicUrl, 
        file_path: uploadResult.filePath, 
        mime_type: uploadResult.mimeType,
        file_size: uploadResult.fileSize,
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
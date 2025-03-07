export type ImageCategory = 'exterior' | 'interior' | 'other';

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export interface UploadResult {
  path: string;
  error?: Error;
}
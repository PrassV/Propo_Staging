import { FileValidationOptions } from './types';

export function validateFile(file: File, options: FileValidationOptions = {}): void {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File ${file.name} is too large (max ${maxSize / (1024 * 1024)}MB)`);
  }

  // Check file type
  const isValidType = allowedTypes.some(type => file.type.startsWith(type));
  if (!isValidType) {
    throw new Error(`File ${file.name} has an invalid type`);
  }
}
export function generateFilePath(
  userId: string,
  propertyId: string,
  fileName: string,
  category?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const fileExt = fileName.split('.').pop();
  const newFileName = `${timestamp}-${random}.${fileExt}`;
  
  return category
    ? `${userId}/${propertyId}/${category}/${newFileName}`
    : `${userId}/${propertyId}/${newFileName}`;
}
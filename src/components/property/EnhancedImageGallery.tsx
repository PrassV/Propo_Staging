import React, { useState, useEffect, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ImageIcon, Plus } from 'lucide-react';
import { PropertyImageService } from '@/utils/storage/propertyImages';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface EnhancedImageGalleryProps {
  propertyId: string;
  propertyName: string;
  className?: string;
  showUploadButton?: boolean;
  onImageUploaded?: () => void;
}

export default function EnhancedImageGallery({ 
  propertyId, 
  propertyName, 
  className,
  showUploadButton = false,
  onImageUploaded
}: EnhancedImageGalleryProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const fetchImages = useCallback(async () => {
    if (!propertyId) {
      setIsLoading(false);
      setImageUrls([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use our new PropertyImageService
      const result = await PropertyImageService.getPropertyImages(propertyId);
      setImageUrls(result.image_urls);
      setSelectedImageIndex(0);
    } catch (err: unknown) {
      console.error("Error fetching property images:", err);
      let message = 'Unknown error';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(`Failed to load images: ${message}`);
      setImageUrls([]);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchImages();
  }, [propertyId, fetchImages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!user?.id) {
      toast.error('You must be logged in to upload images');
      return;
    }

    // Debug: Check if user is authenticated with Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Supabase session check:', session ? 'AUTHENTICATED' : 'NOT AUTHENTICATED');
      console.log('Supabase user ID:', session?.user?.id);
      console.log('Frontend user ID:', user.id);
      
      if (!session) {
        toast.error('Not authenticated with Supabase. Please log in again.');
        return;
      }
    } catch (error) {
      console.error('Error checking Supabase session:', error);
      toast.error('Authentication check failed');
      return;
    }

    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      await PropertyImageService.uploadImages(propertyId, fileArray, user.id);
      await fetchImages(); // Refresh the gallery
      onImageUploaded?.();
    } catch (err) {
      console.error("Error uploading images:", err);
      setError("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (index: number) => {
    try {
      await PropertyImageService.deleteImage(propertyId, index);
      await fetchImages(); // Refresh the gallery
    } catch (err) {
      console.error("Error deleting image:", err);
      setError("Failed to delete image");
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="aspect-video w-full rounded-lg" />
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {[1, 2, 3, 4].map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
     return (
      <div className={cn("aspect-video w-full bg-destructive/10 border border-destructive/30 rounded-md flex flex-col items-center justify-center text-destructive p-4", className)}>
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p className="text-center font-medium">Error Loading Images</p>
        <p className="text-center text-sm">{error}</p>
      </div>
    );
  }
  
  if (imageUrls.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="aspect-video w-full bg-muted rounded-md flex flex-col items-center justify-center text-muted-foreground p-8">
          <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
          <p>No Images Available</p>
          {showUploadButton && (
            <Button 
              className="mt-4" 
              onClick={() => document.getElementById(`file-upload-${propertyId}`)?.click()}
              disabled={isUploading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Add Images'}
            </Button>
          )}
        </div>
        {showUploadButton && (
          <input
            id={`file-upload-${propertyId}`}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        )}
      </div>
    );
  }

  const safeSelectedImageIndex = Math.max(0, Math.min(selectedImageIndex, imageUrls.length - 1));
  const selectedImageUrl = imageUrls[safeSelectedImageIndex];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
        {selectedImageUrl ? (
          <img 
            src={selectedImageUrl}
            alt={`${propertyName} - Image ${safeSelectedImageIndex + 1}`}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="text-destructive/80 flex flex-col items-center">
             <AlertTriangle className="w-6 h-6 mb-1" />
             <span>Preview unavailable</span>
          </div>
        )}
      </div>

      {showUploadButton && (
        <div className="flex gap-2">
          <Button 
            onClick={() => document.getElementById(`file-upload-${propertyId}`)?.click()}
            disabled={isUploading}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Add Images'}
          </Button>
          
          {imageUrls.length > 0 && (
            <Button 
              onClick={() => handleDeleteImage(safeSelectedImageIndex)}
              variant="outline"
              className="text-red-600 hover:text-red-700"
            >
              Delete Image
            </Button>
          )}
        </div>
      )}

      {imageUrls.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {imageUrls.map((url, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={cn(
                "aspect-square rounded-md overflow-hidden border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                index === safeSelectedImageIndex ? "ring-2 ring-primary ring-offset-2" : "hover:opacity-80 transition-opacity"
              )}
            >
              <img 
                src={url} 
                alt={`${propertyName} - Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {showUploadButton && (
        <input
          id={`file-upload-${propertyId}`}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      )}
    </div>
  );
}

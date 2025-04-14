import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from 'lucide-react';
import api from '@/api';

interface EnhancedImageGalleryProps {
  propertyId: string;
  propertyName: string;
  className?: string;
}

export default function EnhancedImageGallery({ 
  propertyId, 
  propertyName, 
  className 
}: EnhancedImageGalleryProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    const fetchImages = async () => {
      if (!propertyId) {
        setIsLoading(false);
        setImageUrls([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use the new API endpoint instead of direct Supabase access
        const urls = await api.property.getPropertyImages(propertyId);
        
        if (isMounted) {
          setImageUrls(urls);
          setSelectedImageIndex(0);
        }
      } catch (err: unknown) {
        console.error("Error fetching property images:", err);
        if (isMounted) {
          let message = 'Unknown error';
          if (err instanceof Error) {
            message = err.message;
          }
          setError(`Failed to load images: ${message}`);
          setImageUrls([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchImages();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

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
      <div className={cn("aspect-video w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground", className)}>
        No Images Available
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
    </div>
  );
}

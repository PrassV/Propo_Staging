import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase';
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from 'lucide-react';

interface ImageGalleryProps {
  imagePaths: string[];
  propertyName: string;
  className?: string;
  bucketName?: string;
}

interface SignedUrlResult {
  signedUrl: string | null;
  error: Error | null;
}

interface SignedImageData {
  path: string;
  signedUrl: string | null;
  error?: Error | null;
}

const DEFAULT_BUCKET = 'property_image';
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

export default function ImageGallery({ 
  imagePaths, 
  propertyName, 
  className, 
  bucketName = DEFAULT_BUCKET
}: ImageGalleryProps) {
  const [signedImageData, setSignedImageData] = useState<SignedImageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    const generateUrls = async () => {
      if (!imagePaths || imagePaths.length === 0) {
        setIsLoading(false);
        setSignedImageData([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(`Generating signed URLs for ${imagePaths.length} paths in bucket: ${bucketName}`);
        const { data, error: urlError } = await supabase.storage
          .from(bucketName)
          .createSignedUrls(imagePaths, SIGNED_URL_EXPIRY);

        if (urlError) {
          console.error("Error generating signed URLs:", urlError);
          throw urlError;
        }

        if (!data) {
           throw new Error("No data returned from createSignedUrls");
        }

        if (isMounted) {
          const resultMap = new Map<string, SignedUrlResult>();
          data.forEach(item => {
            if (item.path) { 
              const typedError: Error | null = item.error ? new Error(String(item.error)) : null;
              
              resultMap.set(item.path, { 
                signedUrl: item.signedUrl, 
                error: typedError
              });
            }
          });

          const processedData: SignedImageData[] = imagePaths.map((path) => { 
            const result = resultMap.get(path);
            return {
              path: path,
              signedUrl: result?.signedUrl || null,
              error: result?.error || null
            };
          });

          setSignedImageData(processedData);
          setSelectedImageIndex(prev => Math.min(prev, processedData.length - 1));
        }

      } catch (err: unknown) {
        console.error("Failed to process signed URLs:", err);
        if (isMounted) {
          let message = 'Unknown error';
          if (err instanceof Error) {
            message = err.message;
          }
          setError(`Failed to load images: ${message}`);
          setSignedImageData(imagePaths.map(path => ({ path, signedUrl: null, error: err instanceof Error ? err : new Error(String(err)) })));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    generateUrls();

    return () => {
      isMounted = false;
    };
  }, [imagePaths, bucketName]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="aspect-video w-full rounded-lg" />
        {imagePaths && imagePaths.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {imagePaths.map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-md" />
            ))}
          </div>
        )}
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
  
  if (signedImageData.length === 0) {
    return (
      <div className={cn("aspect-video w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground", className)}>
        No Images Available
      </div>
    );
  }

  const safeSelectedImageIndex = Math.max(0, Math.min(selectedImageIndex, signedImageData.length - 1));
  const selectedImage = signedImageData[safeSelectedImageIndex];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
        {selectedImage?.signedUrl ? (
          <img 
            src={selectedImage.signedUrl}
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

      {signedImageData.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {signedImageData.map((imgData, index) => (
            <button
              key={imgData.path}
              onClick={() => setSelectedImageIndex(index)}
              disabled={!imgData.signedUrl}
              className={cn(
                "aspect-square rounded-md overflow-hidden border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                index === safeSelectedImageIndex ? "ring-2 ring-primary ring-offset-2" : "hover:opacity-80 transition-opacity",
                !imgData.signedUrl ? "bg-muted cursor-not-allowed opacity-50" : ""
              )}
            >
              {imgData.signedUrl ? (
                <img 
                  src={imgData.signedUrl} 
                  alt={`${propertyName} - Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                 <div className="w-full h-full flex items-center justify-center text-destructive/70">
                    <AlertTriangle className="w-5 h-5" />
                 </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
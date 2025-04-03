import React, { useState } from 'react';
// import { Card, CardContent } from "@/components/ui/card"; // Removed unused
import { cn } from "@/lib/utils"; // For conditional classes

interface ImageGalleryProps {
  imageUrls: string[];
  propertyName: string; // For alt text
  className?: string;
}

export default function ImageGallery({ imageUrls, propertyName, className }: ImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className={cn("aspect-video w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground", className)}>
        No Images Available
      </div>
    );
  }

  const selectedImageUrl = imageUrls[selectedImageIndex];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image */}
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
        <img 
          src={selectedImageUrl}
          alt={`${propertyName} - Image ${selectedImageIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      </div>

      {/* Thumbnails (only if more than 1 image) */}
      {imageUrls.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {imageUrls.map((url, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={cn(
                "aspect-square rounded-md overflow-hidden border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                index === selectedImageIndex ? "ring-2 ring-primary ring-offset-2" : "hover:opacity-80 transition-opacity"
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
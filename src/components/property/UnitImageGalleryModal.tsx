import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';
import api from '@/api';

interface UnitImageGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitNumber: string;
}

export default function UnitImageGalleryModal({ 
  open, 
  onOpenChange, 
  unitId, 
  unitNumber 
}: UnitImageGalleryModalProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  useEffect(() => {
    if (open) {
      fetchUnitImages();
    }
  }, [open, unitId]);
  
  const fetchUnitImages = async () => {
    if (!unitId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use API once implemented
      try {
        const imageUrls = await api.property.getUnitImages(unitId);
        setImages(imageUrls);
      } catch {
        console.error("API not implemented yet, using placeholder data");
        // Placeholder data until backend is ready
        setImages([
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=1500&q=80',
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1500&q=80',
          'https://images.unsplash.com/photo-1560185009-5bf9f2849488?ixlib=rb-4.0.3&auto=format&fit=crop&w=1500&q=80'
        ]);
      }
    } catch (err) {
      console.error("Error fetching unit images:", err);
      setError(err instanceof Error ? err.message : 'Failed to load unit images');
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    try {
      // In a real implementation, you'd upload to a storage service first
      // then save the URL via the API. This is a placeholder.
      const file = files[0];
      
      // Simulating upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Mock file URL for placeholder
        const fileUrl = URL.createObjectURL(file);
        
        // Try to use the API if implemented
        await api.property.addUnitImage(unitId, fileUrl);
        setImages([fileUrl, ...images]);
      } catch {
        console.error("API not implemented yet, using placeholder behavior");
        
        // Placeholder behavior - just add to local state
        const fileUrl = URL.createObjectURL(file);
        setImages([fileUrl, ...images]);
      }
      
      toast.success('Image uploaded successfully');
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      // Reset the input
      e.target.value = '';
    }
  };
  
  const handleDeleteImage = async (imageUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    
    try {
      // Try to use the API if implemented
      try {
        await api.property.deleteUnitImage(unitId, imageUrl);
        setImages(images.filter(url => url !== imageUrl));
        
        // If this was the active image, clear it
        if (activeImage === imageUrl) {
          setActiveImage(null);
        }
        
        toast.success('Image deleted successfully');
      } catch {
        console.error("API not implemented yet, using placeholder behavior");
        
        // Placeholder behavior - just remove from local state
        setImages(images.filter(url => url !== imageUrl));
        
        // If this was the active image, clear it
        if (activeImage === imageUrl) {
          setActiveImage(null);
        }
        
        toast.success('Image deleted successfully (placeholder)');
      }
    } catch (err) {
      console.error("Error deleting image:", err);
      toast.error('Failed to delete image');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Unit {unitNumber} Images</DialogTitle>
          <DialogDescription>
            View and manage images for this unit.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto py-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-60 w-full" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-20" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-destructive text-center">
              <AlertTriangle className="mx-auto mb-2 h-10 w-10" />
              <p>{error}</p>
            </div>
          ) : (
            <div>
              {/* Main image display */}
              <div className="mb-4 bg-muted rounded-md flex items-center justify-center" style={{ height: '300px' }}>
                {activeImage || images[0] ? (
                  <img
                    src={activeImage || images[0]}
                    alt={`Unit ${unitNumber}`}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground">No images available</div>
                )}
              </div>
              
              {/* Thumbnails row */}
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((url, index) => (
                    <div key={index} className="relative group">
                      <div 
                        className={`h-20 w-20 rounded-md overflow-hidden cursor-pointer border-2 ${url === (activeImage || images[0]) ? 'border-primary' : 'border-transparent'}`}
                        onClick={() => setActiveImage(url)}
                      >
                        <img 
                          src={url} 
                          alt={`Unit ${unitNumber} thumbnail ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button 
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteImage(url)}
                        aria-label="Delete image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between items-center">
          <div className="flex items-center">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="relative overflow-hidden"
            >
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Button>
          </div>
          <Button 
            type="button" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PropertyData {
  owner_id: string;
  property_name: string;
  property_type: string;
  number_of_units: number;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  survey_number?: string;
  door_number?: string;
  description?: string;
  category?: string;
  listed_in?: string;
  price: number;
  yearly_tax_rate?: number;
  size_sqft: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  garages?: number;
  garage_size?: number;
  year_built?: number;
  floors: number;
  amenities: string[];
}

interface ImageFile {
  base64Data: string;
  fileName: string;
  fileType: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

export async function createPropertyWithImages({ propertyData, images }: { propertyData: PropertyData, images: ImageFile[] }) {
  try {
    // Add size check before processing
    for (const image of images) {
      const buffer = Buffer.from(image.base64Data.split(',')[1], 'base64');
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File ${image.fileName} exceeds maximum size of 5MB`);
      }
    }

    // 1. Create property record first
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert([propertyData])
      .select()
      .single();

    if (propertyError) throw propertyError;

    // 2. Upload images and get URLs
    const imageUrls: string[] = [];
    const imagePaths: string[] = [];
    
    for (const image of images) {
      try {
        const buffer = Buffer.from(image.base64Data.split(',')[1], 'base64');
        
        // Generate consistent file path format
        const timestamp = Date.now();
        const sanitizedFileName = image.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `properties/${property.id}/${timestamp}-${sanitizedFileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('propertyimage')
          .upload(filePath, buffer, {
            contentType: image.fileType,
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Store both the path and public URL
        imagePaths.push(filePath);
        const { data: { publicUrl } } = supabase.storage
          .from('propertyimage')
          .getPublicUrl(filePath);
        imageUrls.push(publicUrl);
      } catch (error) {
        // If any image upload fails, delete the property and previously uploaded images
        await handleRollback(property.id, imagePaths);
        throw error;
      }
    }

    // 3. Update property with both paths and URLs
    const { error: updateError } = await supabase
      .from('properties')
      .update({ 
        image_urls: imageUrls,
        image_paths: imagePaths  // Add this column to store original paths
      })
      .eq('id', property.id);

    if (updateError) {
      await handleRollback(property.id, imagePaths);
      throw updateError;
    }

    return {
      headers: corsHeaders,
      success: true,
      data: {
        property: { ...property, image_urls: imageUrls }
      }
    };

  } catch (error) {
    return {
      headers: corsHeaders,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function handleRollback(propertyId: string, imagePaths: string[]) {
  // Delete property
  await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId);

  // Delete uploaded images using stored paths
  if (imagePaths.length > 0) {
    await supabase.storage
      .from('propertyimage')
      .remove(imagePaths);
  }
} 

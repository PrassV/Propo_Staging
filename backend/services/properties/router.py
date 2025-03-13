from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from datetime import datetime, timedelta
import uuid
import base64

# Import the database operations from shared module
from shared.database import get_by_id, create, update, delete_by_id, supabase_client

router = APIRouter()

class PropertyBase(BaseModel):
    property_name: str
    property_type: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: Optional[str] = "India"
    size_sqft: int
    bedrooms: int
    bathrooms: int
    description: Optional[str] = None
    amenities: Optional[List[str]] = None

class PropertyCreate(PropertyBase):
    owner_id: str

class PropertyUpdate(PropertyBase):
    pass

class PropertyResponse(PropertyBase):
    id: str
    owner_id: str
    created_at: str
    updated_at: str
    image_urls: Optional[List[str]] = []
    image_paths: Optional[List[str]] = []

# In-memory storage for demo purposes
# In production, this would be stored in a database
property_data = {}

# Helper function to generate signed URLs with a long expiration time
def generate_signed_url(bucket_name: str, file_path: str, expiration_days: int = 7) -> str:
    """Generate a signed URL for a file with a specified expiration time in days"""
    try:
        expiration_seconds = expiration_days * 24 * 60 * 60  # Convert days to seconds
        response = supabase_client.storage.from_(bucket_name).create_signed_url(
            path=file_path,
            expires_in=expiration_seconds
        )
        
        if hasattr(response, 'error') and response.error:
            print(f"Error generating signed URL: {response.error}")
            # Fall back to public URL if signed URL generation fails
            return supabase_client.storage.from_(bucket_name).get_public_url(file_path)
            
        return response.data.get('signedUrl')
    except Exception as e:
        print(f"Exception generating signed URL: {str(e)}")
        # Fall back to public URL if there's an exception
        return supabase_client.storage.from_(bucket_name).get_public_url(file_path)

@router.post("/", response_model=PropertyResponse)
async def create_property(property_data: PropertyCreate):
    """Create a new property listing"""
    property_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    new_property = {
        "id": property_id,
        **property_data.dict(),
        "created_at": timestamp,
        "updated_at": timestamp,
        "image_urls": [],
        "image_paths": []
    }
    
    # In a real app, we would store this in the database
    # Here we're using the create function from shared database module
    try:
        created_property = await create("properties", new_property)
        return created_property
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create property: {str(e)}")

@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    """Get a property by ID"""
    try:
        # Check if we're using a direct Supabase call or a shared function
        # If get_by_id is an async function, keep the await, otherwise remove it
        property_data = await get_by_id("properties", property_id)
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")
        return property_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch property: {str(e)}")

@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(property_id: str, property_update: PropertyUpdate):
    """Update a property by ID"""
    existing_property = await get_by_id("properties", property_id)
    if not existing_property:
        raise HTTPException(status_code=404, detail="Property not found")
        
    updated_data = {
        **property_update.dict(),
        "updated_at": datetime.now().isoformat()
    }
    
    try:
        updated_property = await update("properties", property_id, updated_data)
        return updated_property
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update property: {str(e)}")

@router.delete("/{property_id}")
async def delete_property(property_id: str):
    """Delete a property by ID"""
    existing_property = await get_by_id("properties", property_id)
    if not existing_property:
        raise HTTPException(status_code=404, detail="Property not found")
        
    try:
        # First, try to delete any associated images from storage
        if existing_property.get("image_paths"):
            try:
                await supabase_client.storage.from_("propertyimage").remove(
                    existing_property["image_paths"]
                )
            except Exception as e:
                # Log but continue - we still want to delete the property
                print(f"Warning: Could not delete property images: {str(e)}")
        
        # Now delete the property record
        await delete_by_id("properties", property_id)
        return {"status": "success", "message": "Property deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete property: {str(e)}")

@router.get("/user/{user_id}", response_model=List[PropertyResponse])
async def get_properties_by_user(user_id: str):
    """Get all properties owned by a user"""
    try:
        # Query Supabase to get properties by owner_id
        # The Supabase Python client's execute() doesn't return an awaitable
        # so we shouldn't use 'await' with it
        properties_data = supabase_client.table("properties").select("""
            *,
            tenants:property_tenants(
                tenant:tenants(*)
            )
        """).eq("owner_id", user_id).execute()
        
        if hasattr(properties_data, 'error') and properties_data.error:
            raise HTTPException(status_code=500, detail=f"Failed to fetch properties: {properties_data.error.message}")
        
        # Format the data to match the expected response model
        formatted_properties = properties_data.data if properties_data.data else []
        
        return formatted_properties
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch properties: {str(e)}")

@router.post("/{property_id}/upload-image")
async def upload_property_image(
    property_id: str, 
    file: UploadFile = File(...),
    description: str = Form(None)
):
    """Upload an image for a property"""
    existing_property = await get_by_id("properties", property_id) 
    if not existing_property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    try:
        # Read file content
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB limit
            raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit")
        
        # Extract file extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        if not file_extension:
            file_extension = ".jpg"  # Default extension
        
        # Get total images count to generate next image number
        image_count = len(existing_property.get("image_paths", []))
        
        # Generate file path using the requested format: <UserID>/<PropertyID>/image.png
        owner_id = existing_property["owner_id"]
        file_path = f"{owner_id}/{property_id}/image_{image_count + 1}{file_extension}"
        
        # Set content type based on file extension
        content_type = "image/jpeg"  # Default
        if file_extension == '.png':
            content_type = "image/png"
        elif file_extension == '.gif':
            content_type = "image/gif"
        
        # Upload to Supabase Storage
        upload_response = await supabase_client.storage.from_("propertyimage").upload(
            path=file_path,
            file=contents,
            file_options={"content-type": content_type}
        )
        
        if hasattr(upload_response, 'error') and upload_response.error:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {upload_response.error.message}")
        
        # Generate signed URL with token instead of public URL
        signed_url = generate_signed_url("propertyimage", file_path)
        
        # Update existing property with new image info
        image_paths = existing_property.get("image_paths", [])
        image_urls = existing_property.get("image_urls", [])
        
        image_paths.append(file_path)
        image_urls.append(signed_url)
        
        # Update the property with new image info
        await update("properties", property_id, {
            "image_urls": image_urls,
            "image_paths": image_paths
        })
        
        return {
            "status": "success", 
            "filename": file.filename, 
            "path": file_path,
            "url": signed_url,
            "description": description
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

class ImageData(BaseModel):
    """
    Model for handling images to be uploaded with a property
    
    image_name: The original filename with extension (e.g. "house_photo.jpg")
    image_data: Base64 encoded image data. Can be full data URI (data:image/jpeg;base64,/9j/4AAQ...)
                or just the base64 string
    """
    image_name: str
    image_data: str

class PropertyCreateWithImages(BaseModel):
    """
    Model for creating a property with images in a single request
    
    Images are uploaded to Supabase storage in the 'propertyimage' bucket,
    using the path format: '<UserID>/<PropertyID>/image_1.jpg'
    """
    property_name: str
    property_type: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    country: str = "India"
    survey_number: str
    door_number: str
    size_sqft: int
    bedrooms: int
    bathrooms: int
    kitchens: Optional[int] = None
    garages: Optional[int] = None
    garage_size: Optional[int] = None
    year_built: Optional[int] = None
    floors: Optional[int] = None
    price: Optional[float] = None
    yearly_tax_rate: Optional[float] = None
    category: Optional[str] = None
    listed_in: Optional[str] = None
    amenities: Optional[List[str]] = None
    description: Optional[str] = None
    images: List[ImageData]
    owner_id: str

@router.post("/create-with-images")
async def create_property_with_images(property_data: PropertyCreateWithImages):
    """Create a new property with images"""
    
    # 1. Create the property record
    property_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    new_property = {
        "id": property_id,
        "property_name": property_data.property_name,
        "address_line1": property_data.address_line1,
        "address_line2": property_data.address_line2,
        "city": property_data.city,
        "state": property_data.state,
        "pincode": property_data.zip_code,
        "country": property_data.country,
        "survey_number": property_data.survey_number,
        "door_number": property_data.door_number,
        "property_type": property_data.property_type,
        "bedrooms": property_data.bedrooms,
        "bathrooms": property_data.bathrooms,
        "kitchens": property_data.kitchens,
        "garages": property_data.garages,
        "garage_size": property_data.garage_size,
        "year_built": property_data.year_built,
        "floors": property_data.floors,
        "price": property_data.price,
        "yearly_tax_rate": property_data.yearly_tax_rate,
        "category": property_data.category,
        "listed_in": property_data.listed_in,
        "size_sqft": property_data.size_sqft,
        "owner_id": property_data.owner_id,
        "description": property_data.description,
        "amenities": property_data.amenities,
        "created_at": timestamp,
        "updated_at": timestamp,
        "image_urls": [],
        "image_paths": []
    }
    
    try:
        # Create property record first
        created_property = await create("properties", new_property)
        if not created_property:
            raise HTTPException(status_code=500, detail="Failed to create property record")
        
        # 2. Process and upload images
        image_urls = []
        image_paths = []
        MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB limit
        
        for idx, image in enumerate(property_data.images):
            try:
                # Parse base64 data
                if "," in image.image_data:
                    base64_data = image.image_data.split(",")[1]
                else:
                    base64_data = image.image_data
                
                # Decode base64 data
                binary_data = base64.b64decode(base64_data)
                
                # Check file size
                if len(binary_data) > MAX_FILE_SIZE:
                    raise HTTPException(status_code=400, detail=f"File {image.image_name} exceeds maximum size of 5MB")
                
                # Extract file extension
                file_extension = os.path.splitext(image.image_name)[1].lower()
                if not file_extension:
                    file_extension = ".jpg"  # Default extension
                
                # Generate file path using the requested format: <UserID>/<PropertyID>/image.png
                # Using index to ensure unique filenames if multiple images are uploaded
                file_path = f"{property_data.owner_id}/{property_id}/image_{idx+1}{file_extension}"
                
                # Upload to Supabase Storage
                content_type = "image/jpeg"  # Default
                if file_extension == '.png':
                    content_type = "image/png"
                elif file_extension == '.gif':
                    content_type = "image/gif"
                
                upload_response = supabase_client.storage.from_("propertyimage").upload(
                    path=file_path,
                    file=binary_data,
                    file_options={"content-type": content_type}
                )
                
                if hasattr(upload_response, 'error') and upload_response.error:
                    raise HTTPException(status_code=500, detail=f"Failed to upload image: {upload_response.error.message}")
                
                # Generate signed URL with token instead of public URL
                signed_url = generate_signed_url("propertyimage", file_path)
                
                # Store paths and URLs
                image_paths.append(file_path)
                image_urls.append(signed_url)
                
            except Exception as e:
                # If any image upload fails, delete property and previously uploaded images
                await delete_by_id("properties", property_id)
                
                # Remove any images that were uploaded
                if image_paths:
                    await supabase_client.storage.from_("propertyimage").remove(image_paths)
                
                raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
        
        # 3. Update property with image URLs and paths
        updated_property = await update("properties", property_id, {
            "image_urls": image_urls,
            "image_paths": image_paths
        })
        
        if not updated_property:
            # Rollback if update fails
            await delete_by_id("properties", property_id)
            if image_paths:
                await supabase_client.storage.from_("propertyimage").remove(image_paths)
            raise HTTPException(status_code=500, detail="Failed to update property with image information")
        
        return {
            "success": True,
            "property": {
                **created_property,
                "image_urls": image_urls
            }
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error
        print(f"Error creating property with images: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create property: {str(e)}")

class BulkImageUpload(BaseModel):
    """
    Model for uploading multiple images to an existing property
    
    Images will be stored in Supabase storage in the 'propertyimage' bucket,
    using the path format: '<UserID>/<PropertyID>/image_N.jpg'
    """
    images: List[ImageData]

@router.post("/{property_id}/upload-multiple-images")
async def upload_multiple_property_images(
    property_id: str,
    image_data: BulkImageUpload
):
    """Upload multiple images for an existing property"""
    existing_property = await get_by_id("properties", property_id) 
    if not existing_property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get current image counts for correct numbering
    current_image_count = len(existing_property.get("image_paths", []))
    owner_id = existing_property["owner_id"]
    
    # Process uploads
    image_paths = existing_property.get("image_paths", [])
    image_urls = existing_property.get("image_urls", [])
    filenames = existing_property.get("image_names", [])
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB limit
    
    try:
        for idx, image in enumerate(image_data.images):
            # Parse base64 data
            if "," in image.image_data:
                base64_data = image.image_data.split(",")[1]
            else:
                base64_data = image.image_data
            
            # Decode base64 data
            binary_data = base64.b64decode(base64_data)
            
            # Check file size
            if len(binary_data) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail=f"File {image.image_name} exceeds maximum size of 5MB")
            
            # Extract file extension
            file_extension = os.path.splitext(image.image_name)[1].lower()
            if not file_extension:
                file_extension = ".jpg"  # Default extension
            
            # Generate file path using the requested format: <UserID>/<PropertyID>/image.png
            # Using index to ensure unique filenames if multiple images are uploaded
            file_path = f"{owner_id}/{property_id}/image_{current_image_count + idx + 1}{file_extension}"
            
            # Upload to Supabase Storage
            content_type = "image/jpeg"  # Default
            if file_extension == '.png':
                content_type = "image/png"
            elif file_extension == '.gif':
                content_type = "image/gif"
            
            upload_response = supabase_client.storage.from_("propertyimage").upload(
                path=file_path,
                file=binary_data,
                file_options={"content-type": content_type}
            )
            
            if hasattr(upload_response, 'error') and upload_response.error:
                raise HTTPException(status_code=500, detail=f"Failed to upload image: {upload_response.error.message}")
            
            # Generate signed URL with token instead of public URL
            signed_url = generate_signed_url("propertyimage", file_path)
            
            # Store paths and URLs
            image_paths.append(file_path)
            image_urls.append(signed_url)
            filenames.append(image.image_name)
                
        # Update the property with all new image info
        await update("properties", property_id, {
            "image_names": filenames,
            "image_paths": image_paths,
            "image_urls": image_urls
        })
        
        return {
            "status": "success",
            "message": f"Successfully uploaded {len(image_data.images)} images",
            "image_urls": image_urls[-len(image_data.images):]
        }
    except Exception as e:
        # Only attempt removal if it's not a HTTPException we raised
        if not isinstance(e, HTTPException):
            # Try to remove any images that were uploaded in this batch
            if len(image_paths) > current_image_count:
                paths_to_remove = image_paths[current_image_count:]
                await supabase_client.storage.from_("propertyimage").remove(paths_to_remove)
        
        # Re-raise the exception
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to upload images: {str(e)}") 
# Supabase Storage Usage Guide

## Image URLs in Our Application

When storing and retrieving images in our application, we have two options for accessing them:

### 1. Public URLs

```typescript
const { data: { publicUrl } } = supabase.storage
  .from('propertyimage')
  .getPublicUrl(path);
```

**Public URL Format:**
```
https://oniudnupeazkagtbsxtt.supabase.co/storage/v1/object/public/propertyimage/path/to/image.jpg
```

**Requirements:**
- The bucket must have a policy allowing public (`anon`) access
- No authentication is required to access these URLs
- Simple to implement but less secure

**When to use:**
- For non-sensitive images that can be publicly accessible
- When you need to share image URLs with external systems
- For content like marketing materials that should be accessible to everyone

### 2. Signed URLs

```typescript
const { data, error } = await supabase.storage
  .from('propertyimage')
  .createSignedUrl(path, 3600); // Expires in 1 hour
```

**Signed URL Format:**
```
https://oniudnupeazkagtbsxtt.supabase.co/storage/v1/object/sign/propertyimage/path/to/image.jpg?token=eyJhbGciOiJIUzI1...
```

**Requirements:**
- Works even without public access policies
- Contains a JWT token for authentication
- Time-limited access (requires expiration time parameter)
- More secure but URLs expire and need to be regenerated

**When to use:**
- For user-specific or sensitive content
- When you need to restrict access to authenticated users
- When you want to limit how long an image URL is valid

## Current Implementation

We've implemented a system that:

1. First tries to get a signed URL for each image
2. Falls back to using public URLs if signed URLs aren't available
3. Returns a default image if both methods fail

This ensures the best balance between security and reliability.

## Troubleshooting Image Loading Issues

If images are failing to load, check:

1. The security policies on your Supabase bucket
2. Whether the image path stored in the database is correct
3. If the token in signed URLs has expired
4. Network requests in your browser's dev tools for specific error messages

To run diagnostics on your storage bucket:

```typescript
// In browser console
import { checkStorageBucket } from './utils/api';
checkStorageBucket('propertyimage').then(console.log);
``` 
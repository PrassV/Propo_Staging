# Tenant Document Traceability System

## Overview
This document explains how tenant documents are uploaded and stored with proper user ID - tenant ID combination preservation for complete traceability.

## Storage Architecture

### 1. **Structured Path System**
All tenant documents follow a standardized path structure that preserves the relationship between users and tenants:

```
users/{user_id}/tenants/{tenant_id}/documents/{document_type}/{filename}
```

**Example:**
```
users/550e8400-e29b-41d4-a716-446655440000/tenants/6ba7b810-9dad-11d1-80b4-00c04fd430c8/documents/identity/1642345678901-abc123.pdf
```

### 2. **Database Schema**
Documents are tracked in two complementary ways:

#### A. **tenant_documents Table**
```sql
CREATE TABLE tenant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    document_type document_type NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,  -- Full storage path
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_status verification_status DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### B. **tenants Table** (Maintains user-tenant relationship)
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    user_id UUID REFERENCES auth.users(id),  -- Links to auth user
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    -- other fields...
);
```

## Traceability Features

### 1. **Forward Traceability (User → Documents)**
Find all documents for a user's tenants:

```sql
-- Get all documents for a user's tenants
SELECT 
    td.*,
    t.name as tenant_name,
    t.email as tenant_email
FROM tenant_documents td
JOIN tenants t ON td.tenant_id = t.id
WHERE t.owner_id = $user_id
ORDER BY td.created_at DESC;
```

### 2. **Reverse Traceability (Document → User)**
From a file path, extract user and tenant information:

```python
# Extract IDs from file path
def extract_ids_from_path(file_path: str) -> Dict[str, str]:
    """
    Extract user_id and tenant_id from standardized file path
    Path format: users/{user_id}/tenants/{tenant_id}/documents/{document_type}/{filename}
    """
    parts = file_path.split('/')
    if len(parts) >= 4 and parts[0] == 'users' and parts[2] == 'tenants':
        return {
            'user_id': parts[1],
            'tenant_id': parts[3],
            'document_type': parts[5] if len(parts) > 5 else 'unknown',
            'filename': parts[-1]
        }
    return {}
```

### 3. **Cross-Reference Validation**
Verify document ownership and access:

```python
async def verify_document_access(file_path: str, requesting_user_id: str) -> bool:
    """
    Verify if a user has access to a document based on file path
    """
    path_info = extract_ids_from_path(file_path)
    if not path_info:
        return False
    
    # Check if requesting user owns the tenant
    query = """
        SELECT COUNT(*) FROM tenants 
        WHERE id = $1 AND owner_id = $2
    """
    result = await db.fetchval(query, path_info['tenant_id'], requesting_user_id)
    return result > 0
```

## Upload Process

### 1. **Frontend Upload**
```typescript
const uploadTenantDocument = async (
    file: File,
    tenantId: string,
    documentType: string = 'general'
) => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('context', 'tenant_documents');
    formData.append('tenant_id', tenantId);
    formData.append('document_type', documentType);
    
    const response = await apiClient.post('/uploads/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return response.data;
};
```

### 2. **Backend Processing**
```python
@router.post("/", response_model=UploadResponse)
async def upload_files(
    files: List[UploadFile] = File(...),
    context: Optional[str] = Form(None),
    tenant_id: Optional[str] = Form(None),
    document_type: Optional[str] = Form('general'),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    metadata = {
        'user_id': current_user["id"],
        'tenant_id': tenant_id,
        'document_type': document_type
    }
    
    # Upload with structured path
    upload_result = storage_service.upload_file(
        file_content=content,
        filename=file.filename,
        context='tenant_documents',
        metadata=metadata
    )
    
    # Create database record
    if upload_result['success']:
        await create_tenant_document_record(
            tenant_id=tenant_id,
            file_path=upload_result['file_path'],
            document_type=document_type,
            user_id=current_user["id"]
        )
```

## Security Policies

### 1. **Storage RLS Policies**
```sql
-- Users can only access their own tenant documents
CREATE POLICY "Users can access their tenant documents" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'tenant-documents' AND
    split_part(name, '/', 2) = auth.uid()::text
);
```

### 2. **Database RLS Policies**
```sql
-- Users can only access documents for their tenants
CREATE POLICY "Users can access their tenant documents" ON tenant_documents
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tenants 
        WHERE tenants.id = tenant_documents.tenant_id 
        AND tenants.owner_id = auth.uid()
    )
);
```

## Document Retrieval

### 1. **Get Documents by Tenant**
```python
async def get_tenant_documents(tenant_id: str, user_id: str) -> List[Dict]:
    """Get all documents for a specific tenant"""
    query = """
        SELECT 
            td.*,
            t.name as tenant_name
        FROM tenant_documents td
        JOIN tenants t ON td.tenant_id = t.id
        WHERE td.tenant_id = $1 AND t.owner_id = $2
        ORDER BY td.created_at DESC
    """
    return await db.fetch(query, tenant_id, user_id)
```

### 2. **Get Signed URLs**
```python
async def get_document_signed_url(file_path: str, user_id: str) -> str:
    """Get signed URL for document access"""
    # Verify access
    if not await verify_document_access(file_path, user_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate signed URL
    return storage_service.get_signed_url(
        file_path=file_path,
        bucket_name='tenant-documents',
        expires_in=3600
    )
```

## Migration Strategy

### 1. **Existing Documents**
For documents already uploaded with old path structure:

```python
async def migrate_document_paths():
    """Migrate existing documents to new path structure"""
    old_documents = await db.fetch("""
        SELECT * FROM tenant_documents 
        WHERE file_path NOT LIKE 'users/%/tenants/%/documents/%'
    """)
    
    for doc in old_documents:
        # Extract tenant and user info
        tenant = await get_tenant_with_owner(doc['tenant_id'])
        if tenant:
            # Generate new path
            new_path = f"users/{tenant['owner_id']}/tenants/{doc['tenant_id']}/documents/{doc['document_type']}/{doc['filename']}"
            
            # Move file in storage
            await storage_service.move_file(doc['file_path'], new_path)
            
            # Update database
            await db.execute("""
                UPDATE tenant_documents 
                SET file_path = $1 
                WHERE id = $2
            """, new_path, doc['id'])
```

## Monitoring and Auditing

### 1. **Document Access Logs**
```sql
CREATE TABLE document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    access_type VARCHAR(50) NOT NULL, -- 'view', 'download', 'upload', 'delete'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. **Audit Function**
```python
async def log_document_access(
    user_id: str,
    tenant_id: str,
    document_id: str,
    access_type: str,
    request_info: Dict
):
    """Log document access for auditing"""
    await db.execute("""
        INSERT INTO document_access_logs 
        (user_id, tenant_id, document_id, access_type, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, user_id, tenant_id, document_id, access_type, 
         request_info.get('ip'), request_info.get('user_agent'))
```

## Best Practices

### 1. **Always Include Both IDs**
- **user_id**: Owner of the tenant
- **tenant_id**: Specific tenant the document belongs to
- **document_type**: Category of document for organization

### 2. **Validate Relationships**
Before any document operation, verify:
```python
async def validate_tenant_ownership(tenant_id: str, user_id: str) -> bool:
    """Ensure user owns the tenant"""
    query = "SELECT COUNT(*) FROM tenants WHERE id = $1 AND owner_id = $2"
    result = await db.fetchval(query, tenant_id, user_id)
    return result > 0
```

### 3. **Use Transactions**
```python
async def upload_tenant_document_with_record(
    file_content: bytes,
    filename: str,
    tenant_id: str,
    user_id: str,
    document_type: str
):
    """Upload file and create database record in transaction"""
    async with db.transaction():
        # Upload file
        upload_result = await storage_service.upload_file(...)
        
        # Create database record
        await db.execute("""
            INSERT INTO tenant_documents 
            (tenant_id, file_path, document_type, ...)
            VALUES ($1, $2, $3, ...)
        """, tenant_id, upload_result['file_path'], document_type)
```

## Summary

This traceability system ensures:

1. **Complete Audit Trail**: Every document can be traced back to its owner and tenant
2. **Security**: Proper access controls prevent unauthorized document access  
3. **Organization**: Structured paths make document management efficient
4. **Scalability**: System can handle millions of documents with proper indexing
5. **Compliance**: Full audit logs for regulatory requirements

The key is maintaining the **user_id → tenant_id → document** relationship at every level: storage paths, database records, and access controls. 
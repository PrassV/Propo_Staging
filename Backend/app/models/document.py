from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid

class DocumentType(str, Enum):
    LEASE = "LEASE"
    INVOICE = "INVOICE"
    RECEIPT = "RECEIPT"
    MAINTENANCE_REQUEST = "MAINTENANCE_REQUEST"
    INSPECTION_REPORT = "INSPECTION_REPORT"
    PROPERTY_DOCUMENT = "PROPERTY_DOCUMENT"
    TENANT_DOCUMENT = "TENANT_DOCUMENT"
    CONTRACT = "CONTRACT"
    NOTICE = "NOTICE"
    OTHER = "OTHER"

class DocumentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"

class DocumentAccess(str, Enum):
    PRIVATE = "PRIVATE"
    SHARED = "SHARED" 
    PUBLIC = "PUBLIC"

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    property_id: Optional[str] = None
    tenant_id: Optional[str] = None
    unit_id: Optional[str] = None
    file_url: str = Field(..., min_length=1)
    file_name: str = Field(..., min_length=1, max_length=255)
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    document_type: DocumentType = Field(default=DocumentType.OTHER)
    access_level: DocumentAccess = Field(default=DocumentAccess.PRIVATE)
    tags: Optional[List[str]] = None
    
    @validator('property_id', 'tenant_id', 'unit_id')
    def validate_ids(cls, v):
        if v is not None:
            try:
                uuid.UUID(v)
            except ValueError:
                raise ValueError("Invalid UUID format")
        return v

class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    property_id: Optional[str] = None
    tenant_id: Optional[str] = None
    unit_id: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = Field(None, min_length=1, max_length=255)
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    document_type: Optional[DocumentType] = None
    access_level: Optional[DocumentAccess] = None
    tags: Optional[List[str]] = None
    
    @validator('property_id', 'tenant_id', 'unit_id')
    def validate_ids(cls, v):
        if v is not None:
            try:
                uuid.UUID(v)
            except ValueError:
                raise ValueError("Invalid UUID format")
        return v

class Document(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    owner_id: str
    property_id: Optional[str] = None
    tenant_id: Optional[str] = None
    unit_id: Optional[str] = None
    file_url: str
    file_name: str
    file_type: str
    file_size: Optional[int] = None
    document_type: DocumentType
    access_level: DocumentAccess
    status: DocumentStatus
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class DocumentVersionCreate(BaseModel):
    document_id: str
    file_url: str
    created_by: str
    change_notes: Optional[str] = None
    file_size: Optional[int] = None

class DocumentVersion(BaseModel):
    id: str
    document_id: str
    version_number: int
    file_url: str
    created_by: str
    change_notes: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class DocumentShareCreate(BaseModel):
    document_id: str
    shared_by: str
    shared_with: Optional[str] = None
    access_code: Optional[str] = None
    expiry_date: Optional[datetime] = None

class DocumentShare(BaseModel):
    id: str
    document_id: str
    shared_by: str
    shared_with: Optional[str] = None
    access_code: Optional[str] = None
    is_active: bool = True
    expiry_date: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class DocumentCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    owner_id: str
    description: Optional[str] = None
    parent_category_id: Optional[str] = None

class DocumentCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    parent_category_id: Optional[str] = None

class DocumentCategory(BaseModel):
    id: str
    name: str
    owner_id: str
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True 
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class User(BaseModel):
    """
    User model for authentication and user management
    """
    id: Optional[UUID] = None
    email: Optional[EmailStr] = None
    is_active: bool = True
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    user_type: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """ Fields allowed for user profile update """
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    user_type: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    class Config:
        from_attributes = True 
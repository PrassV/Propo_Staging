from typing import Optional
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    """
    User model for authentication and user management
    """
    id: str
    email: EmailStr
    is_active: bool = True
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    user_type: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
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
    # Add role and user_type fields which are crucial for profile completion
    role: Optional[str] = None
    user_type: Optional[str] = None
    # Use correct column names with underscores
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    class Config:
        from_attributes = True 
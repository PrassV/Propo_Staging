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
    role: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """ Fields allowed for user profile update """
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    # Add address fields if they are stored in the user profile table
    # address_line1: Optional[str] = None
    # address_line2: Optional[str] = None
    # city: Optional[str] = None
    # state: Optional[str] = None
    # pincode: Optional[str] = None

    class Config:
        from_attributes = True 
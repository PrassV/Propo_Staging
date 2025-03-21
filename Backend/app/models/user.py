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
"""
CRUD operations for property model.
"""
from typing import Dict, List, Any, Optional
from ..db import properties as property_db

class CRUDProperty:
    """
    CRUD operations for Property model.
    This class provides an interface for property CRUD operations.
    """
    
    @staticmethod
    async def get_properties(
        user_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = 'created_at',
        sort_order: Optional[str] = 'desc',
        property_type: Optional[str] = None,
        city: Optional[str] = None,
        pincode: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all properties with filters, sorting, and pagination."""
        return await property_db.get_properties(
            user_id=user_id,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            property_type=property_type,
            city=city,
            pincode=pincode
        )

    @staticmethod
    async def get_property_by_id(property_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific property by ID"""
        return await property_db.get_property_by_id(property_id)

    @staticmethod
    async def create_property(property_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new property"""
        return await property_db.create_property(property_data)

    @staticmethod
    async def update_property(
        property_id: str,
        property_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update a property"""
        return await property_db.update_property(property_id, property_data)

    @staticmethod
    async def delete_property(property_id: str) -> bool:
        """Delete a property"""
        return await property_db.delete_property(property_id)

    @staticmethod
    async def get_units_for_property(property_id: str) -> List[str]:
        """Get distinct unit numbers for a specific property."""
        return await property_db.get_units_for_property(property_id)

    @staticmethod
    async def get_documents_for_property(property_id: str) -> List[Dict[str, Any]]:
        """Get documents for a specific property."""
        return await property_db.get_documents_for_property(property_id)

    @staticmethod
    async def add_document_to_property(
        property_id: str, 
        document_type: str, 
        document_url: str
    ) -> Optional[Dict[str, Any]]:
        """Add a document to a specific property."""
        return await property_db.add_document_to_property(property_id, document_type, document_url) 
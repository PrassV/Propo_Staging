from typing import Dict, List, Any, Optional, Union, Tuple
from .database import supabase_client
from .cache import cached

class DatabaseOperations:
    """Enhanced database operations with caching support"""
    
    @staticmethod
    @cached(ttl_seconds=60)
    async def get_by_id(table: str, id: str) -> Dict[str, Any]:
        """Get a record by ID with caching"""
        response = supabase_client.table(table).select("*").eq("id", id).execute()
        
        if not response.data:
            return {"success": False, "error": f"No {table} record found with id {id}"}
        
        return {"success": True, "data": response.data[0]}
    
    @staticmethod
    async def create(table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new record"""
        response = supabase_client.table(table).insert(data).execute()
        
        if not response.data:
            return {"success": False, "error": f"Failed to create {table} record"}
        
        return {"success": True, "data": response.data[0]}
    
    @staticmethod
    async def update(table: str, id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a record by ID"""
        response = supabase_client.table(table).update(data).eq("id", id).execute()
        
        if not response.data:
            return {"success": False, "error": f"Failed to update {table} record with id {id}"}
        
        return {"success": True, "data": response.data[0]}
    
    @staticmethod
    async def delete_by_id(table: str, id: str) -> Dict[str, Any]:
        """Delete a record by ID"""
        response = supabase_client.table(table).delete().eq("id", id).execute()
        
        if not response.data:
            return {"success": False, "error": f"Failed to delete {table} record with id {id}"}
        
        return {"success": True, "data": response.data[0]}
    
    @staticmethod
    @cached(ttl_seconds=30)
    async def query(
        table: str,
        select: str = "*", 
        filters: Optional[List[Tuple[str, str, Any]]] = None,
        order: Optional[Tuple[str, str]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Enhanced query function with caching
        
        Args:
            table: Table name
            select: Select string (default: "*")
            filters: List of filter tuples (column, operator, value)
                Example: [("status", "eq", "active"), ("created_at", "gt", "2023-01-01")]
            order: Tuple of (column, direction)
                Example: ("created_at", "desc")
            limit: Number of records to return
            offset: Number of records to skip
        """
        # Start with basic query
        query = supabase_client.table(table).select(select)
        
        # Apply filters
        if filters:
            for column, operator, value in filters:
                if operator == "eq":
                    query = query.eq(column, value)
                elif operator == "neq":
                    query = query.neq(column, value)
                elif operator == "gt":
                    query = query.gt(column, value)
                elif operator == "lt":
                    query = query.lt(column, value)
                elif operator == "gte":
                    query = query.gte(column, value)
                elif operator == "lte":
                    query = query.lte(column, value)
                elif operator == "like":
                    query = query.like(column, value)
                elif operator == "ilike":
                    query = query.ilike(column, value)
                elif operator == "in":
                    query = query.in_(column, value)
                elif operator == "contains":
                    query = query.contains(column, value)
        
        # Apply ordering
        if order:
            column, direction = order
            query = query.order(column, {"ascending": direction.lower() == "asc"})
        
        # Apply pagination
        if limit:
            query = query.limit(limit)
        
        if offset:
            query = query.offset(offset)
        
        # Execute query
        response = query.execute()
        
        return {
            "success": True,
            "data": response.data,
            "count": len(response.data)
        }
    
    @staticmethod
    async def batch_operation(operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Perform batch operations (multiple inserts, updates, deletes)
        
        Args:
            operations: List of operation dictionaries
                Each operation should have:
                - type: "insert", "update", or "delete"
                - table: Table name
                - data: Data to insert or update (for insert/update)
                - filters: Filters for update/delete
        """
        results = []
        
        for operation in operations:
            op_type = operation.get("type")
            table = operation.get("table")
            
            if not op_type or not table:
                results.append({"success": False, "error": "Missing operation type or table"})
                continue
            
            try:
                if op_type == "insert":
                    data = operation.get("data", {})
                    response = supabase_client.table(table).insert(data).execute()
                    results.append({"success": True, "data": response.data})
                
                elif op_type == "update":
                    data = operation.get("data", {})
                    filters = operation.get("filters", [])
                    
                    query = supabase_client.table(table).update(data)
                    
                    for column, operator, value in filters:
                        if operator == "eq":
                            query = query.eq(column, value)
                        # Add other operators as needed
                    
                    response = query.execute()
                    results.append({"success": True, "data": response.data})
                
                elif op_type == "delete":
                    filters = operation.get("filters", [])
                    
                    query = supabase_client.table(table).delete()
                    
                    for column, operator, value in filters:
                        if operator == "eq":
                            query = query.eq(column, value)
                        # Add other operators as needed
                    
                    response = query.execute()
                    results.append({"success": True, "data": response.data})
                
                else:
                    results.append({"success": False, "error": f"Unknown operation type: {op_type}"})
            
            except Exception as e:
                results.append({"success": False, "error": str(e)})
        
        return {"success": True, "results": results}

# Create instance for easy import
db_ops = DatabaseOperations() 
from fastapi import APIRouter, HTTPException, Query, Body, Depends, Request
from typing import Dict, List, Any, Optional
import json

# Import our database operations
from shared.database_ops import db_ops
from shared.cache import clear_cache

# Create router
router = APIRouter(
    prefix="/data",
    tags=["data"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{table}/{id}")
async def get_record(
    table: str,
    id: str
):
    """Get a record by ID with caching"""
    result = await db_ops.get_by_id(table, id)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", f"Record not found in {table}"))
    
    return result

@router.post("/{table}")
async def create_record(
    table: str,
    data: Dict[str, Any] = Body(...)
):
    """Create a new record"""
    result = await db_ops.create(table, data)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", f"Failed to create record in {table}"))
    
    return result

@router.put("/{table}/{id}")
async def update_record(
    table: str,
    id: str,
    data: Dict[str, Any] = Body(...)
):
    """Update a record by ID"""
    result = await db_ops.update(table, id, data)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", f"Failed to update record in {table}"))
    
    # Clear cache for this table
    clear_cache(f"shared.database_ops.get_by_id.{table}")
    
    return result

@router.delete("/{table}/{id}")
async def delete_record(
    table: str,
    id: str
):
    """Delete a record by ID"""
    result = await db_ops.delete_by_id(table, id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", f"Failed to delete record in {table}"))
    
    # Clear cache for this table
    clear_cache(f"shared.database_ops.get_by_id.{table}")
    
    return result

@router.post("/{table}/query")
async def query_table(
    table: str,
    select: str = Body("*"),
    filters: Optional[List[List[Any]]] = Body(None),
    order: Optional[List[str]] = Body(None),
    limit: Optional[int] = Body(None),
    offset: Optional[int] = Body(None)
):
    """
    Advanced query endpoint
    
    Example request body:
    ```
    {
        "select": "*",
        "filters": [["status", "eq", "active"], ["created_at", "gt", "2023-01-01"]],
        "order": ["created_at", "desc"],
        "limit": 10,
        "offset": 0
    }
    ```
    """
    # Convert filters to tuple format
    filter_tuples = None
    if filters:
        filter_tuples = [(f[0], f[1], f[2]) for f in filters]
    
    # Convert order to tuple format
    order_tuple = None
    if order and len(order) == 2:
        order_tuple = (order[0], order[1])
    
    result = await db_ops.query(
        table=table,
        select=select,
        filters=filter_tuples,
        order=order_tuple,
        limit=limit,
        offset=offset
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", f"Query failed for {table}"))
    
    return result

@router.post("/batch")
async def batch_operations(
    operations: List[Dict[str, Any]] = Body(...)
):
    """
    Perform batch operations
    
    Example request body:
    ```
    [
        {
            "type": "insert",
            "table": "properties",
            "data": {"name": "New Property", "address": "123 Main St"}
        },
        {
            "type": "update",
            "table": "tenants",
            "data": {"status": "active"},
            "filters": [["id", "eq", "tenant-123"]]
        }
    ]
    ```
    """
    result = await db_ops.batch_operation(operations)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail="Batch operation failed")
    
    return result

@router.post("/clear-cache")
async def clear_cache_endpoint(
    prefix: Optional[str] = Body(None)
):
    """Clear cache entries with optional prefix"""
    result = clear_cache(prefix)
    return {"message": "Cache cleared", "details": result} 
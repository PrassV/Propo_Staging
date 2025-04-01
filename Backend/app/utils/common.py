from fastapi import Query

class PaginationParams:
    """Dependency for common pagination query parameters (skip, limit)."""
    def __init__(
        self,
        skip: int = Query(0, ge=0, description="Number of items to skip"),
        limit: int = Query(10, ge=1, le=100, description="Maximum number of items to return")
    ):
        self.skip = skip
        self.limit = limit

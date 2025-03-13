import time
from functools import wraps
from typing import Dict, Any, Callable, Optional
import json
import hashlib

# Simple in-memory cache
_cache: Dict[str, Dict[str, Any]] = {}

def cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a cache key from function arguments"""
    # Create a string representation of args and kwargs
    key_parts = [prefix]
    if args:
        key_parts.append(str(args))
    if kwargs:
        # Sort kwargs by key to ensure consistent ordering
        key_parts.append(str(sorted(kwargs.items())))
    
    # Create a hash of the key parts
    key_str = "".join(key_parts)
    return hashlib.md5(key_str.encode()).hexdigest()

def cached(ttl_seconds: int = 300):
    """
    Decorator for caching function results
    
    Args:
        ttl_seconds: Time to live in seconds (default: 300 seconds = 5 minutes)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            prefix = f"{func.__module__}.{func.__name__}"
            key = cache_key(prefix, *args, **kwargs)
            
            # Check if result is in cache and not expired
            now = time.time()
            if key in _cache and _cache[key]["expires_at"] > now:
                return _cache[key]["data"]
            
            # Call the function and cache the result
            result = await func(*args, **kwargs)
            _cache[key] = {
                "data": result,
                "expires_at": now + ttl_seconds
            }
            
            return result
        return wrapper
    return decorator

def clear_cache(prefix: Optional[str] = None):
    """
    Clear cache entries
    
    Args:
        prefix: Optional prefix to clear only specific entries
    """
    global _cache
    if prefix:
        # Clear only entries that start with the prefix
        keys_to_remove = [k for k in _cache.keys() if k.startswith(prefix)]
        for key in keys_to_remove:
            del _cache[key]
    else:
        # Clear all cache
        _cache = {}
    
    return {"cleared_entries_count": len(_cache)} 
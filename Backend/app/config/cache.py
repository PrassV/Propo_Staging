"""
Cache configuration and utilities for the Property Management API.
Provides Redis-based caching with in-memory fallback.
"""

import logging
import json
import asyncio
from functools import wraps
from typing import Any, Optional, Dict, Callable
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)

# Global cache storage (fallback when Redis is unavailable)
_memory_cache: Dict[str, Dict[str, Any]] = {}
_cache_initialized = False
_redis_client = None

class CacheService:
    """Cache service with Redis primary and memory fallback"""
    
    def __init__(self):
        self.redis_client = None
        self.memory_cache = {}
        self.enabled = True
    
    async def initialize(self):
        """Initialize Redis connection with fallback to memory cache"""
        global _cache_initialized, _redis_client
        
        if _cache_initialized:
            return
            
        try:
            # Try to import and setup Redis
            import redis.asyncio as redis
            from .settings import settings
            
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30
            )
            
            # Test Redis connection
            await self.redis_client.ping()
            _redis_client = self.redis_client
            logger.info("Redis cache initialized successfully")
            
        except Exception as e:
            logger.warning(f"Redis unavailable, using memory cache: {e}")
            self.redis_client = None
            _redis_client = None
        
        _cache_initialized = True
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if self.redis_client:
                value = await self.redis_client.get(key)
                if value:
                    return json.loads(value)
            else:
                # Memory cache fallback
                cache_entry = self.memory_cache.get(key)
                if cache_entry:
                    if cache_entry['expires_at'] > datetime.utcnow():
                        return cache_entry['value']
                    else:
                        # Expired, remove it
                        del self.memory_cache[key]
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL"""
        try:
            if self.redis_client:
                await self.redis_client.setex(key, ttl, json.dumps(value, default=str))
            else:
                # Memory cache fallback
                self.memory_cache[key] = {
                    'value': value,
                    'expires_at': datetime.utcnow() + timedelta(seconds=ttl)
                }
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
    
    async def delete(self, key: str):
        """Delete key from cache"""
        try:
            if self.redis_client:
                await self.redis_client.delete(key)
            else:
                self.memory_cache.pop(key, None)
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
    
    async def delete_pattern(self, pattern: str):
        """Delete keys matching pattern"""
        try:
            if self.redis_client:
                keys = await self.redis_client.keys(pattern)
                if keys:
                    await self.redis_client.delete(*keys)
            else:
                # Memory cache pattern deletion
                keys_to_delete = [k for k in self.memory_cache.keys() if pattern.replace('*', '') in k]
                for key in keys_to_delete:
                    self.memory_cache.pop(key, None)
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
    
    async def cleanup(self):
        """Cleanup expired entries from memory cache"""
        if not self.redis_client:
            now = datetime.utcnow()
            expired_keys = [
                key for key, entry in self.memory_cache.items()
                if entry['expires_at'] <= now
            ]
            for key in expired_keys:
                self.memory_cache.pop(key, None)
    
    async def close(self):
        """Close Redis connection"""
        try:
            if self.redis_client:
                await self.redis_client.close()
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")

# Global cache service instance
cache_service = CacheService()

def _generate_cache_key(func: Callable, args: tuple, kwargs: dict, key_prefix: str = "") -> str:
    """Generate a cache key from function name and arguments"""
    # Create a hash of the function arguments
    arg_str = str(args) + str(sorted(kwargs.items()))
    arg_hash = hashlib.md5(arg_str.encode()).hexdigest()[:10]
    
    # Combine prefix, function name, and argument hash
    func_name = f"{func.__module__}.{func.__name__}"
    if key_prefix:
        return f"{key_prefix}:{func_name}:{arg_hash}"
    return f"cache:{func_name}:{arg_hash}"

def cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results
    
    Args:
        ttl: Time to live in seconds (default 5 minutes)
        key_prefix: Optional prefix for cache key
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not cache_service.enabled:
                return await func(*args, **kwargs)
            
            # Generate cache key
            cache_key = _generate_cache_key(func, args, kwargs, key_prefix)
            
            # Try to get from cache first
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_service.set(cache_key, result, ttl)
            logger.debug(f"Cache miss, stored result for {cache_key}")
            
            return result
        return wrapper
    return decorator

def invalidate_cache(pattern: str):
    """
    Decorator to invalidate cache entries matching a pattern after function execution
    
    Args:
        pattern: Pattern to match (e.g., "property_*")
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Execute the original function first
                result = await func(*args, **kwargs)
                
                # Then invalidate cache if function succeeded
                await cache_service.delete_pattern(pattern)
                logger.debug(f"Invalidated cache pattern: {pattern}")
                
                return result
            except Exception as e:
                logger.error(f"Error in invalidate_cache wrapper: {e}")
                raise  # Re-raise the original exception
        return wrapper
    return decorator

async def invalidate_cache_pattern(pattern: str):
    """
    Utility function to manually invalidate cache entries matching a pattern
    
    Args:
        pattern: Pattern to match (e.g., "property_*")
    """
    try:
        await cache_service.delete_pattern(pattern)
        logger.debug(f"Invalidated cache pattern: {pattern}")
    except Exception as e:
        logger.error(f"Error invalidating cache pattern {pattern}: {e}")

async def startup_cache():
    """Initialize cache service on application startup"""
    try:
        await cache_service.initialize()
        logger.info("Cache service started successfully")
    except Exception as e:
        logger.error(f"Failed to start cache service: {e}")

async def shutdown_cache():
    """Cleanup cache service on application shutdown"""
    try:
        await cache_service.close()
        logger.info("Cache service shutdown successfully")
    except Exception as e:
        logger.error(f"Error during cache service shutdown: {e}")

# Background task to cleanup memory cache
async def cleanup_memory_cache():
    """Background task to cleanup expired memory cache entries"""
    while True:
        try:
            await cache_service.cleanup()
            await asyncio.sleep(300)  # Cleanup every 5 minutes
        except Exception as e:
            logger.error(f"Error during memory cache cleanup: {e}")
            await asyncio.sleep(60)  # Retry after 1 minute on error 
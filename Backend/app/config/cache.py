"""
Redis caching configuration and service
"""
import json
import pickle
import asyncio
from typing import Any, Optional, Union, Dict, List
from datetime import timedelta
import logging
from functools import wraps
import hashlib

try:
    import redis.asyncio as redis_lib
    REDIS_AVAILABLE = True
except ImportError:
    redis_lib = None
    REDIS_AVAILABLE = False

from .settings import settings

logger = logging.getLogger(__name__)

class CacheService:
    """Async Redis cache service with automatic serialization"""
    
    def __init__(self):
        self.redis_client: Optional[Any] = None
        self.default_ttl = 300  # 5 minutes
        self.enabled = REDIS_AVAILABLE
        
    async def connect(self):
        """Connect to Redis"""
        if not REDIS_AVAILABLE or not redis_lib:
            logger.warning("Redis not available, caching disabled")
            return
            
        try:
            redis_url = settings.REDIS_URL
            self.redis_client = redis_lib.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=False,  # We'll handle encoding ourselves
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Connected to Redis successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
            self.enabled = False
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            await self.redis_client.close()
            
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for storage"""
        try:
            # Try JSON first for simple types
            if isinstance(value, (dict, list, str, int, float, bool, type(None))):
                return json.dumps(value).encode('utf-8')
            else:
                # Use pickle for complex objects
                return pickle.dumps(value)
        except Exception:
            # Fallback to pickle
            return pickle.dumps(value)
    
    def _deserialize(self, value: bytes) -> Any:
        """Deserialize value from storage"""
        try:
            # Try JSON first
            return json.loads(value.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Fallback to pickle
            return pickle.loads(value)
    
    def _make_key(self, *args) -> str:
        """Create a cache key from arguments"""
        key_str = ":".join(str(arg) for arg in args)
        # Hash long keys to avoid Redis key length limits
        if len(key_str) > 250:
            return hashlib.sha256(key_str.encode()).hexdigest()
        return key_str
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis_client:
            return None
            
        try:
            value = await self.redis_client.get(key)
            if value is None:
                return None
            return self._deserialize(value)
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        if not self.redis_client:
            return False
            
        try:
            serialized = self._serialize(value)
            if ttl is None:
                ttl = self.default_ttl
            
            await self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        if not self.redis_client:
            return False
            
        try:
            await self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.redis_client:
            return 0
            
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self.redis_client:
            return False
            
        try:
            return bool(await self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False
    
    async def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment a counter"""
        if not self.redis_client:
            return None
            
        try:
            return await self.redis_client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Cache incr error for key {key}: {e}")
            return None
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration for key"""
        if not self.redis_client:
            return False
            
        try:
            return await self.redis_client.expire(key, ttl)
        except Exception as e:
            logger.error(f"Cache expire error for key {key}: {e}")
            return False
    
    # Batch operations
    async def mget(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values"""
        if not self.redis_client or not keys:
            return {}
            
        try:
            values = await self.redis_client.mget(keys)
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    result[key] = self._deserialize(value)
            return result
        except Exception as e:
            logger.error(f"Cache mget error: {e}")
            return {}
    
    async def mset(self, mapping: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Set multiple values"""
        if not self.redis_client or not mapping:
            return False
            
        try:
            pipe = self.redis_client.pipeline()
            for key, value in mapping.items():
                serialized = self._serialize(value)
                if ttl:
                    pipe.setex(key, ttl or self.default_ttl, serialized)
                else:
                    pipe.set(key, serialized)
            
            await pipe.execute()
            return True
        except Exception as e:
            logger.error(f"Cache mset error: {e}")
            return False

# Global cache instance
cache_service = CacheService()

# Cache decorators
def cache_result(ttl: int = 300, key_prefix: str = ""):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key
            cache_key = cache_service._make_key(
                key_prefix or func.__name__,
                *args,
                *sorted(kwargs.items())
            )
            
            # Try to get from cache
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            await cache_service.set(cache_key, result, ttl)
            logger.debug(f"Cached result for {func.__name__}")
            
            return result
        return wrapper
    return decorator

def invalidate_cache(pattern: str):
    """Decorator to invalidate cache patterns after function execution"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            await cache_service.delete_pattern(pattern)
            logger.debug(f"Invalidated cache pattern: {pattern}")
            return result
        return wrapper
    return decorator

# Startup/shutdown events
async def startup_cache():
    """Initialize cache on startup"""
    await cache_service.connect()

async def shutdown_cache():
    """Close cache on shutdown"""
    await cache_service.disconnect()
"""
Performance monitoring API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import logging

from ..config.auth import get_current_user
from ..utils.performance import perf_monitor, get_cache_stats
from ..config.cache import cache_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/performance/summary")
async def get_performance_summary(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get overall system performance summary"""
    try:
        summary = perf_monitor.get_performance_summary()
        cache_stats = await get_cache_stats()
        
        return {
            "performance": summary,
            "cache": cache_stats,
            "redis_connected": cache_service.redis_client is not None
        }
    except Exception as e:
        logger.error(f"Error getting performance summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get performance summary")

@router.post("/performance/clear-cache")
async def clear_cache(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """Clear all cache entries (admin only)"""
    try:
        if not cache_service.redis_client:
            raise HTTPException(status_code=503, detail="Redis not connected")
        
        # Clear all cache keys
        await cache_service.redis_client.flushall()
        
        logger.info(f"Cache cleared by user: {current_user.get('id')}")
        return {"message": "Cache cleared successfully"}
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")

@router.get("/performance/cache-keys")
async def list_cache_keys(
    pattern: str = "*",
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """List cache keys matching pattern"""
    try:
        if not cache_service.redis_client:
            raise HTTPException(status_code=503, detail="Redis not connected")
        
        keys = await cache_service.redis_client.keys(pattern)
        
        # Get TTL for each key
        key_info = []
        for key in keys[:50]:  # Limit to 50 keys to avoid overwhelming response
            ttl = await cache_service.redis_client.ttl(key)
            key_info.append({
                "key": key,
                "ttl": ttl if ttl > 0 else "No expiration"
            })
        
        return {
            "total_keys": len(keys),
            "displayed_keys": len(key_info),
            "keys": key_info
        }
        
    except Exception as e:
        logger.error(f"Error listing cache keys: {e}")
        raise HTTPException(status_code=500, detail="Failed to list cache keys")

@router.delete("/performance/cache-pattern/{pattern}")
async def delete_cache_pattern(
    pattern: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Delete cache keys matching pattern"""
    try:
        deleted_count = await cache_service.delete_pattern(pattern)
        
        logger.info(f"Deleted {deleted_count} cache keys matching pattern '{pattern}' by user: {current_user.get('id')}")
        return {
            "message": f"Deleted {deleted_count} cache entries",
            "pattern": pattern,
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error deleting cache pattern: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete cache pattern")

@router.get("/performance/slow-queries")
async def get_slow_queries(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get list of slowest API endpoints"""
    try:
        summary = perf_monitor.get_performance_summary()
        
        if "endpoints" not in summary:
            return {"slow_queries": []}
        
        # Sort by average duration
        slow_queries = sorted(
            summary["endpoints"].items(),
            key=lambda x: x[1]["avg_duration"],
            reverse=True
        )[:10]  # Top 10 slowest
        
        formatted_queries = []
        for endpoint, metrics in slow_queries:
            formatted_queries.append({
                "endpoint": endpoint,
                "avg_duration": f"{metrics['avg_duration']:.2f}s",
                "total_requests": metrics["total_requests"],
                "slow_requests": metrics["slow_requests"],
                "cache_hits": metrics["cache_hits"],
                "cache_hit_rate": f"{(metrics['cache_hits'] / metrics['total_requests'] * 100):.1f}%" if metrics['total_requests'] > 0 else "0%"
            })
        
        return {"slow_queries": formatted_queries}
        
    except Exception as e:
        logger.error(f"Error getting slow queries: {e}")
        raise HTTPException(status_code=500, detail="Failed to get slow queries")

@router.post("/performance/optimize")
async def suggest_optimizations(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get optimization suggestions based on current performance metrics"""
    try:
        summary = perf_monitor.get_performance_summary()
        suggestions = []
        
        # Analyze cache hit rate
        if "cache_hit_rate" in summary:
            hit_rate = float(summary["cache_hit_rate"].rstrip("%"))
            if hit_rate < 50:
                suggestions.append({
                    "type": "cache",
                    "priority": "high",
                    "message": f"Low cache hit rate ({hit_rate:.1f}%). Consider increasing cache TTL or adding more caching."
                })
            elif hit_rate > 90:
                suggestions.append({
                    "type": "cache",
                    "priority": "low",
                    "message": f"Excellent cache hit rate ({hit_rate:.1f}%)!"
                })
        
        # Analyze slow request rate
        if "slow_request_rate" in summary:
            slow_rate = float(summary["slow_request_rate"].rstrip("%"))
            if slow_rate > 10:
                suggestions.append({
                    "type": "performance",
                    "priority": "high",
                    "message": f"High slow request rate ({slow_rate:.1f}%). Consider database optimization or adding indexes."
                })
        
        # Analyze system resources
        if "system" in summary:
            memory_usage = summary["system"]["memory_usage_percent"]
            cpu_usage = summary["system"]["cpu_usage_percent"]
            
            if memory_usage > 80:
                suggestions.append({
                    "type": "system",
                    "priority": "medium",
                    "message": f"High memory usage ({memory_usage:.1f}%). Consider scaling up or optimizing memory usage."
                })
            
            if cpu_usage > 80:
                suggestions.append({
                    "type": "system", 
                    "priority": "medium",
                    "message": f"High CPU usage ({cpu_usage:.1f}%). Consider scaling horizontally or optimizing algorithms."
                })
        
        # Analyze endpoints for optimization opportunities
        if "endpoints" in summary:
            for endpoint, metrics in summary["endpoints"].items():
                if metrics["avg_duration"] > 3.0:
                    suggestions.append({
                        "type": "endpoint",
                        "priority": "high",
                        "message": f"Endpoint '{endpoint}' is very slow (avg: {metrics['avg_duration']:.2f}s). Consider optimization."
                    })
                elif metrics["cache_hits"] == 0 and metrics["total_requests"] > 10:
                    suggestions.append({
                        "type": "endpoint",
                        "priority": "medium", 
                        "message": f"Endpoint '{endpoint}' has no cache hits. Consider adding caching."
                    })
        
        if not suggestions:
            suggestions.append({
                "type": "general",
                "priority": "low",
                "message": "System performance looks good! No immediate optimizations needed."
            })
        
        return {
            "suggestions": suggestions,
            "analyzed_at": perf_monitor.metrics
        }
        
    except Exception as e:
        logger.error(f"Error generating optimization suggestions: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate optimization suggestions")
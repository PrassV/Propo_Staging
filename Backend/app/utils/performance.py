"""
Performance monitoring utilities
"""
import time
import logging
import psutil
from functools import wraps
from typing import Dict, Any, Optional
import asyncio
from ..config.cache import cache_service

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Monitor API performance metrics"""
    
    def __init__(self):
        self.metrics = {}
        self.slow_query_threshold = 2.0  # seconds
        
    def track_request(self, endpoint: str, duration: float, cache_hit: bool = False):
        """Track request performance metrics"""
        if endpoint not in self.metrics:
            self.metrics[endpoint] = {
                'total_requests': 0,
                'total_duration': 0,
                'cache_hits': 0,
                'slow_requests': 0,
                'avg_duration': 0
            }
        
        self.metrics[endpoint]['total_requests'] += 1
        self.metrics[endpoint]['total_duration'] += duration
        
        if cache_hit:
            self.metrics[endpoint]['cache_hits'] += 1
            
        if duration > self.slow_query_threshold:
            self.metrics[endpoint]['slow_requests'] += 1
            
        # Calculate average
        self.metrics[endpoint]['avg_duration'] = (
            self.metrics[endpoint]['total_duration'] / 
            self.metrics[endpoint]['total_requests']
        )
        
        # Log slow requests
        if duration > self.slow_query_threshold:
            logger.warning(f"Slow request: {endpoint} took {duration:.2f}s")
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get overall performance summary"""
        if not self.metrics:
            return {"message": "No metrics available"}
        
        total_requests = sum(m['total_requests'] for m in self.metrics.values())
        total_cache_hits = sum(m['cache_hits'] for m in self.metrics.values())
        total_slow_requests = sum(m['slow_requests'] for m in self.metrics.values())
        
        cache_hit_rate = (total_cache_hits / total_requests * 100) if total_requests > 0 else 0
        slow_request_rate = (total_slow_requests / total_requests * 100) if total_requests > 0 else 0
        
        # System metrics
        memory_usage = psutil.virtual_memory()
        cpu_usage = psutil.cpu_percent()
        
        return {
            'total_requests': total_requests,
            'cache_hit_rate': f"{cache_hit_rate:.1f}%",
            'slow_request_rate': f"{slow_request_rate:.1f}%",
            'endpoints': self.metrics,
            'system': {
                'memory_usage_percent': memory_usage.percent,
                'memory_available_gb': memory_usage.available / (1024**3),
                'cpu_usage_percent': cpu_usage
            }
        }

# Global performance monitor
perf_monitor = PerformanceMonitor()

def monitor_performance(endpoint: Optional[str] = None, check_cache: bool = True):
    """Decorator to monitor function performance"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            cache_hit = False
            
            # Check if this is a cached function call
            if check_cache and hasattr(func, '__name__'):
                cache_key = cache_service._make_key(func.__name__, *args, *kwargs.items())
                if await cache_service.exists(cache_key):
                    cache_hit = True
            
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                endpoint_name = endpoint or func.__name__
                perf_monitor.track_request(endpoint_name, duration, cache_hit)
                
        return wrapper
    return decorator

async def get_cache_stats() -> Dict[str, Any]:
    """Get Redis cache statistics"""
    if not cache_service.redis_client:
        return {"status": "Redis not connected"}
    
    try:
        info = await cache_service.redis_client.info()
        return {
            "connected_clients": info.get("connected_clients", 0),
            "used_memory": info.get("used_memory_human", "0B"),
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0),
            "total_commands_processed": info.get("total_commands_processed", 0),
            "cache_hit_rate": (
                info.get("keyspace_hits", 0) / 
                (info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0)) * 100
            ) if (info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0)) > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return {"error": str(e)}

def log_performance_summary():
    """Log performance summary to help identify bottlenecks"""
    summary = perf_monitor.get_performance_summary()
    
    logger.info("=== PERFORMANCE SUMMARY ===")
    logger.info(f"Total Requests: {summary['total_requests']}")
    logger.info(f"Cache Hit Rate: {summary['cache_hit_rate']}")
    logger.info(f"Slow Request Rate: {summary['slow_request_rate']}")
    logger.info(f"Memory Usage: {summary['system']['memory_usage_percent']:.1f}%")
    logger.info(f"CPU Usage: {summary['system']['cpu_usage_percent']:.1f}%")
    
    # Log slowest endpoints
    if summary['endpoints']:
        slowest = sorted(
            summary['endpoints'].items(), 
            key=lambda x: x[1]['avg_duration'], 
            reverse=True
        )[:5]
        
        logger.info("Slowest Endpoints:")
        for endpoint, metrics in slowest:
            logger.info(f"  {endpoint}: {metrics['avg_duration']:.2f}s avg")

# Periodic performance logging
async def schedule_performance_logging():
    """Schedule periodic performance logging"""
    while True:
        await asyncio.sleep(300)  # Log every 5 minutes
        log_performance_summary()

class QueryOptimizer:
    """Helper class to identify and optimize slow queries"""
    
    @staticmethod
    def analyze_query_performance(query_name: str, duration: float, result_count: int):
        """Analyze query performance and suggest optimizations"""
        suggestions = []
        
        if duration > 2.0:
            suggestions.append("Consider adding database indexes")
            suggestions.append("Consider implementing caching")
        
        if duration > 5.0:
            suggestions.append("Query is very slow - investigate N+1 problems")
            suggestions.append("Consider batch operations")
        
        if result_count > 1000:
            suggestions.append("Large result set - consider pagination")
            
        if suggestions:
            logger.warning(f"Query {query_name} took {duration:.2f}s for {result_count} results")
            for suggestion in suggestions:
                logger.warning(f"  Suggestion: {suggestion}")
    
    @staticmethod
    def suggest_batch_optimization(individual_queries: int):
        """Suggest batch optimization for multiple similar queries"""
        if individual_queries > 5:
            logger.warning(f"Detected {individual_queries} individual queries - consider batch operation")
            return True
        return False
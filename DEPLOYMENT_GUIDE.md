# Performance Optimization Deployment Guide

## Overview

This guide covers deploying the performance-optimized property management system with Redis caching, batch queries, and performance monitoring.

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.9+
- Redis server (local or remote)
- PostgreSQL (via Supabase)
- Git

### 2. Environment Setup

#### Option A: Fix Existing Virtual Environment
```bash
cd /workspace/Backend
deactivate  # If already in virtual environment
rm -rf bin/ lib/ include/
python3 -m venv .
source bin/activate
pip install -r requirements.txt
```

#### Option B: Fresh Virtual Environment
```bash
cd /workspace/Backend
python3 -m venv performance-env
source performance-env/bin/activate
pip install -r requirements.txt
```

### 3. Redis Setup

#### Local Redis (Development)
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# macOS
brew install redis
brew services start redis

# Test Redis connection
redis-cli ping  # Should return "PONG"
```

#### Redis Cloud (Production)
- Sign up for Redis Cloud, AWS ElastiCache, or similar
- Get connection URL (e.g., `redis://username:password@host:port/db`)

### 4. Environment Variables
```bash
# Create .env file in Backend directory
cat > .env << EOF
# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=your_jwt_secret_key
EOF

# Set permissions
chmod 600 .env
```

### 5. Start the Application
```bash
# Activate virtual environment
source bin/activate  # or source performance-env/bin/activate

# Start the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Or use the startup script
python app/main.py
```

## 📊 Performance Monitoring

### API Endpoints
Once deployed, access performance monitoring at:
- http://localhost:8000/api/v1/performance/summary
- http://localhost:8000/docs (FastAPI documentation)

### Key Metrics to Monitor
- **Cache Hit Rate**: Should be 70-90% for optimal performance
- **Response Times**: Should improve by 3-5x for cached endpoints
- **Slow Queries**: Monitor endpoints taking >2 seconds
- **System Resources**: CPU and memory usage

## 🔧 Configuration Options

### Redis Configuration
```python
# In settings.py (already configured)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# For production with authentication:
REDIS_URL = "redis://username:password@host:port/db"

# For Redis with SSL:
REDIS_URL = "rediss://username:password@host:port/db"
```

### Cache TTL Settings
```python
# Current cache durations (in seconds)
- Dashboard stats: 300 (5 minutes)
- Property lookups: 300 (5 minutes)
- Monthly revenue: 1800 (30 minutes)
- Batch operations: 600 (10 minutes)
```

## 🧪 Testing the Implementation

### 1. Basic Health Check
```bash
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

### 2. Performance Summary
```bash
curl http://localhost:8000/api/v1/performance/summary
# Expected: JSON with performance metrics and cache stats
```

### 3. Cache Functionality Test
```bash
# First request (cache miss)
time curl http://localhost:8000/api/v1/dashboard/stats

# Second request (cache hit - should be faster)
time curl http://localhost:8000/api/v1/dashboard/stats
```

### 4. Cache Management
```bash
# List cache keys
curl http://localhost:8000/api/v1/performance/cache-keys

# Clear cache
curl -X POST http://localhost:8000/api/v1/performance/clear-cache

# Get optimization suggestions
curl -X POST http://localhost:8000/api/v1/performance/optimize
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```bash
# Check Redis status
redis-cli ping

# Check Redis logs
sudo systemctl status redis-server
sudo journalctl -u redis-server

# Common solutions:
- Ensure Redis is running
- Check REDIS_URL in environment
- Verify firewall settings
```

#### 2. Import Errors
```bash
# Check virtual environment
which python
pip list | grep redis

# Reinstall dependencies
pip install -r requirements.txt
```

#### 3. Performance Issues
```bash
# Check slow queries
curl http://localhost:8000/api/v1/performance/slow-queries

# Monitor cache hit rate
curl http://localhost:8000/api/v1/performance/summary | grep cache_hit_rate
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Start with debug output
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug
```

## 📈 Performance Benchmarks

### Before Optimization
- Dashboard load: 2-5 seconds
- Property list: 1-3 seconds
- Database queries per request: 10-50
- Cache hit rate: 0%

### After Optimization (Expected)
- Dashboard load: 0.5-1 second
- Property list: 0.2-0.5 seconds
- Database queries per request: 1-5
- Cache hit rate: 70-90%

## 🚢 Production Deployment

### Docker Deployment
```dockerfile
# Dockerfile (create in Backend directory)
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Start application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables for Production
```bash
# Required environment variables
SUPABASE_URL=your_production_supabase_url
SUPABASE_KEY=your_production_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
SUPABASE_JWT_SECRET=your_production_jwt_secret
JWT_SECRET_KEY=your_production_jwt_secret_key
REDIS_URL=your_production_redis_url
LOG_LEVEL=INFO
```

### Performance Monitoring in Production
- Set up alerts for cache hit rate < 50%
- Monitor slow queries and optimize as needed
- Use Redis monitoring tools for cache performance
- Set up log aggregation for performance analytics

## 📚 Additional Resources

### Redis Commands for Management
```bash
# Monitor Redis in real-time
redis-cli monitor

# Get Redis info
redis-cli info

# Flush all cache
redis-cli flushall

# Get specific key
redis-cli get "key_name"

# Set expiration
redis-cli expire "key_name" 3600
```

### Performance Optimization Tips
1. **Cache Warming**: Pre-load frequently accessed data
2. **TTL Tuning**: Adjust cache durations based on data change frequency
3. **Query Optimization**: Use the batch query functions for related data
4. **Resource Monitoring**: Keep an eye on Redis memory usage
5. **Horizontal Scaling**: Consider Redis clustering for high load

The performance optimization system is now ready for deployment and should provide significant improvements in response times and system efficiency!
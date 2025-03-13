from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import time
import os
from starlette.middleware.base import BaseHTTPMiddleware

# Import configuration
from config.settings import (
    API_TITLE, 
    API_DESCRIPTION, 
    API_VERSION, 
    CORS_ORIGINS,
    DEBUG
)

# Import service routers
from services.agreements.router import router as agreements_router
from services.properties.router import router as properties_router
from services.invitations.router import router as invitations_router
from services.analytics.router import router as analytics_router
from services.maintenance.router import router as maintenance_router
from services.payments.router import router as payments_router
from services.estimation.router import router as estimation_router
# Import our new routers
from services.storage.router import router as storage_router
from services.data.router import router as data_router

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION
)

# Add a print statement to debug CORS origins
print(f"Configuring CORS with allowed origins: {CORS_ORIGINS}")

# Create a custom CORS middleware instead of using the built-in one
class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            # Get the origin from the request headers
            origin = request.headers.get("origin")
            
            # Check if the origin is allowed
            if origin in CORS_ORIGINS or "*" in CORS_ORIGINS:
                # Create a custom response with CORS headers
                headers = {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "86400",  # 24 hours
                }
                return Response(status_code=200, headers=headers)
        
        # Handle regular requests
        response = await call_next(request)
        
        # Add CORS headers to all responses
        origin = request.headers.get("origin")
        if origin in CORS_ORIGINS or "*" in CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response

# Add middleware
app.add_middleware(CustomCORSMiddleware)

# Add a logging middleware
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        # Calculate request processing time
        process_time = time.time() - start_time
        
        # Log request details
        print(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
        
        return response

# Add middleware
app.add_middleware(LoggingMiddleware)

# Include all the routers
app.include_router(properties_router)
app.include_router(invitations_router)
app.include_router(agreements_router)
app.include_router(analytics_router)
app.include_router(maintenance_router)
app.include_router(payments_router)
app.include_router(estimation_router)
# Include new routers
app.include_router(storage_router)
app.include_router(data_router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Property Management API",
        "version": API_VERSION,
        "documentation": "/docs"
    }

@app.get("/cors-test")
async def cors_test():
    return {"message": "CORS is working correctly"}

# Make router for health check and API info
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "api_version": API_VERSION,
        "environment": os.getenv("ENVIRONMENT", "development")
    }

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    print(f"Starting up {API_TITLE} API v{API_VERSION}")

@app.on_event("shutdown")
async def shutdown_event():
    print(f"Shutting down {API_TITLE} API v{API_VERSION}")

if __name__ == "__main__":
    import uvicorn
    
    # Set CORS log level to debug
    # uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
    uvicorn.run(app, host="0.0.0.0", port=8000) 
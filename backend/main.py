from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import time
import os
from starlette.middleware.base import BaseHTTPMiddleware
import traceback

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

# Use FastAPI's built-in CORS middleware instead of custom middleware
# This is more reliable and well-tested
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add a logging middleware
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        try:
            # Try to process the request
            response = await call_next(request)
            
            # Calculate request processing time
            process_time = time.time() - start_time
            
            # Log request details
            print(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
            
            return response
        except Exception as e:
            # Log the exception with traceback
            process_time = time.time() - start_time
            print(f"ERROR processing {request.method} {request.url.path} after {process_time:.4f}s:")
            print(f"Exception: {str(e)}")
            print(traceback.format_exc())
            
            # Return a 500 response with error details
            error_message = str(e) if DEBUG else "Internal server error"
            return Response(
                content=f'{{"error": "{error_message}"}}',
                status_code=500,
                media_type="application/json"
            )

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
    """Root endpoint for API health check"""
    try:
        return {
            "status": "ok",
            "message": "API is running",
            "version": API_VERSION
        }
    except Exception as e:
        # Log any error that might occur
        print(f"Error in root endpoint: {str(e)}")
        return {"status": "error", "message": str(e)}

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

# Error handler for unhandled exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the exception
    print(f"Global exception handler caught: {str(exc)}")
    print(traceback.format_exc())
    
    # Return a JSON response with error details
    error_message = str(exc) if DEBUG else "Internal server error"
    return Response(
        content=f'{{"error": "{error_message}"}}',
        status_code=500,
        media_type="application/json"
    )

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
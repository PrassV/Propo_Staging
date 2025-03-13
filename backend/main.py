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
            
            # If the origin is allowed, create a custom response
            if origin and (origin in CORS_ORIGINS or "*" in CORS_ORIGINS):
                headers = {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "3600",
                    "Content-Length": "0",
                    "Content-Type": "text/plain"
                }
                
                # Log that we're handling a preflight request
                print(f"Handling preflight request from origin: {origin}")
                
                # Return the response directly without calling the rest of the application
                return Response(status_code=200, headers=headers)
        
        # For non-OPTIONS requests, proceed to the next middleware or route handler
        response = await call_next(request)
        
        # Add CORS headers to the response
        origin = request.headers.get("origin")
        if origin and (origin in CORS_ORIGINS or "*" in CORS_ORIGINS):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            
            # Add Vary header to tell proxies that responses vary based on Origin
            response.headers["Vary"] = "Origin"
        
        return response

# Add the custom CORS middleware first
app.add_middleware(CustomCORSMiddleware)

# Add a request logging middleware for debugging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log the request details in debug mode
    if DEBUG:
        print(f"\n--- Request: {request.method} {request.url} ---")
        print(f"Request Headers: {dict(request.headers)}")
    
    # Process the request
    response = await call_next(request)
    
    # Log response details in debug mode
    if DEBUG:
        process_time = time.time() - start_time
        print(f"--- Response: {response.status_code} (took {process_time:.4f}s) ---")
        print(f"Response Headers: {dict(response.headers)}")
    
    return response

# Include routers with appropriate prefixes and tags
app.include_router(agreements_router, prefix="/agreements", tags=["Agreements"])
app.include_router(properties_router, prefix="/properties", tags=["Properties"])
app.include_router(invitations_router, prefix="/invitations", tags=["Invitations"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(maintenance_router, prefix="/maintenance", tags=["Maintenance"])
app.include_router(payments_router, prefix="/payments", tags=["Payments"])
app.include_router(estimation_router, prefix="/estimation", tags=["Estimation"])

@app.get("/")
async def root():
    return {
        "message": "Propify API is running",
        "version": API_VERSION,
        "endpoints": [
            "/agreements",
            "/properties", 
            "/invitations",
            "/analytics",
            "/maintenance",
            "/payments",
            "/estimation"
        ]
    }

# Add a special endpoint for CORS testing
@app.get("/cors-test")
async def cors_test():
    return {
        "message": "CORS is working if you can see this message",
        "timestamp": time.time()
    }

if __name__ == "__main__":
    import uvicorn
    
    # Set CORS log level to debug
    # uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
    uvicorn.run(app, host="0.0.0.0", port=8000) 
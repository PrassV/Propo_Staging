from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import time

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type", 
        "Authorization", 
        "Accept", 
        "Origin", 
        "X-Requested-With",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Content-Length",
        "Accept-Encoding",
        "Connection",
        "Host",
        "Referer",
        "User-Agent",
        "Accept-Language",
        "Cache-Control",
        "X-CSRF-Token",
        "X-Api-Key"
    ],
    expose_headers=["Content-Length", "Content-Type", "Authorization"],
    max_age=3600,  # Cache preflight requests for 1 hour (increased from 10 minutes)
)

# Add middleware to log requests for debugging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log the incoming request
    if DEBUG:
        print(f"Request: {request.method} {request.url}")
        print(f"Request headers: {request.headers}")
    
    # Special handling for OPTIONS requests
    if request.method == "OPTIONS":
        response = Response(status_code=200)
        
        # Add CORS headers directly for OPTIONS requests
        origin = request.headers.get("origin")
        if origin and (origin in CORS_ORIGINS or "*" in CORS_ORIGINS):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Max-Age"] = "3600"
        
        return response
    
    # Process the request through normal middleware chain
    response = await call_next(request)
    
    # Log the response
    process_time = time.time() - start_time
    if DEBUG:
        print(f"Response: {response.status_code} (took {process_time:.4f}s)")
        print(f"Response headers: {response.headers}")
    
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
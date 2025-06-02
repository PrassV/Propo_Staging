from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from typing import Dict
import logging
import time
import os
import sys
from fastapi.exceptions import RequestValidationError

# Set ROOT_DIR for proper path resolution
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from .config.settings import settings
from .config.auth import get_current_user
from .api import (
    property,
    tenant,
    user,
    auth,
    dashboard,
    rent_estimation,
    maintenance,
    vendor,
    payment,
    agreement,
    document,
    reporting,
    notification,
    uploads,
    lease,
    units
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI application with proxy settings for Railway
app = FastAPI(
    title="Property Management API",
    description="API for managing properties, tenants, maintenance, payments, and agreements",
    version="1.0.0",
    root_path=os.getenv("ROOT_PATH", ""),  # Support for Railway proxy
)

# Add TrustedHost middleware for Railway deployment
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Railway handles host validation
)

# Configure CORS - make sure this is before any other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://propo-staging.vercel.app",  # Frontend staging URL
        "http://localhost:3000",            # Local development
        "http://localhost:5173",            # Vite dev server
        "*"                                 # Allow all origins as a fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Railway proxy headers middleware - CRITICAL FIX
@app.middleware("http")
async def railway_proxy_middleware(request: Request, call_next):
    # Handle Railway's HTTPS termination proxy headers
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host") 
    
    if forwarded_proto:
        request.scope["scheme"] = forwarded_proto
    if forwarded_host:
        request.scope["server"] = (forwarded_host, None)
        
    response = await call_next(request)
    return response

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")

    return response

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )

# Home route
@app.get("/", tags=["Home"])
async def home():
    return {
        "message": "Welcome to the Property Management API",
        "version": "1.0.0",
        "documentation": "/docs",
    }

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

# Protected route example
@app.get("/protected", tags=["Auth"])
async def protected_route(current_user: Dict = Depends(get_current_user)):
    return {"message": "This is a protected route", "user": current_user}

# Include routers
app.include_router(auth, prefix="/auth", tags=["Auth"])
app.include_router(user)
app.include_router(property)
app.include_router(units.router)
app.include_router(tenant)
app.include_router(lease)
app.include_router(dashboard)
app.include_router(rent_estimation, prefix="/rent_estimation", tags=["Rent Estimation"])
app.include_router(maintenance)
app.include_router(vendor)
app.include_router(payment)
app.include_router(agreement)
app.include_router(document, prefix="/documents", tags=["Documents"])
app.include_router(reporting, prefix="/reports", tags=["Reports"])
app.include_router(notification, prefix="/notifications", tags=["Notifications"])
app.include_router(uploads)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(
        f"Validation error for request {request.method} {request.url.path}: {exc.errors()}",
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
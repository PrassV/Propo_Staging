from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import configuration
from config.settings import (
    API_TITLE, 
    API_DESCRIPTION, 
    API_VERSION, 
    CORS_ORIGINS
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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
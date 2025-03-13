#!/bin/bash

# Kill any existing uvicorn processes
pkill -f uvicorn || true

# Navigate to the backend directory
cd backend

# Activate virtual environment if it exists
if [ -d "../.venv" ]; then
    source ../.venv/bin/activate
fi

# Run the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000 
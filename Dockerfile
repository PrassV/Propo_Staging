FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip and install dependencies
COPY Backend/requirements.txt ./Backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r Backend/requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000

# Move to the Backend directory
WORKDIR /app/Backend

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Command to run when container starts
CMD python -m uvicorn app.main:app --host=0.0.0.0 --port=${PORT:-8000} --timeout-keep-alive=300 
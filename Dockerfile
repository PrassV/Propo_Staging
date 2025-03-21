FROM python:3.10-slim

WORKDIR /app

# Copy requirements first to leverage Docker caching
COPY Backend/requirements.txt ./Backend/requirements.txt
RUN pip install -r Backend/requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000

# Move to the Backend directory
WORKDIR /app/Backend

# Command to run when container starts
CMD python -m uvicorn app.main:app --host=0.0.0.0 --port=${PORT:-8000} 
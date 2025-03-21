# Property Management Backend API

This is the FastAPI backend for the property management application. It provides API endpoints for managing properties, tenants, payments, and other features.

## Features

- Authentication using Supabase
- Property management endpoints (CRUD operations)
- Image upload functionality
- JWT token validation
- API versioning
- Complete error handling

## Tech Stack

- FastAPI - Modern, high-performance web framework
- Pydantic - Data validation
- Supabase - Storage and Authentication
- Python 3.11+
- Docker & Docker Compose for containerization

## Setup Instructions

### Environment Variables

Create a `.env` file with the following variables (see `.env.example`):

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
JWT_SECRET_KEY=your_jwt_secret_key
LOG_LEVEL=INFO
```

### Running Locally

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the server:
   ```
   uvicorn app.main:app --reload
   ```

3. Visit the API documentation at `http://localhost:8000/docs`

### Running with Docker

1. Build and run using Docker Compose:
   ```
   docker-compose up -d
   ```

2. Access the API at `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

- `app/`: Main application directory
  - `main.py`: Application entry point
  - `api/`: API routes and endpoints
  - `models/`: Pydantic models for data validation
  - `services/`: Business logic
  - `db/`: Database access layer for Supabase
  - `utils/`: Utility functions
  - `config/`: Configuration settings
- `tests/`: Test cases
- `Dockerfile`: Docker configuration
- `docker-compose.yml`: Service orchestration
- `requirements.txt`: Python dependencies 
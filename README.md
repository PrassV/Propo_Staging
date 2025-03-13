# Propify - Property Management Portal

Propify is a modern property management portal designed to streamline the rental agreement process, property listing management, and tenant-landlord communications.

## Project Structure

The project is organized into the following main components:

```
propify/
├── backend/              # Backend services (FastAPI)
│   ├── services/         # Domain-specific services
│   │   ├── agreements/   # Rental agreement generation
│   │   ├── properties/   # Property listing and management
│   │   ├── invitations/  # Tenant/landlord invitation system
│   │   ├── analytics/    # Property analytics
│   │   ├── maintenance/  # Maintenance request handling
│   │   ├── payments/     # Payment processing
│   │   └── estimation/   # Rent estimation
│   ├── shared/           # Shared utilities and database connectors
│   └── config/           # Configuration files and settings
├── src/                  # Frontend application (React)
│   ├── components/       # Reusable UI components
│   ├── pages/            # Application pages
│   ├── services/         # Frontend services
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   └── styles/           # CSS and styling files
└── mobile/               # Mobile application files
```

## Features

- Generate legal rental agreements with customizable templates
- Manage property listings with images and detailed information
- Handle tenant invitations and communications
- Process maintenance requests
- Track rental payments
- Generate property analytics and reports
- Estimate fair rental prices based on property features

## Technologies

### Backend
- FastAPI (Python)
- Supabase (Database)
- Claude by Anthropic (AI for agreement generation)

### Frontend
- React with TypeScript
- Tailwind CSS
- Vite

### Mobile
- Flutter

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- Flutter (for mobile development)

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv .venv`
3. Activate the environment:
   - Windows: `.venv\Scripts\activate`
   - Mac/Linux: `source .venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Set up environment variables (see `.env.example`)
6. Start the server: `uvicorn main:app --reload`

### Frontend Setup
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`

## API Documentation

The API documentation is available at `/docs` when the backend server is running.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Docker Deployment

To run the backend services using Docker:

```bash
cd backend
docker build -t propify-backend .
docker run -p 8000:8000 propify-backend
```

## License

This project is licensed under the MIT License. 
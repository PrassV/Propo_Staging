# Property Management System

## Project Overview

This is a full-stack property management system built with FastAPI and Supabase. The system allows property owners to manage their properties, units, tenants, and leases through a comprehensive web interface.

### Key Features

- **Property Management**: Create, view, update, and delete properties
- **Unit Management**: Track individual units within properties
- **Tenant Management**: Manage tenant information and leases
- **Financial Tracking**: Track rent payments, maintenance costs, and property taxes
- **Document Storage**: Store property and tenant-related documents

## Technical Architecture

### Backend

- **FastAPI**: REST API framework for building the backend services
- **Supabase**: PostgreSQL database with authentication and storage
- **Async Architecture**: Using Python's asyncio for non-blocking API calls

### Frontend

- **React**: Component-based UI library
- **Supabase JS Client**: Direct database access from frontend

## Current Development Focus

We're currently working on resolving issues related to the Supabase Python client integration in the tenant management module. Specifically:

1. **Issue**: Errors when adding tenants to properties due to Supabase client API usage
2. **Root Cause**: Incorrect usage of `await` with the Supabase client's `execute()` method, which returns a `SingleAPIResponse` object directly rather than a coroutine
3. **Secondary Issue**: Query chain structure with `maybe_single()` leading to `None` responses
4. **Fix Approach**: Correct API usage pattern and query structure for the Supabase Python client

## Supabase Integration Challenges

The Supabase Python client has some unique behaviors that differ from typical async Python libraries:

1. The `execute()` method returns a response object directly, not a coroutine, so it shouldn't be used with `await`
2. Methods like `maybe_single()` might need to be used in a specific order in the chain
3. Error handling needs to account for different response structures based on the query type

## Database Schema

Key tables in the system:

- `properties`: Stores property information (owner, address, type, etc.)
- `units`: Individual units within properties (apartment numbers, features, status)
- `tenants`: Tenant personal and contact information
- `property_tenant_link`: Maps tenants to properties/units (lease information)
- `payments`: Financial transactions related to properties
- `property_documents`: Documents related to properties
- `unit_amenities`: Features and amenities of specific units

## Development Setup

### Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 13+ (or Supabase account)
- Git

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/property-management.git
   cd property-management
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   cd Backend
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials and other settings
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd Frontend
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL and Supabase credentials
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations to set up your database schema:
   ```bash
   cd supabase
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

## API Documentation

### Authentication

#### POST /api/auth/register

Register a new user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "phone": "string"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "created_at": "datetime",
  "access_token": "string",
  "token_type": "bearer"
}
```

#### POST /api/auth/login

Login with existing credentials.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string"
  }
}
```

#### POST /api/auth/refresh

Refresh an expired token.

**Request Body:** None (JWT token in Authorization header)

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

#### POST /api/auth/logout

Logout and invalidate current token.

**Request Body:** None (JWT token in Authorization header)

**Response:** Status message

#### GET /api/auth/me

Get current user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "phone": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### PUT /api/auth/me

Update current user profile.

**Request Body:**
```json
{
  "name": "string",
  "phone": "string"
}
```

**Response:** Updated user object

#### POST /api/auth/reset-password/request

Request password reset.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response:** Status message

#### POST /api/auth/reset-password/confirm

Confirm password reset.

**Request Body:**
```json
{
  "token": "string",
  "new_password": "string"
}
```

**Response:** Status message

All API endpoints (except for login/register) require authentication with a JWT token.

- **Token Format**: Bearer token in Authorization header
- **Token Acquisition**: Login or register endpoint

### Properties API

#### GET /api/properties

Retrieve all properties owned by the authenticated user.

**Query Parameters:**
- `skip` (optional): Number of items to skip for pagination (default: 0)
- `limit` (optional): Maximum number of items to return (default: 100)
- `sort_by` (optional): Field to sort by (default: 'created_at')
- `sort_order` (optional): 'asc' or 'desc' (default: 'desc')
- `property_type` (optional): Filter by property type
- `city` (optional): Filter by city
- `pincode` (optional): Filter by pincode

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "owner_id": "string",
      "property_name": "string",
      "property_type": "string",
      "address": "string",
      "city": "string",
      "state": "string",
      "pincode": "string",
      "country": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 0
}
```

#### GET /api/properties/{property_id}

Retrieve a specific property by ID.

**Response:**
```json
{
  "id": "uuid",
  "owner_id": "string",
  "property_name": "string",
  "property_type": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "pincode": "string",
  "country": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "units": [
    {
      "id": "uuid",
      "property_id": "uuid",
      "unit_number": "string",
      "status": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

#### POST /api/properties

Create a new property.

**Request Body:**
```json
{
  "property_name": "string",
  "property_type": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "pincode": "string",
  "country": "string"
}
```

**Response:** The created property object.

#### PUT /api/properties/{property_id}

Update a property.

**Request Body:** Fields to update (same schema as POST, all fields optional)

**Response:** The updated property object.

#### DELETE /api/properties/{property_id}

Delete a property.

**Response:** Status message.

#### GET /api/properties/types

Get list of available property types.

**Response:**
```json
{
  "types": ["Apartment", "House", "Commercial", "Land"]
}
```

#### POST /api/properties/{property_id}/images

Upload images for a property.

**Request Body:** Multipart form data with images

**Response:**
```json
{
  "uploaded_images": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "property_id": "uuid",
      "created_at": "datetime"
    }
  ]
}
```

#### GET /api/properties/{property_id}/images

Get all images for a property.

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "property_id": "uuid",
      "created_at": "datetime"
    }
  ]
}
```

#### DELETE /api/properties/{property_id}/images/{image_id}

Delete a property image.

**Response:** Status message

#### GET /api/properties/{property_id}/stats

Get statistics for a specific property.

**Response:**
```json
{
  "property_id": "uuid",
  "total_units": 0,
  "occupied_units": 0,
  "vacant_units": 0,
  "total_income": 0,
  "total_expenses": 0,
  "net_income": 0
}
```

### Units API

#### GET /api/units

Retrieve all units owned by the authenticated user.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `status` (optional): Filter by unit status
- `skip`, `limit`, `sort_by`, `sort_order` (same as properties)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "property_id": "uuid",
      "unit_number": "string",
      "floor": "string",
      "size": 0,
      "bedrooms": 0,
      "bathrooms": 0,
      "status": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 0
}
```

#### GET /api/units/{unit_id}

Get details for a specific unit.

**Response:**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "unit_number": "string",
  "floor": "string",
  "size": 0,
  "bedrooms": 0,
  "bathrooms": 0,
  "status": "string",
  "rent_amount": 0,
  "deposit_amount": 0,
  "created_at": "datetime",
  "updated_at": "datetime",
  "current_tenant": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string"
  },
  "amenities": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string"
    }
  ]
}
```

#### POST /api/units

Create a new unit.

**Request Body:**
```json
{
  "property_id": "uuid",
  "unit_number": "string",
  "floor": "string",
  "size": 0,
  "bedrooms": 0,
  "bathrooms": 0,
  "status": "string",
  "rent_amount": 0,
  "deposit_amount": 0
}
```

**Response:** The created unit object.

#### PUT /api/units/{unit_id}

Update a unit.

**Request Body:** Fields to update (same schema as POST, all fields optional)

**Response:** The updated unit object.

#### DELETE /api/units/{unit_id}

Delete a unit.

**Response:** Status message.

#### GET /api/units/available

Get all available units (not currently leased).

**Query Parameters:** Same as GET /api/units

**Response:** Same format as GET /api/units

#### GET /api/units/{unit_id}/amenities

Get amenities for a specific unit.

**Response:**
```json
{
  "unit_id": "uuid",
  "amenities": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "created_at": "datetime"
    }
  ]
}
```

#### POST /api/units/{unit_id}/amenities

Add amenity to a unit.

**Request Body:**
```json
{
  "name": "string",
  "description": "string"
}
```

**Response:** The created amenity object.

#### DELETE /api/units/{unit_id}/amenities/{amenity_id}

Remove an amenity from a unit.

**Response:** Status message.

#### POST /api/units/{unit_id}/images

Upload images for a unit.

**Request Body:** Multipart form data with images

**Response:**
```json
{
  "uploaded_images": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "unit_id": "uuid",
      "created_at": "datetime"
    }
  ]
}
```

#### GET /api/units/{unit_id}/images

Get all images for a unit.

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "unit_id": "uuid",
      "created_at": "datetime"
    }
  ]
}
```

#### DELETE /api/units/{unit_id}/images/{image_id}

Delete a unit image.

**Response:** Status message

#### POST /api/units/{unit_id}/assign_tenant

Assign a tenant to a unit.

**Request Body:**
```json
{
  "tenant_id": "uuid",
  "start_date": "date",
  "end_date": "date",
  "rent_amount": 0,
  "deposit_amount": 0
}
```

**Response:** The created lease object.

### Tenants API

#### GET /api/tenants

Retrieve all tenants associated with properties owned by the authenticated user.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- Pagination parameters as above

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "phone": "string",
      "dob": "date",
      "gender": "string",
      "id_type": "string",
      "id_number": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 0
}
```

#### GET /api/tenants/{tenant_id}

Get details for a specific tenant.

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "phone": "string",
  "dob": "date",
  "gender": "string",
  "id_type": "string",
  "id_number": "string",
  "family_size": 0,
  "permanent_address": "string",
  "id_proof_url": "string",
  "university": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "leases": [
    {
      "id": "uuid",
      "unit_id": "uuid",
      "property_id": "uuid",
      "start_date": "date",
      "end_date": "date",
      "status": "string"
    }
  ]
}
```

#### POST /api/tenants

Create a new tenant and link to a property.

**Request Body:**
```json
{
  "name": "string",
  "phone": "string",
  "email": "string",
  "dob": "date",
  "gender": "string",
  "family_size": 0,
  "permanent_address": "string",
  "id_type": "string",
  "id_number": "string",
  "id_proof_url": "string",
  "rental_type": "string",
  "rental_frequency": "string",
  "rental_amount": 0,
  "advance_amount": 0,
  "rental_start_date": "date",
  "rental_end_date": "date",
  "lease_amount": 0,
  "lease_start_date": "date",
  "lease_end_date": "date",
  "maintenance_fee": 0,
  "notice_period_days": 0,
  "electricity_responsibility": "string",
  "water_responsibility": "string",
  "property_tax_responsibility": "string",
  "university": "string",
  "property_id": "uuid",
  "unit_number": "string",
  "tenancy_start_date": "date",
  "tenancy_end_date": "date"
}
```

**Response:** The created tenant object.

#### PUT /api/tenants/{tenant_id}

Update tenant information.

**Request Body:** Fields to update (same schema as POST, all fields optional)

**Response:** The updated tenant object.

#### DELETE /api/tenants/{tenant_id}

Delete a tenant.

**Response:** Status message.

#### GET /api/tenants/{tenant_id}/leases

Get all leases for a specific tenant.

**Response:**
```json
{
  "tenant_id": "uuid",
  "leases": [
    {
      "id": "uuid",
      "unit_id": "uuid",
      "property_id": "uuid",
      "start_date": "date",
      "end_date": "date",
      "rent_amount": 0,
      "deposit_amount": 0,
      "status": "string",
      "created_at": "datetime"
    }
  ]
}
```

#### POST /api/tenants/{tenant_id}/documents

Upload documents for a tenant.

**Request Body:** Multipart form data with documents

**Response:**
```json
{
  "uploaded_documents": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "tenant_id": "uuid",
      "document_type": "string",
      "created_at": "datetime"
    }
  ]
}
```

#### GET /api/tenants/{tenant_id}/documents

Get all documents for a tenant.

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "tenant_id": "uuid",
      "document_type": "string",
      "created_at": "datetime"
    }
  ]
}
```

#### DELETE /api/tenants/{tenant_id}/documents/{document_id}

Delete a tenant document.

**Response:** Status message

### Leases API

#### GET /api/leases

Get all leases for properties owned by the authenticated user.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `unit_id` (optional): Filter by unit ID
- `tenant_id` (optional): Filter by tenant ID
- `status` (optional): Filter by lease status
- `active` (optional): Filter for currently active leases
- Pagination parameters as above

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "property_id": "uuid",
      "unit_id": "uuid",
      "tenant_id": "uuid",
      "start_date": "date",
      "end_date": "date",
      "rent_amount": 0,
      "deposit_amount": 0,
      "payment_frequency": "string",
      "status": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 0
}
```

#### GET /api/leases/{lease_id}

Get details for a specific lease.

**Response:**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "unit_id": "uuid",
  "tenant_id": "uuid",
  "start_date": "date",
  "end_date": "date",
  "rent_amount": 0,
  "deposit_amount": 0,
  "payment_frequency": "string",
  "status": "string",
  "notice_period_days": 0,
  "created_at": "datetime",
  "updated_at": "datetime",
  "property": {
    "id": "uuid",
    "property_name": "string"
  },
  "unit": {
    "id": "uuid",
    "unit_number": "string"
  },
  "tenant": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string"
  },
  "payments": [
    {
      "id": "uuid",
      "amount": 0,
      "date": "date",
      "status": "string"
    }
  ],
  "documents": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "document_type": "string"
    }
  ]
}
```

#### POST /api/leases

Create a new lease.

**Request Body:**
```json
{
  "property_id": "uuid",
  "unit_id": "uuid",
  "tenant_id": "uuid",
  "start_date": "date",
  "end_date": "date",
  "rent_amount": 0,
  "deposit_amount": 0,
  "payment_frequency": "string",
  "notice_period_days": 0
}
```

**Response:** The created lease object.

#### PUT /api/leases/{lease_id}

Update a lease.

**Request Body:** Fields to update (same schema as POST, all fields optional)

**Response:** The updated lease object.

#### DELETE /api/leases/{lease_id}

Delete a lease.

**Response:** Status message.

#### POST /api/leases/{lease_id}/renew

Renew an existing lease.

**Request Body:**
```json
{
  "new_end_date": "date",
  "new_rent_amount": 0
}
```

**Response:** The renewed lease object.

#### POST /api/leases/{lease_id}/terminate

Terminate a lease early.

**Request Body:**
```json
{
  "termination_date": "date",
  "reason": "string"
}
```

**Response:** The updated lease object.

#### POST /api/leases/{lease_id}/documents

Upload documents for a lease.

**Request Body:** Multipart form data with documents

**Response:**
```json
{
  "uploaded_documents": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "lease_id": "uuid",
      "document_type": "string",
      "created_at": "datetime"
    }
  ]
}
```

#### GET /api/leases/{lease_id}/documents

Get all documents for a lease.

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "lease_id": "uuid",
      "document_type": "string",
      "created_at": "datetime"
    }
  ]
}
```

### Payments API

#### GET /api/payments

Get all payments for properties owned by the authenticated user.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `unit_id` (optional): Filter by unit ID
- `tenant_id` (optional): Filter by tenant ID
- `lease_id` (optional): Filter by lease ID
- `status` (optional): Filter by payment status
- `start_date` (optional): Filter by date range start
- `end_date` (optional): Filter by date range end
- Pagination parameters as above

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "property_id": "uuid",
      "unit_id": "uuid",
      "tenant_id": "uuid",
      "lease_id": "uuid",
      "amount": 0,
      "payment_date": "date",
      "payment_method": "string",
      "status": "string",
      "payment_type": "string",
      "reference_number": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 0
}
```

#### GET /api/payments/{payment_id}

Get details for a specific payment.

**Response:**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "unit_id": "uuid",
  "tenant_id": "uuid",
  "lease_id": "uuid",
  "amount": 0,
  "payment_date": "date",
  "payment_method": "string",
  "status": "string",
  "payment_type": "string",
  "reference_number": "string",
  "notes": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### POST /api/payments

Record a new payment.

**Request Body:**
```json
{
  "property_id": "uuid",
  "unit_id": "uuid",
  "tenant_id": "uuid",
  "lease_id": "uuid",
  "amount": 0,
  "payment_date": "date",
  "payment_method": "string",
  "payment_type": "string",
  "reference_number": "string",
  "notes": "string"
}
```

**Response:** The created payment object.

#### PUT /api/payments/{payment_id}

Update a payment record.

**Request Body:** Fields to update (same schema as POST, all fields optional)

**Response:** The updated payment object.

#### DELETE /api/payments/{payment_id}

Delete a payment record.

**Response:** Status message.

#### GET /api/payments/summary

Get payment summary statistics.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `period` (optional): Time period (monthly, quarterly, yearly)

**Response:**
```json
{
  "total_received": 0,
  "total_pending": 0,
  "total_overdue": 0,
  "payment_by_type": {
    "rent": 0,
    "deposit": 0,
    "maintenance": 0
  },
  "payment_by_method": {
    "cash": 0,
    "bank_transfer": 0,
    "credit_card": 0
  }
}
```

### Expenses API

#### GET /api/expenses

Get all expenses for properties owned by the authenticated user.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `unit_id` (optional): Filter by unit ID
- `category` (optional): Filter by expense category
- `start_date` (optional): Filter by date range start
- `end_date` (optional): Filter by date range end
- Pagination parameters as above

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "property_id": "uuid",
      "unit_id": "uuid",
      "amount": 0,
      "expense_date": "date",
      "category": "string",
      "description": "string",
      "vendor": "string",
      "receipt_url": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 0
}
```

#### GET /api/expenses/{expense_id}

Get details for a specific expense.

**Response:**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "unit_id": "uuid",
  "amount": 0,
  "expense_date": "date",
  "category": "string",
  "description": "string",
  "vendor": "string",
  "receipt_url": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### POST /api/expenses

Record a new expense.

**Request Body:**
```json
{
  "property_id": "uuid",
  "unit_id": "uuid",
  "amount": 0,
  "expense_date": "date",
  "category": "string",
  "description": "string",
  "vendor": "string"
}
```

**Response:** The created expense object.

#### PUT /api/expenses/{expense_id}

Update an expense record.

**Request Body:** Fields to update (same schema as POST, all fields optional)

**Response:** The updated expense object.

#### DELETE /api/expenses/{expense_id}

Delete an expense record.

**Response:** Status message.

#### POST /api/expenses/{expense_id}/receipt

Upload a receipt for an expense.

**Request Body:** Multipart form data with receipt image

**Response:**
```json
{
  "expense_id": "uuid",
  "receipt_url": "string"
}
```

### Documents API

#### GET /api/documents

Get all documents across all properties and entities.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `unit_id` (optional): Filter by unit ID
- `tenant_id` (optional): Filter by tenant ID
- `lease_id` (optional): Filter by lease ID
- `document_type` (optional): Filter by document type
- Pagination parameters as above

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "url": "string",
      "filename": "string",
      "document_type": "string",
      "property_id": "uuid",
      "unit_id": "uuid",
      "tenant_id": "uuid",
      "lease_id": "uuid",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 0
}
```

#### GET /api/documents/{document_id}

Get details for a specific document.

**Response:**
```json
{
  "id": "uuid",
  "url": "string",
  "filename": "string",
  "document_type": "string",
  "property_id": "uuid",
  "unit_id": "uuid",
  "tenant_id": "uuid",
  "lease_id": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### POST /api/documents

Upload a new document.

**Request Body:** Multipart form data with document file and metadata

**Response:** The created document object.

#### PUT /api/documents/{document_id}

Update document metadata.

**Request Body:**
```json
{
  "filename": "string",
  "document_type": "string"
}
```

**Response:** The updated document object.

#### DELETE /api/documents/{document_id}

Delete a document.

**Response:** Status message.

### Maintenance Requests API

#### GET /api/maintenance

Get all maintenance requests for properties owned by the authenticated user.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `unit_id` (optional): Filter by unit ID
- `tenant_id` (optional): Filter by tenant ID
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- Pagination parameters as above

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "property_id": "uuid",
      "unit_id": "uuid",
      "tenant_id": "uuid",
      "title": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "reported_date": "datetime",
      "scheduled_date": "datetime",
      "completed_date": "datetime",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 0
}
```

#### GET /api/maintenance/{request_id}

Get details for a specific maintenance request.

**Response:**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "unit_id": "uuid",
  "tenant_id": "uuid",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "reported_date": "datetime",
  "scheduled_date": "datetime",
  "completed_date": "datetime",
  "assigned_to": "string",
  "cost": 0,
  "notes": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "images": [
    {
      "id": "uuid",
      "url": "string"
    }
  ],
  "comments": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "text": "string",
      "created_at": "datetime"
    }
  ]
}
```

#### POST /api/maintenance

Create a new maintenance request.

**Request Body:**
```json
{
  "property_id": "uuid",
  "unit_id": "uuid",
  "tenant_id": "uuid",
  "title": "string",
  "description": "string",
  "priority": "string"
}
```

**Response:** The created maintenance request object.

#### PUT /api/maintenance/{request_id}

Update a maintenance request.

**Request Body:** Fields to update (same schema as POST, all fields optional)

**Response:** The updated maintenance request object.

#### DELETE /api/maintenance/{request_id}

Delete a maintenance request.

**Response:** Status message.

#### POST /api/maintenance/{request_id}/status

Update the status of a maintenance request.

**Request Body:**
```json
{
  "status": "string",
  "notes": "string",
  "completed_date": "datetime"
}
```

**Response:** The updated maintenance request object.

#### POST /api/maintenance/{request_id}/images

Upload images for a maintenance request.

**Request Body:** Multipart form data with images

**Response:**
```json
{
  "uploaded_images": [
    {
      "id": "uuid",
      "url": "string",
      "request_id": "uuid",
      "created_at": "datetime"
    }
  ]
}
```

#### POST /api/maintenance/{request_id}/comments

Add a comment to a maintenance request.

**Request Body:**
```json
{
  "text": "string"
}
```

**Response:** The created comment object.

### Reports API

#### GET /api/reports/financial

Generate a financial report.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `start_date`: Start date for report
- `end_date`: End date for report
- `report_type`: Type of report (income, expense, profit_loss, etc.)

**Response:**
```json
{
  "report_type": "string",
  "start_date": "date",
  "end_date": "date",
  "property_id": "uuid",
  "total_income": 0,
  "total_expenses": 0,
  "net_profit": 0,
  "income_breakdown": {
    "rent": 0,
    "other": 0
  },
  "expense_breakdown": {
    "maintenance": 0,
    "taxes": 0,
    "utilities": 0,
    "insurance": 0,
    "other": 0
  },
  "monthly_summary": [
    {
      "month": "string",
      "income": 0,
      "expenses": 0,
      "profit": 0
    }
  ]
}
```

#### GET /api/reports/occupancy

Generate an occupancy report.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `start_date`: Start date for report
- `end_date`: End date for report

**Response:**
```json
{
  "start_date": "date",
  "end_date": "date",
  "property_id": "uuid",
  "total_units": 0,
  "average_occupancy_rate": 0,
  "current_occupancy_rate": 0,
  "monthly_occupancy": [
    {
      "month": "string",
      "occupancy_rate": 0,
      "occupied_units": 0,
      "total_units": 0
    }
  ],
  "units_summary": [
    {
      "unit_id": "uuid",
      "unit_number": "string",
      "days_occupied": 0,
      "days_vacant": 0,
      "occupancy_rate": 0
    }
  ]
}
```

#### GET /api/reports/tenant

Generate a tenant report.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `report_type`: Type of report (turnover, demographics, etc.)

**Response:**
```json
{
  "report_type": "string",
  "property_id": "uuid",
  "total_tenants": 0,
  "active_tenants": 0,
  "average_lease_duration": 0,
  "turnover_rate": 0,
  "demographics": {
    "family_size": {
      "1": 0,
      "2": 0,
      "3+": 0
    },
    "gender": {
      "male": 0,
      "female": 0,
      "other": 0
    }
  }
}
```

#### GET /api/reports/custom

Generate a custom report based on specified parameters.

**Query Parameters:**
- `property_id` (optional): Filter by property ID
- `metrics`: Comma-separated list of metrics to include
- `dimensions`: Comma-separated list of dimensions to group by
- `start_date`: Start date for report
- `end_date`: End date for report

**Response:** Custom JSON structure based on request parameters

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: User doesn't have permission
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a JSON body:

```json
{
  "detail": "Error message describing the issue"
}
```

For validation errors, the response includes details about each validation failure:

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "Error message",
      "type": "validation_error_type"
    }
  ]
}
```

## Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows our style guidelines and includes appropriate tests. 
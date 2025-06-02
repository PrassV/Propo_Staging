# Property Management System API Endpoints

I'll provide a comprehensive list of endpoints needed for your property management portal, organized by functionality and persona access. This will include example payloads and responses for all required operations.

Create a complete FastAPI implementation for the 100 property management endpoints documented in API_doc.md, integrated with Supabase using Python 3.10+. Ensure zero-error implementation with these requirements:

Automated Testing Infrastructure:

Implement pytest with 100% endpoint coverage

Use async fixtures for database/Supabase setup

Include parameterized tests for all edge cases

Add role-based test scenarios (owner/tenant/maintenance/admin)

Implement CI/CD pipeline with GitHub Actions

Error Prevention Requirements:

Strict Pydantic validation for all request/response models

Database transaction rollback for failed operations

Automated request/response schema validation

Integration with Sentry/Prometheus for error monitoring

Comprehensive logging with structlog

Implementation Specifications:

# Sample endpoint structure
@router.post("/properties/{property_id}/units", 
            response_model=UnitResponse,
            dependencies=[Depends(check_owner_access)])
async def create_unit(unit_data: UnitCreate, 
                    db: AsyncSession = Depends(get_db)):
    """
    Create new unit in property
    - Validate property exists
    - Verify user has owner access
    - Generate unit_number if not provided
    - Handle image uploads to Supabase Storage
    """
    # Implementation logic here
    return created_unit


Testing Framework Requirements:

python
# Sample test structure
@pytest.mark.asyncio
async def test_create_property_success():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Authenticate as owner
        token = await get_owner_token()
        
        # Test valid creation
        response = await ac.post(
            "/api/properties",
            json=valid_property_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 201
        assert response.json()["name"] == valid_property_data["name"]
        
        # Test duplicate prevention
        duplicate_response = await ac.post(...)
        assert duplicate_response.status_code == 400
Required Architectural Components:

Layered architecture with repositories/services/routers

Dependency injection for database/Supabase clients

Redis caching for frequent queries

Rate limiting middleware

Automatic API documentation (Swagger/ReDoc)

Development Workflow:

Generate complete requirements.txt with pinned versions

Create Alembic migrations for the provided schema

Implement all endpoints in ordered batches (1-10, 11-20...)

Write parallel test modules for each batch

Add GitHub Actions workflow for:

Running tests on PRs

Security scanning

Coverage reporting

Container building

Validation Rules:

All endpoints must pass OpenAPI schema validation

100% test coverage enforced via coverage.py

Zero Pylint errors with strict scoring (9.5+/10)

All database operations through approved repositories

Environment-specific configurations (dev/staging/prod)

Deliverables:

Complete FastAPI application code

pytest test suite with 300+ test cases

Dockerfile and docker-compose.yml

CI/CD pipeline configuration

Postman collection with all endpoints

Architecture decision record (ADR) document

Critical Implementation Notes:

Use asyncpg for PostgreSQL access

Implement row-level security in Supabase

Handle Supabase storage errors gracefully

Add automated retry logic for database operations

Include faker-powered test data generation

Implement proper JWT invalidation workflow"

## Authentication & User Management

### 1. Register User
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Description**: Creates a new user account
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "555-123-4567",
  "role": "tenant" // One of: owner, tenant, maintenance, admin
}
```
- **Response** (201 Created):
```json
{
  "user_id": "usr_123456789",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "tenant",
  "created_at": "2025-04-30T12:00:00Z"
}
```

### 2. Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Description**: Authenticates a user and returns access tokens
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
- **Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "usr_123456789",
    "email": "user@example.com",
    "role": "tenant",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### 3. Refresh Token
- **Endpoint**: `POST /api/auth/refresh`
- **Access**: Authenticated Users
- **Description**: Generates new access token using refresh token
- **Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4. Logout
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Authenticated Users
- **Description**: Invalidates current tokens
- **Request Body**: None (uses Authorization header)
- **Response** (204 No Content)

### 5. Get User Profile
- **Endpoint**: `GET /api/users/me`
- **Access**: Authenticated Users
- **Description**: Retrieves current user profile
- **Response** (200 OK):
```json
{
  "user_id": "usr_123456789",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "555-123-4567",
  "role": "tenant",
  "profile_picture": "https://storage.example.com/profiles/usr_123456789.jpg",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T14:30:00Z"
}
```

### 6. Update User Profile
- **Endpoint**: `PATCH /api/users/me`
- **Access**: Authenticated Users
- **Description**: Updates user profile information
- **Request Body**:
```json
{
  "first_name": "Johnny",
  "phone": "555-987-6543",
  "profile_picture": "base64encodedimagedatahere..."
}
```
- **Response** (200 OK):
```json
{
  "user_id": "usr_123456789",
  "email": "user@example.com",
  "first_name": "Johnny",
  "last_name": "Doe",
  "phone": "555-987-6543",
  "profile_picture": "https://storage.example.com/profiles/usr_123456789.jpg",
  "updated_at": "2025-04-30T15:45:00Z"
}
```

### 7. Change Password
- **Endpoint**: `POST /api/users/me/password`
- **Access**: Authenticated Users
- **Description**: Updates user password
- **Request Body**:
```json
{
  "current_password": "SecurePassword123!",
  "new_password": "EvenMoreSecure456!"
}
```
- **Response** (204 No Content)

### 8. Request Password Reset
- **Endpoint**: `POST /api/auth/password-reset/request`
- **Access**: Public
- **Description**: Sends password reset email
- **Request Body**:
```json
{
  "email": "user@example.com"
}
```
- **Response** (204 No Content)

### 9. Confirm Password Reset
- **Endpoint**: `POST /api/auth/password-reset/confirm`
- **Access**: Public
- **Description**: Resets password using token from email
- **Request Body**:
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePassword789!"
}
```
- **Response** (204 No Content)

## Property Management

### 10. Create Property
- **Endpoint**: `POST /api/properties`
- **Access**: Owner, Admin
- **Description**: Creates a new property
- **Request Body**:
```json
{
  "name": "Sunset Apartments",
  "address": {
    "street": "123 Sunset Blvd",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210",
    "country": "USA"
  },
  "property_type": "apartment_building",
  "year_built": 1985,
  "total_units": 24,
  "amenities": ["pool", "gym", "parking"],
  "description": "Luxury apartment complex in downtown area",
  "property_image": "base64encodedimagedatahere..."
}
```
- **Response** (201 Created):
```json
{
  "property_id": "prop_123456789",
  "owner_id": "usr_123456789",
  "name": "Sunset Apartments",
  "address": {
    "street": "123 Sunset Blvd",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210",
    "country": "USA",
    "coordinates": {
      "latitude": 34.0522,
      "longitude": -118.2437
    }
  },
  "property_type": "apartment_building",
  "year_built": 1985,
  "total_units": 24,
  "available_units": 24,
  "amenities": ["pool", "gym", "parking"],
  "description": "Luxury apartment complex in downtown area",
  "property_image": "https://storage.example.com/properties/prop_123456789.jpg",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 11. List Properties
- **Endpoint**: `GET /api/properties`
- **Access**: 
  - Admin: All properties
  - Owner: Their properties
  - Tenant: Properties they're renting
  - Maintenance: Properties assigned to them
- **Description**: Lists properties with optional filtering
- **Query Parameters**: `page`, `limit`, `search`, `property_type`, `city`, `state`
- **Response** (200 OK):
```json
{
  "total": 45,
  "page": 1,
  "limit": 10,
  "properties": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments",
      "address": {
        "street": "123 Sunset Blvd",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90210"
      },
      "property_type": "apartment_building",
      "total_units": 24,
      "available_units": 3,
      "thumbnail": "https://storage.example.com/properties/prop_123456789_thumb.jpg"
    },
    // More properties...
  ]
}
```

### 12. Get Property Details
- **Endpoint**: `GET /api/properties/{property_id}`
- **Access**: Admin, Owner (of property), Tenant (of property), Maintenance (assigned)
- **Description**: Gets detailed information about a property
- **Response** (200 OK):
```json
{
  "property_id": "prop_123456789",
  "owner_id": "usr_123456789",
  "owner": {
    "user_id": "usr_123456789",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone": "555-987-6543"
  },
  "name": "Sunset Apartments",
  "address": {
    "street": "123 Sunset Blvd",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210",
    "country": "USA",
    "coordinates": {
      "latitude": 34.0522,
      "longitude": -118.2437
    }
  },
  "property_type": "apartment_building",
  "year_built": 1985,
  "total_units": 24,
  "available_units": 3,
  "occupied_units": 21,
  "amenities": ["pool", "gym", "parking"],
  "description": "Luxury apartment complex in downtown area",
  "images": [
    "https://storage.example.com/properties/prop_123456789_1.jpg",
    "https://storage.example.com/properties/prop_123456789_2.jpg"
  ],
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T15:30:00Z"
}
```

### 13. Update Property
- **Endpoint**: `PATCH /api/properties/{property_id}`
- **Access**: Owner (of property), Admin
- **Description**: Updates property information
- **Request Body**:
```json
{
  "name": "Sunset Luxury Apartments",
  "amenities": ["pool", "gym", "parking", "security"],
  "description": "Updated luxury apartment complex in downtown area"
}
```
- **Response** (200 OK):
```json
{
  "property_id": "prop_123456789",
  "name": "Sunset Luxury Apartments",
  "amenities": ["pool", "gym", "parking", "security"],
  "description": "Updated luxury apartment complex in downtown area",
  "updated_at": "2025-04-30T16:45:00Z"
}
```

### 14. Delete Property
- **Endpoint**: `DELETE /api/properties/{property_id}`
- **Access**: Owner (of property), Admin
- **Description**: Marks property as deleted (soft delete)
- **Response** (204 No Content)

### 15. Upload Property Images
- **Endpoint**: `POST /api/properties/{property_id}/images`
- **Access**: Owner (of property), Admin
- **Description**: Uploads images for a property
- **Request Body**: (multipart/form-data)
```
images[]: [file1]
images[]: [file2]
```
- **Response** (200 OK):
```json
{
  "property_id": "prop_123456789",
  "images": [
    "https://storage.example.com/properties/prop_123456789_3.jpg",
    "https://storage.example.com/properties/prop_123456789_4.jpg"
  ]
}
```

## Unit Management

### 16. Create Unit
- **Endpoint**: `POST /api/properties/{property_id}/units`
- **Access**: Owner (of property), Admin
- **Description**: Creates a new unit in a property
- **Request Body**:
```json
{
  "unit_number": "101",
  "floor": 1,
  "bedrooms": 2,
  "bathrooms": 1.5,
  "square_feet": 950,
  "rent_amount": 1800.00,
  "security_deposit": 1800.00,
  "status": "available",
  "amenities": ["dishwasher", "air_conditioning", "balcony"],
  "description": "Spacious 2-bedroom apartment with balcony",
  "unit_images": ["base64encodedimagedatahere...", "base64encodedimagedatahere..."]
}
```
- **Response** (201 Created):
```json
{
  "unit_id": "unit_123456789",
  "property_id": "prop_123456789",
  "unit_number": "101",
  "floor": 1,
  "bedrooms": 2,
  "bathrooms": 1.5,
  "square_feet": 950,
  "rent_amount": 1800.00,
  "security_deposit": 1800.00,
  "status": "available",
  "amenities": ["dishwasher", "air_conditioning", "balcony"],
  "description": "Spacious 2-bedroom apartment with balcony",
  "images": [
    "https://storage.example.com/units/unit_123456789_1.jpg",
    "https://storage.example.com/units/unit_123456789_2.jpg"
  ],
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 17. List Units
- **Endpoint**: `GET /api/properties/{property_id}/units`
- **Access**: 
  - Admin: All units
  - Owner: Units in their properties
  - Tenant: Units they're renting/applied for
  - Maintenance: Units in properties assigned to them
- **Description**: Lists units in a property with optional filtering
- **Query Parameters**: `page`, `limit`, `status`, `bedrooms`, `min_rent`, `max_rent`
- **Response** (200 OK):
```json
{
  "total": 24,
  "page": 1,
  "limit": 10,
  "units": [
    {
      "unit_id": "unit_123456789",
      "property_id": "prop_123456789",
      "unit_number": "101",
      "bedrooms": 2,
      "bathrooms": 1.5,
      "square_feet": 950,
      "rent_amount": 1800.00,
      "status": "available",
      "thumbnail": "https://storage.example.com/units/unit_123456789_thumb.jpg"
    },
    // More units...
  ]
}
```

### 18. Get Unit Details
- **Endpoint**: `GET /api/units/{unit_id}`
- **Access**: Admin, Owner (of property), Tenant (of unit), Maintenance (assigned)
- **Description**: Gets detailed information about a unit
- **Response** (200 OK):
```json
{
  "unit_id": "unit_123456789",
  "property_id": "prop_123456789",
  "property": {
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "unit_number": "101",
  "floor": 1,
  "bedrooms": 2,
  "bathrooms": 1.5,
  "square_feet": 950,
  "rent_amount": 1800.00,
  "security_deposit": 1800.00,
  "status": "occupied",
  "tenant": {
    "user_id": "usr_987654321",
    "first_name": "John",
    "last_name": "Doe"
  },
  "lease": {
    "lease_id": "lease_123456789",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31"
  },
  "amenities": ["dishwasher", "air_conditioning", "balcony"],
  "description": "Spacious 2-bedroom apartment with balcony",
  "images": [
    "https://storage.example.com/units/unit_123456789_1.jpg",
    "https://storage.example.com/units/unit_123456789_2.jpg"
  ],
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T15:30:00Z"
}
```

### 19. Update Unit
- **Endpoint**: `PATCH /api/units/{unit_id}`
- **Access**: Owner (of property), Admin
- **Description**: Updates unit information
- **Request Body**:
```json
{
  "rent_amount": 1850.00,
  "amenities": ["dishwasher", "air_conditioning", "balcony", "washer_dryer"],
  "description": "Updated spacious 2-bedroom apartment with balcony and washer/dryer"
}
```
- **Response** (200 OK):
```json
{
  "unit_id": "unit_123456789",
  "rent_amount": 1850.00,
  "amenities": ["dishwasher", "air_conditioning", "balcony", "washer_dryer"],
  "description": "Updated spacious 2-bedroom apartment with balcony and washer/dryer",
  "updated_at": "2025-04-30T16:45:00Z"
}
```

### 20. Delete Unit
- **Endpoint**: `DELETE /api/units/{unit_id}`
- **Access**: Owner (of property), Admin
- **Description**: Marks unit as deleted (soft delete)
- **Response** (204 No Content)

### 21. Upload Unit Images
- **Endpoint**: `POST /api/units/{unit_id}/images`
- **Access**: Owner (of property), Admin
- **Description**: Uploads images for a unit
- **Request Body**: (multipart/form-data)
```
images[]: [file1]
images[]: [file2]
```
- **Response** (200 OK):
```json
{
  "unit_id": "unit_123456789",
  "images": [
    "https://storage.example.com/units/unit_123456789_3.jpg",
    "https://storage.example.com/units/unit_123456789_4.jpg"
  ]
}
```

## Tenant Management

### 22. Create Tenant Application
- **Endpoint**: `POST /api/applications`
- **Access**: Tenant, Admin
- **Description**: Creates a new rental application
- **Request Body**:
```json
{
  "unit_id": "unit_123456789",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "555-123-4567",
  "current_address": {
    "street": "456 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "USA"
  },
  "employment": {
    "employer": "Tech Company",
    "position": "Software Engineer",
    "monthly_income": 8500,
    "start_date": "2023-05-15"
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "relationship": "Sister",
    "phone": "555-987-6543"
  },
  "move_in_date": "2025-06-01",
  "lease_term": 12,
  "pets": [
    {
      "type": "cat",
      "breed": "Domestic Shorthair",
      "weight": 10
    }
  ],
  "vehicle": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "license_plate": "ABC123"
  },
  "has_bankruptcy": false,
  "has_eviction": false,
  "has_criminal_record": false,
  "additional_occupants": [
    {
      "first_name": "Sarah",
      "last_name": "Doe",
      "relationship": "Spouse"
    }
  ],
  "references": [
    {
      "name": "Bob Smith",
      "relationship": "Previous Landlord",
      "phone": "555-111-2222",
      "email": "bob@example.com"
    }
  ],
  "notes": "Would like to move in as soon as possible"
}
```
- **Response** (201 Created):
```json
{
  "application_id": "app_123456789",
  "unit_id": "unit_123456789",
  "user_id": "usr_123456789",
  "status": "pending",
  "submitted_at": "2025-04-30T12:00:00Z"
}
```

### 23. List Applications
- **Endpoint**: `GET /api/applications`
- **Access**: 
  - Admin: All applications
  - Owner: Applications for their properties
  - Tenant: Their applications
- **Description**: Lists applications with optional filtering
- **Query Parameters**: `page`, `limit`, `status`, `property_id`, `unit_id`
- **Response** (200 OK):
```json
{
  "total": 45,
  "page": 1,
  "limit": 10,
  "applications": [
    {
      "application_id": "app_123456789",
      "unit_id": "unit_123456789",
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "unit": {
        "unit_number": "101",
        "bedrooms": 2
      },
      "applicant": {
        "user_id": "usr_123456789",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "status": "pending",
      "submitted_at": "2025-04-30T12:00:00Z"
    },
    // More applications...
  ]
}
```

### 24. Get Application Details
- **Endpoint**: `GET /api/applications/{application_id}`
- **Access**: Admin, Owner (of property), Tenant (own application)
- **Description**: Gets detailed information about an application
- **Response** (200 OK):
```json
{
  "application_id": "app_123456789",
  "unit_id": "unit_123456789",
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "unit": {
    "unit_number": "101",
    "bedrooms": 2,
    "rent_amount": 1800.00
  },
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "555-123-4567",
  "current_address": {
    "street": "456 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "USA"
  },
  "employment": {
    "employer": "Tech Company",
    "position": "Software Engineer",
    "monthly_income": 8500,
    "start_date": "2023-05-15"
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "relationship": "Sister",
    "phone": "555-987-6543"
  },
  "move_in_date": "2025-06-01",
  "lease_term": 12,
  "pets": [
    {
      "type": "cat",
      "breed": "Domestic Shorthair",
      "weight": 10
    }
  ],
  "vehicle": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "license_plate": "ABC123"
  },
  "has_bankruptcy": false,
  "has_eviction": false,
  "has_criminal_record": false,
  "additional_occupants": [
    {
      "first_name": "Sarah",
      "last_name": "Doe",
      "relationship": "Spouse"
    }
  ],
  "references": [
    {
      "name": "Bob Smith",
      "relationship": "Previous Landlord",
      "phone": "555-111-2222",
      "email": "bob@example.com"
    }
  ],
  "status": "pending",
  "notes": "Would like to move in as soon as possible",
  "submitted_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 25. Update Application Status
- **Endpoint**: `PATCH /api/applications/{application_id}`
- **Access**: Admin, Owner (of property)
- **Description**: Updates application status and adds notes
- **Request Body**:
```json
{
  "status": "approved",
  "admin_notes": "Good credit score and income verification passed."
}
```
- **Response** (200 OK):
```json
{
  "application_id": "app_123456789",
  "status": "approved",
  "admin_notes": "Good credit score and income verification passed.",
  "updated_at": "2025-04-30T15:30:00Z"
}
```

### 26. List Tenants
- **Endpoint**: `GET /api/tenants`
- **Access**: 
  - Admin: All tenants
  - Owner: Tenants in their properties
  - Maintenance: Tenants in properties assigned to them
- **Description**: Lists tenants with optional filtering
- **Query Parameters**: `page`, `limit`, `property_id`, `status` (active/inactive)
- **Response** (200 OK):
```json
{
  "total": 87,
  "page": 1,
  "limit": 10,
  "tenants": [
    {
      "user_id": "usr_123456789",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "555-123-4567",
      "status": "active",
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "unit": {
        "unit_id": "unit_123456789",
        "unit_number": "101"
      },
      "lease_end_date": "2025-12-31"
    },
    // More tenants...
  ]
}
```

### 27. Get Tenant Details
- **Endpoint**: `GET /api/tenants/{tenant_id}`
- **Access**: Admin, Owner (of property), Maintenance (assigned property)
- **Description**: Gets detailed information about a tenant
- **Response** (200 OK):
```json
{
  "user_id": "usr_123456789",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "555-123-4567",
  "status": "active",
  "move_in_date": "2025-01-01",
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "unit": {
    "unit_id": "unit_123456789",
    "unit_number": "101",
    "bedrooms": 2
  },
  "lease": {
    "lease_id": "lease_123456789",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "rent_amount": 1800.00,
    "security_deposit": 1800.00
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "relationship": "Sister",
    "phone": "555-987-6543"
  },
  "vehicle": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "license_plate": "ABC123"
  },
  "additional_occupants": [
    {
      "first_name": "Sarah",
      "last_name": "Doe",
      "relationship": "Spouse"
    }
  ],
  "payment_history": {
    "total_paid": 7200.00,
    "on_time_payments": 4,
    "late_payments": 0
  },
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-04-15T09:30:00Z"
}
```

## Lease Management

### 28. Create Lease
- **Endpoint**: `POST /api/leases`
- **Access**: Owner, Admin
- **Description**: Creates a new lease agreement
- **Request Body**:
```json
{
  "unit_id": "unit_123456789",
  "tenant_id": "usr_123456789",
  "start_date": "2025-06-01",
  "end_date": "2026-05-31",
  "rent_amount": 1800.00,
  "security_deposit": 1800.00,
  "payment_day": 1,
  "late_fee": {
    "grace_period_days": 5,
    "amount": 50.00,
    "percentage": 0
  },
  "utilities_included": ["water", "trash"],
  "pets_allowed": true,
  "pet_deposit": 300.00,
  "smoking_allowed": false,
  "special_terms": "No loud music after 10 PM",
  "auto_renew": true
}
```
- **Response** (201 Created):
```json
{
  "lease_id": "lease_123456789",
  "unit_id": "unit_123456789",
  "tenant_id": "usr_123456789",
  "start_date": "2025-06-01",
  "end_date": "2026-05-31",
  "rent_amount": 1800.00,
  "security_deposit": 1800.00,
  "payment_day": 1,
  "late_fee": {
    "grace_period_days": 5,
    "amount": 50.00,
    "percentage": 0
  },
  "utilities_included": ["water", "trash"],
  "pets_allowed": true,
  "pet_deposit": 300.00,
  "smoking_allowed": false,
  "special_terms": "No loud music after 10 PM",
  "auto_renew": true,
  "status": "active",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z",
  "document_url": "https://storage.example.com/leases/lease_123456789.pdf"
}
```

### 29. List Leases
- **Endpoint**: `GET /api/leases`
- **Access**: 
  - Admin: All leases
  - Owner: Leases for their properties
  - Tenant: Their leases
- **Description**: Lists leases with optional filtering
- **Query Parameters**: `page`, `limit`, `property_id`, `unit_id`, `status`, `tenant_id`
- **Response** (200 OK):
```json
{
  "total": 156,
  "page": 1,
  "limit": 10,
  "leases": [
    {
      "lease_id": "lease_123456789",
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "unit": {
        "unit_id": "unit_123456789",
        "unit_number": "101"
      },
      "tenant": {
        "user_id": "usr_123456789",
        "first_name": "John",
        "last_name": "Doe"
      },
      "start_date": "2025-06-01",
      "end_date": "2026-05-31",
      "rent_amount": 1800.00,
      "status": "active"
    },
    // More leases...
  ]
}
```

### 30. Get Lease Details
- **Endpoint**: `GET /api/leases/{lease_id}`
- **Access**: Admin, Owner (of property), Tenant (on lease)
- **Description**: Gets detailed information about a lease
- **Response** (200 OK):
```json
{
  "lease_id": "lease_123456789",
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "unit": {
    "unit_id": "unit_123456789",
    "unit_number": "101",
    "bedrooms": 2
  },
  "tenant": {
    "user_id": "usr_123456789",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "555-123-4567"
  },
  "start_date": "2025-06-01",
  "end_date": "2026-05-31",
  "rent_amount": 1800.00,
  "security_deposit": 1800.00,
  "payment_day": 1,
  "late_fee": {
    "grace_period_days": 5,
    "amount": 50.00,
    "percentage": 0
  },
  "utilities_included": ["water", "trash"],
  "pets_allowed": true,
  "pet_deposit": 300.00,
  "smoking_allowed": false,
  "special_terms": "No loud music after 10 PM",
  "auto_renew": true,
  "status": "active",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z",
  "document_url": "https://storage.example.com/leases/lease_123456789.pdf"
}
```

### 31. Update Lease
- **Endpoint**: `PATCH /api/leases/{lease_id}`
- **Access**: Owner (of property), Admin
- **Description**: Updates lease information
- **Request Body**:
```json
{
  "rent_amount": 1850.00,
  "end_date": "2026-07-31",
  "special_terms": "No loud music after 10 PM. No parties on weekdays."
}
```
- **Response** (200 OK):
```json
{
  "lease_id": "lease_123456789",
  "rent_amount": 1850.00,
  "end_date": "2026-07-31",
  "special_terms": "No loud music after 10 PM. No parties on weekdays.",
  "updated_at": "2025-04-30T15:30:00Z"
}
```

### 32. Terminate Lease
- **Endpoint**: `POST /api/leases/{lease_id}/terminate`
- **Access**: Owner (of property), Admin
- **Description**: Terminates a lease prematurely
- **Request Body**:
```json
{
  "termination_date": "2025-09-30",
  "reason": "Tenant requested early termination",
  "fees_applied": 900.00
}
```
- **Response** (200 OK):
```json
{
  "lease_id": "lease_123456789",
  "status": "terminated",
  "termination_date": "2025-09-30",
  "reason": "Tenant requested early termination",
  "fees_applied": 900.00,
  "updated_at": "2025-04-30T15:30:00Z"
}
```

### 33. Renew Lease
- **Endpoint**: `POST /api/leases/{lease_id}/renew`
- **Access**: Owner (of property), Admin
- **Description**: Creates a new lease as renewal of existing lease
- **Request Body**:
```json
{
  "start_date": "2026-06-01",
  "end_date": "2027-05-31",
  "rent_amount": 1900.00,
  "auto_renew": true
}
```
- **Response** (201 Created):
```json
{
  "original_lease_id": "lease_123456789",
  "new_lease_id": "lease_987654321",
  "unit_id": "unit_123456789",
  "tenant_id": "usr_123456789",
  "start_date": "2026-06-01",
  "end_date": "2027-05-31",
  "rent_amount": 1900.00,
  "status": "pending",
  "created_at": "2025-04-30T15:30:00Z"
}
```

### 34. Generate Lease Document
- **Endpoint**: `POST /api/leases/{lease_id}/document`
- **Access**: Owner (of property), Admin
- **Description**: Generates a PDF lease document
- **Request Body**:
```json
{
  "template_id": "template_standard_residential"
}
```
- **Response** (200 OK):
```json
{
  "lease_id": "lease_123456789",
  "document_url": "https://storage.example.com/leases/lease_123456789.pdf",
  "generated_at": "2025-04-30T15:30:00Z"
}
```

## Payment Management

### 35. Create Payment
- **Endpoint**: `POST /api/payments`
- **Access**: Tenant, Admin, Owner
- **Description**: Records a rent payment
- **Request Body**:
```json
{
  "lease_id": "lease_123456789",
  "amount": 1800.00,
  "payment_date": "2025-06-01",
  "payment_method": "credit_card",
  "transaction_id": "txn_123456789",
  "notes": "June 2025 rent payment"
}
```
- **Response** (201 Created):
```json
{
  "payment_id": "pmt_123456789",
  "lease_id": "lease_123456789",
  "tenant_id": "usr_123456789",
  "amount": 1800.00,
  "payment_date": "2025-06-01",
  "payment_method": "credit_card",
  "transaction_id": "txn_123456789",
  "status": "completed",
  "notes": "June 2025 rent payment",
  "created_at": "2025-06-01T09:15:00Z",
  "receipt_url": "https://storage.example.com/receipts/pmt_123456789.pdf"
}
```

### 36. List Payments
- **Endpoint**: `GET /api/payments`
- **Access**: 
  - Admin: All payments
  - Owner: Payments for their properties
  - Tenant: Their payments
- **Description**: Lists payments with optional filtering
- **Query Parameters**: `page`, `limit`, `lease_id`, `tenant_id`, `property_id`, `start_date`, `end_date`, `status`
- **Response** (200 OK):
```json
{
  "total": 897,
  "page": 1,
  "limit": 10,
  "payments": [
    {
      "payment_id": "pmt_123456789",
      "lease_id": "lease_123456789",
      "tenant": {
        "user_id": "usr_123456789",
        "first_name": "John",
        "last_name": "Doe"
      },
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "unit": {
        "unit_id": "unit_123456789",
        "unit_number": "101"
      },
      "amount": 1800.00,
      "payment_date": "2025-06-01",
      "payment_method": "credit_card",
      "status": "completed"
    },
    // More payments...
  ]
}
```

### 37. Get Payment Details
- **Endpoint**: `GET /api/payments/{payment_id}`
- **Access**: Admin, Owner (of property), Tenant (own payment)
- **Description**: Gets detailed information about a payment
- **Response** (200 OK):
```json
{
  "payment_id": "pmt_123456789",
  "lease_id": "lease_123456789",
  "tenant": {
    "user_id": "usr_123456789",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  },
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "unit": {
    "unit_id": "unit_123456789",
    "unit_number": "101"
  },
  "amount": 1800.00,
  "payment_date": "2025-06-01",
  "payment_method": "credit_card",
  "transaction_id": "txn_123456789",
  "status": "completed",
  "notes": "June 2025 rent payment",
  "created_at": "2025-06-01T09:15:00Z",
  "receipt_url": "https://storage.example.com/receipts/pmt_123456789.pdf"
}
```

### 38. Create Invoice
- **Endpoint**: `POST /api/invoices`
- **Access**: Owner, Admin
- **Description**: Creates a new invoice for a tenant
- **Request Body**:
```json
{
  "lease_id": "lease_123456789",
  "amount": 1800.00,
  "due_date": "2025-07-01",
  "description": "July 2025 rent",
  "line_items": [
    {
      "description": "Base rent",
      "amount": 1800.00
    }
  ]
}
```
- **Response** (201 Created):
```json
{
  "invoice_id": "inv_123456789",
  "lease_id": "lease_123456789",
  "tenant_id": "usr_123456789",
  "amount": 1800.00,
  "due_date": "2025-07-01",
  "description": "July 2025 rent",
  "line_items": [
    {
      "description": "Base rent",
      "amount": 1800.00
    }
  ],
  "status": "pending",
  "created_at": "2025-06-15T10:00:00Z",
  "updated_at": "2025-06-15T10:00:00Z",
  "invoice_url": "https://storage.example.com/invoices/inv_123456789.pdf"
}
```

### 39. List Invoices
- **Endpoint**: `GET /api/invoices`
- **Access**: 
  - Admin: All invoices
  - Owner: Invoices for their properties
  - Tenant: Their invoices
- **Description**: Lists invoices with optional filtering
- **Query Parameters**: `page`, `limit`, `lease_id`, `tenant_id`, `property_id`, `status`, `start_date`, `end_date`
- **Response** (200 OK):
```json
{
  "total": 785,
  "page": 1,
  "limit": 10,
  "invoices": [
    {
      "invoice_id": "inv_123456789",
      "lease_id": "lease_123456789",
      "tenant": {
        "user_id": "usr_123456789",
        "first_name": "John",
        "last_name": "Doe"
      },
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "unit": {
        "unit_id": "unit_123456789",
        "unit_number": "101"
      },
      "amount": 1800.00,
      "due_date": "2025-07-01",
      "status": "pending"
    },
    // More invoices...
  ]
}
```

### 40. Get Invoice Details
- **Endpoint**: `GET /api/invoices/{invoice_id}`
- **Access**: Admin, Owner (of property), Tenant (own invoice)
- **Description**: Gets detailed information about an invoice
- **Response** (200 OK):
```json
{
  "invoice_id": "inv_123456789",
  "lease_id": "lease_123456789",
  "tenant": {
    "user_id": "usr_123456789",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  },
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "unit": {
    "unit_id": "unit_123456789",
    "unit_number": "101"
  },
  "amount": 1800.00,
  "due_date": "2025-07-01",
  "description": "July 2025 rent",
  "line_items": [
    {
      "description": "Base rent",
      "amount": 1800.00
    }
  ],
  "status": "pending",
  "created_at": "2025-06-15T10:00:00Z",
  "updated_at": "2025-06-15T10:00:00Z",
  "invoice_url": "https://storage.example.com/invoices/inv_123456789.pdf"
}
```

### 41. Pay Invoice
- **Endpoint**: `POST /api/invoices/{invoice_id}/pay`
- **Access**: Tenant
- **Description**: Pays an invoice
- **Request Body**:
```json
{
  "payment_method": "credit_card",
  "card": {
    "number": "4242424242424242",
    "exp_month": 12,
    "exp_year": 2026,
    "cvc": "123"
  }
}
```
- **Response** (200 OK):
```json
{
  "invoice_id": "inv_123456789",
  "payment_id": "pmt_987654321",
  "status": "paid",
  "amount_paid": 1800.00,
  "payment_date": "2025-06-20T14:30:00Z",
  "receipt_url": "https://storage.example.com/receipts/pmt_987654321.pdf"
}
```

## Maintenance Management

### 42. Create Maintenance Request
- **Endpoint**: `POST /api/maintenance-requests`
- **Access**: Tenant, Admin, Owner, Maintenance
- **Description**: Creates a new maintenance request
- **Request Body**:
```json
{
  "unit_id": "unit_123456789",
  "category": "plumbing",
  "title": "Leaking faucet in kitchen",
  "description": "The kitchen sink faucet has been leaking steadily for two days",
  "priority": "medium",
  "preferred_time": ["morning", "evening"],
  "allow_entry_without_tenant": true,
  "has_pets": true,
  "images": ["base64encodedimagedatahere...", "base64encodedimagedatahere..."]
}
```
- **Response** (201 Created):
```json
{
  "request_id": "maint_123456789",
  "unit_id": "unit_123456789",
  "tenant_id": "usr_123456789",
  "property_id": "prop_123456789",
  "category": "plumbing",
  "title": "Leaking faucet in kitchen",
  "description": "The kitchen sink faucet has been leaking steadily for two days",
  "priority": "medium",
  "status": "pending",
  "preferred_time": ["morning", "evening"],
  "allow_entry_without_tenant": true,
  "has_pets": true,
  "images": [
    "https://storage.example.com/maintenance/maint_123456789_1.jpg",
    "https://storage.example.com/maintenance/maint_123456789_2.jpg"
  ],
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 43. List Maintenance Requests
- **Endpoint**: `GET /api/maintenance-requests`
- **Access**: 
  - Admin: All requests
  - Owner: Requests for their properties
  - Tenant: Their requests
  - Maintenance: Assigned requests
- **Description**: Lists maintenance requests with optional filtering
- **Query Parameters**: `page`, `limit`, `property_id`, `unit_id`, `status`, `priority`, `category`
- **Response** (200 OK):
```json
{
  "total": 143,
  "page": 1,
  "limit": 10,
  "requests": [
    {
      "request_id": "maint_123456789",
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "unit": {
        "unit_id": "unit_123456789",
        "unit_number": "101"
      },
      "tenant": {
        "user_id": "usr_123456789",
        "first_name": "John",
        "last_name": "Doe"
      },
      "category": "plumbing",
      "title": "Leaking faucet in kitchen",
      "priority": "medium",
      "status": "pending",
      "created_at": "2025-04-30T12:00:00Z"
    },
    // More requests...
  ]
}
```

### 44. Get Maintenance Request Details
- **Endpoint**: `GET /api/maintenance-requests/{request_id}`
- **Access**: Admin, Owner (of property), Tenant (own request), Maintenance (assigned)
- **Description**: Gets detailed information about a maintenance request
- **Response** (200 OK):
```json
{
  "request_id": "maint_123456789",
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "unit": {
    "unit_id": "unit_123456789",
    "unit_number": "101"
  },
  "tenant": {
    "user_id": "usr_123456789",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "555-123-4567"
  },
  "category": "plumbing",
  "title": "Leaking faucet in kitchen",
  "description": "The kitchen sink faucet has been leaking steadily for two days",
  "priority": "medium",
  "status": "assigned",
  "preferred_time": ["morning", "evening"],
  "allow_entry_without_tenant": true,
  "has_pets": true,
  "images": [
    "https://storage.example.com/maintenance/maint_123456789_1.jpg",
    "https://storage.example.com/maintenance/maint_123456789_2.jpg"
  ],
  "assigned_to": {
    "user_id": "usr_456789123",
    "first_name": "Mike",
    "last_name": "Repair",
    "phone": "555-333-9999"
  },
  "scheduled_date": "2025-05-02",
  "scheduled_time": "09:00-12:00",
  "notes": [
    {
      "user_id": "usr_456789123",
      "user_name": "Mike Repair",
      "role": "maintenance",
      "note": "Will need to bring replacement parts",
      "created_at": "2025-04-30T14:30:00Z"
    }
  ],
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T14:30:00Z"
}
```

### 45. Update Maintenance Request
- **Endpoint**: `PATCH /api/maintenance-requests/{request_id}`
- **Access**: Admin, Owner (of property), Maintenance (assigned)
- **Description**: Updates a maintenance request
- **Request Body**:
```json
{
  "status": "assigned",
  "assigned_to": "usr_456789123",
  "priority": "high",
  "scheduled_date": "2025-05-02",
  "scheduled_time": "09:00-12:00",
  "estimated_cost": 75.00,
  "notes": "Will need to bring replacement parts"
}
```
- **Response** (200 OK):
```json
{
  "request_id": "maint_123456789",
  "status": "assigned",
  "assigned_to": {
    "user_id": "usr_456789123",
    "first_name": "Mike",
    "last_name": "Repair"
  },
  "priority": "high",
  "scheduled_date": "2025-05-02",
  "scheduled_time": "09:00-12:00",
  "estimated_cost": 75.00,
  "updated_at": "2025-04-30T14:30:00Z"
}
```

### 46. Add Maintenance Note
- **Endpoint**: `POST /api/maintenance-requests/{request_id}/notes`
- **Access**: Admin, Owner (of property), Tenant (own request), Maintenance (assigned)
- **Description**: Adds a note to a maintenance request
- **Request Body**:
```json
{
  "note": "Confirmed with tenant that they will be home during the scheduled time"
}
```
- **Response** (201 Created):
```json
{
  "note_id": "note_123456789",
  "request_id": "maint_123456789",
  "user_id": "usr_456789123",
  "user_name": "Mike Repair",
  "role": "maintenance",
  "note": "Confirmed with tenant that they will be home during the scheduled time",
  "created_at": "2025-04-30T15:45:00Z"
}
```

### 47. Complete Maintenance Request
- **Endpoint**: `POST /api/maintenance-requests/{request_id}/complete`
- **Access**: Admin, Owner, Maintenance (assigned)
- **Description**: Marks a maintenance request as completed
- **Request Body**:
```json
{
  "completion_notes": "Replaced the faucet washer and fixed the leak",
  "materials_used": "New washer, plumber's tape",
  "labor_hours": 1.5,
  "total_cost": 85.75,
  "images": ["base64encodedimagedatahere...", "base64encodedimagedatahere..."]
}
```
- **Response** (200 OK):
```json
{
  "request_id": "maint_123456789",
  "status": "completed",
  "completed_at": "2025-05-02T11:30:00Z",
  "completion_notes": "Replaced the faucet washer and fixed the leak",
  "materials_used": "New washer, plumber's tape",
  "labor_hours": 1.5,
  "total_cost": 85.75,
  "images": [
    "https://storage.example.com/maintenance/maint_123456789_3.jpg",
    "https://storage.example.com/maintenance/maint_123456789_4.jpg"
  ],
  "updated_at": "2025-05-02T11:30:00Z"
}
```

### 48. List Maintenance Staff
- **Endpoint**: `GET /api/maintenance-staff`
- **Access**: Admin, Owner
- **Description**: Lists maintenance personnel with optional filtering
- **Query Parameters**: `page`, `limit`, `property_id`, `specialization`
- **Response** (200 OK):
```json
{
  "total": 12,
  "page": 1,
  "limit": 10,
  "staff": [
    {
      "user_id": "usr_456789123",
      "first_name": "Mike",
      "last_name": "Repair",
      "email": "mike@example.com",
      "phone": "555-333-9999",
      "specializations": ["plumbing", "electrical"],
      "properties_assigned": [
        {
          "property_id": "prop_123456789",
          "name": "Sunset Apartments"
        }
      ],
      "active_requests": 3
    },
    // More staff...
  ]
}
```

### 49. Assign Properties to Maintenance Staff
- **Endpoint**: `POST /api/maintenance-staff/{user_id}/properties`
- **Access**: Admin
- **Description**: Assigns properties to a maintenance staff member
- **Request Body**:
```json
{
  "property_ids": ["prop_123456789", "prop_987654321"]
}
```
- **Response** (200 OK):
```json
{
  "user_id": "usr_456789123",
  "first_name": "Mike",
  "last_name": "Repair",
  "properties_assigned": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments"
    },
    {
      "property_id": "prop_987654321",
      "name": "Mountain View Residences"
    }
  ],
  "updated_at": "2025-04-30T16:00:00Z"
}
```

## Document Management

### 50. Upload Document
- **Endpoint**: `POST /api/documents`
- **Access**: All Authenticated Users (with role-specific permissions)
- **Description**: Uploads a document with role-specific access control
- **Request Body**: (multipart/form-data)
```
file: [file]
name: "Lease Agreement for Apt 101"
category: "lease"
associated_id: "lease_123456789"
description: "Signed lease agreement for John Doe"
access_roles: ["owner", "tenant", "admin"]
```
- **Response** (201 Created):
```json
{
  "document_id": "doc_123456789",
  "name": "Lease Agreement for Apt 101",
  "category": "lease",
  "associated_id": "lease_123456789",
  "description": "Signed lease agreement for John Doe",
  "file_type": "application/pdf",
  "file_size": 1256433,
  "uploaded_by": {
    "user_id": "usr_123456789",
    "name": "Jane Smith",
    "role": "owner"
  },
  "access_roles": ["owner", "tenant", "admin"],
  "url": "https://storage.example.com/documents/doc_123456789.pdf",
  "uploaded_at": "2025-04-30T12:00:00Z"
}
```

### 51. List Documents
- **Endpoint**: `GET /api/documents`
- **Access**: All Authenticated Users (filtered by access roles)
- **Description**: Lists documents with optional filtering
- **Query Parameters**: `page`, `limit`, `category`, `associated_id`, `search`
- **Response** (200 OK):
```json
{
  "total": 238,
  "page": 1,
  "limit": 10,
  "documents": [
    {
      "document_id": "doc_123456789",
      "name": "Lease Agreement for Apt 101",
      "category": "lease",
      "associated_id": "lease_123456789",
      "description": "Signed lease agreement for John Doe",
      "file_type": "application/pdf",
      "file_size": 1256433,
      "uploaded_by": {
        "user_id": "usr_123456789",
        "name": "Jane Smith",
        "role": "owner"
      },
      "uploaded_at": "2025-04-30T12:00:00Z"
    },
    // More documents...
  ]
}
```

### 52. Get Document Details
- **Endpoint**: `GET /api/documents/{document_id}`
- **Access**: All Authenticated Users (filtered by access roles)
- **Description**: Gets detailed information about a document
- **Response** (200 OK):
```json
{
  "document_id": "doc_123456789",
  "name": "Lease Agreement for Apt 101",
  "category": "lease",
  "associated_id": "lease_123456789",
  "associated_entity": {
    "type": "lease",
    "id": "lease_123456789",
    "details": {
      "tenant": "John Doe",
      "unit": "Apt 101",
      "property": "Sunset Apartments"
    }
  },
  "description": "Signed lease agreement for John Doe",
  "file_type": "application/pdf",
  "file_size": 1256433,
  "uploaded_by": {
    "user_id": "usr_123456789",
    "name": "Jane Smith",
    "role": "owner"
  },
  "access_roles": ["owner", "tenant", "admin"],
  "url": "https://storage.example.com/documents/doc_123456789.pdf",
  "uploaded_at": "2025-04-30T12:00:00Z"
}
```

### 53. Update Document Metadata
- **Endpoint**: `PATCH /api/documents/{document_id}`
- **Access**: Document Uploader, Admin
- **Description**: Updates document metadata
- **Request Body**:
```json
{
  "name": "Final Lease Agreement - Apt 101",
  "description": "Fully executed lease agreement for John Doe",
  "access_roles": ["owner", "tenant", "admin", "maintenance"]
}
```
- **Response** (200 OK):
```json
{
  "document_id": "doc_123456789",
  "name": "Final Lease Agreement - Apt 101",
  "description": "Fully executed lease agreement for John Doe",
  "access_roles": ["owner", "tenant", "admin", "maintenance"],
  "updated_at": "2025-04-30T15:30:00Z"
}
```

### 54. Delete Document
- **Endpoint**: `DELETE /api/documents/{document_id}`
- **Access**: Document Uploader, Admin
- **Description**: Deletes a document
- **Response** (204 No Content)

## Communication & Notifications

### 55. Send Message
- **Endpoint**: `POST /api/messages`
- **Access**: All Authenticated Users
- **Description**: Sends a message to another user/group
- **Request Body**:
```json
{
  "recipient_ids": ["usr_123456789", "usr_987654321"],
  "subject": "Rent increase notification",
  "message": "Dear tenants, please be advised that rent will increase by 3% effective...",
  "attachments": ["doc_123456789"]
}
```
- **Response** (201 Created):
```json
{
  "message_id": "msg_123456789",
  "sender_id": "usr_123456789",
  "recipients": [
    {
      "user_id": "usr_123456789",
      "name": "John Doe",
      "read_status": false
    },
    {
      "user_id": "usr_987654321",
      "name": "Jane Smith",
      "read_status": false
    }
  ],
  "subject": "Rent increase notification",
  "message": "Dear tenants, please be advised that rent will increase by 3% effective...",
  "attachments": [
    {
      "document_id": "doc_123456789",
      "name": "Rent Increase Notice.pdf"
    }
  ],
  "sent_at": "2025-04-30T12:00:00Z"
}
```

### 56. List Messages
- **Endpoint**: `GET /api/messages`
- **Access**: All Authenticated Users
- **Description**: Lists messages for the current user
- **Query Parameters**: `page`, `limit`, `folder` (inbox/sent/archived), `read_status`, `search`
- **Response** (200 OK):
```json
{
  "total": 56,
  "page": 1,
  "limit": 10,
  "messages": [
    {
      "message_id": "msg_123456789",
      "folder": "inbox",
      "read_status": false,
      "sender": {
        "user_id": "usr_123456789",
        "name": "Jane Smith",
        "role": "owner"
      },
      "subject": "Rent increase notification",
      "preview": "Dear tenants, please be advised that rent will increase by 3% effective...",
      "has_attachments": true,
      "sent_at": "2025-04-30T12:00:00Z"
    },
    // More messages...
  ]
}
```

### 57. Get Message Details
- **Endpoint**: `GET /api/messages/{message_id}`
- **Access**: Message Sender/Recipient
- **Description**: Gets detailed information about a message
- **Response** (200 OK):
```json
{
  "message_id": "msg_123456789",
  "sender": {
    "user_id": "usr_123456789",
    "name": "Jane Smith",
    "role": "owner",
    "email": "jane@example.com",
    "phone": "555-987-6543"
  },
  "recipients": [
    {
      "user_id": "usr_123456789",
      "name": "John Doe",
      "role": "tenant",
      "read_at": "2025-04-30T12:30:00Z"
    },
    {
      "user_id": "usr_987654321",
      "name": "Sarah Johnson",
      "role": "tenant",
      "read_at": null
    }
  ],
  "subject": "Rent increase notification",
  "message": "Dear tenants, please be advised that rent will increase by 3% effective...",
  "attachments": [
    {
      "document_id": "doc_123456789",
      "name": "Rent Increase Notice.pdf",
      "url": "https://storage.example.com/documents/doc_123456789.pdf"
    }
  ],
  "sent_at": "2025-04-30T12:00:00Z"
}
```

### 58. Mark Message as Read/Unread
- **Endpoint**: `PATCH /api/messages/{message_id}/read-status`
- **Access**: Message Recipient
- **Description**: Updates message read status
- **Request Body**:
```json
{
  "read": true
}
```
- **Response** (200 OK):
```json
{
  "message_id": "msg_123456789",
  "read": true,
  "read_at": "2025-04-30T12:30:00Z"
}
```

### 59. Archive Message
- **Endpoint**: `POST /api/messages/{message_id}/archive`
- **Access**: Message Recipient
- **Description**: Archives a message
- **Response** (200 OK):
```json
{
  "message_id": "msg_123456789",
  "folder": "archived",
  "archived_at": "2025-04-30T12:30:00Z"
}
```

### 60. Create Announcement
- **Endpoint**: `POST /api/announcements`
- **Access**: Owner, Admin
- **Description**: Creates a new announcement for property/properties
- **Request Body**:
```json
{
  "property_ids": ["prop_123456789"],
  "title": "Planned water shutdown",
  "message": "Please be advised that water will be shut off on May 15th from 9 AM to 12 PM for maintenance",
  "start_date": "2025-05-10",
  "end_date": "2025-05-15",
  "importance": "high",
  "attachments": ["doc_123456789"]
}
```
- **Response** (201 Created):
```json
{
  "announcement_id": "ann_123456789",
  "title": "Planned water shutdown",
  "message": "Please be advised that water will be shut off on May 15th from 9 AM to 12 PM for maintenance",
  "properties": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments"
    }
  ],
  "start_date": "2025-05-10",
  "end_date": "2025-05-15",
  "importance": "high",
  "attachments": [
    {
      "document_id": "doc_123456789",
      "name": "Water Shutdown Notice.pdf"
    }
  ],
  "created_by": {
    "user_id": "usr_123456789",
    "name": "Jane Smith",
    "role": "owner"
  },
  "created_at": "2025-04-30T12:00:00Z"
}
```

### 61. List Announcements
- **Endpoint**: `GET /api/announcements`
- **Access**: All Authenticated Users (filtered by properties)
- **Description**: Lists announcements with optional filtering
- **Query Parameters**: `page`, `limit`, `property_id`, `active_only`
- **Response** (200 OK):
```json
{
  "total": 15,
  "page": 1,
  "limit": 10,
  "announcements": [
    {
      "announcement_id": "ann_123456789",
      "title": "Planned water shutdown",
      "importance": "high",
      "properties": [
        {
          "property_id": "prop_123456789",
          "name": "Sunset Apartments"
        }
      ],
      "start_date": "2025-05-10",
      "end_date": "2025-05-15",
      "created_at": "2025-04-30T12:00:00Z"
    },
    // More announcements...
  ]
}
```

### 62. Get User Notifications
- **Endpoint**: `GET /api/notifications`
- **Access**: All Authenticated Users
- **Description**: Gets notifications for the current user
- **Query Parameters**: `page`, `limit`, `read_status`
- **Response** (200 OK):
```json
{
  "total": 28,
  "page": 1,
  "limit": 10,
  "notifications": [
    {
      "notification_id": "notif_123456789",
      "type": "maintenance_update",
      "title": "Maintenance request updated",
      "message": "Your maintenance request for 'Leaking faucet' has been scheduled for May 2nd",
      "related_entity": {
        "type": "maintenance_request",
        "id": "maint_123456789"
      },
      "read": false,
      "created_at": "2025-04-30T14:30:00Z"
    },
    // More notifications...
  ]
}
```

### 63. Mark Notification as Read
- **Endpoint**: `PATCH /api/notifications/{notification_id}/read`
- **Access**: Notification Recipient
- **Description**: Marks a notification as read
- **Response** (200 OK):
```json
{
  "notification_id": "notif_123456789",
  "read": true,
  "read_at": "2025-04-30T15:00:00Z"
}
```

## Reports & Analytics

### 64. Generate Financial Report
- **Endpoint**: `POST /api/reports/financial`
- **Access**: Owner, Admin
- **Description**: Generates a financial report
- **Request Body**:
```json
{
  "property_ids": ["prop_123456789"],
  "start_date": "2025-01-01",
  "end_date": "2025-04-30",
  "report_type": "income_expense",
  "include_details": true,
  "format": "pdf"
}
```
- **Response** (200 OK):
```json
{
  "report_id": "report_123456789",
  "type": "financial",
  "subtype": "income_expense",
  "properties": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments"
    }
  ],
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-04-30"
  },
  "summary": {
    "total_income": 148500.00,
    "total_expenses": 42300.00,
    "net_income": 106200.00
  },
  "report_url": "https://storage.example.com/reports/report_123456789.pdf",
  "generated_at": "2025-04-30T12:00:00Z"
}
```

### 65. Generate Occupancy Report
- **Endpoint**: `POST /api/reports/occupancy`
- **Access**: Owner, Admin
- **Description**: Generates an occupancy report
- **Request Body**:
```json
{
  "property_ids": ["prop_123456789"],
  "point_in_time": "2025-04-30",
  "include_trends": true,
  "format": "csv"
}
```
- **Response** (200 OK):
```json
{
  "report_id": "report_987654321",
  "type": "occupancy",
  "properties": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments"
    }
  ],
  "point_in_time": "2025-04-30",
  "summary": {
    "total_units": 24,
    "occupied_units": 21,
    "vacant_units": 3,
    "occupancy_rate": 87.5,
    "avg_days_vacant": 18
  },
  "report_url": "https://storage.example.com/reports/report_987654321.csv",
  "generated_at": "2025-04-30T12:00:00Z"
}
```

### 66. Generate Maintenance Report
- **Endpoint**: `POST /api/reports/maintenance`
- **Access**: Owner, Admin, Maintenance
- **Description**: Generates a maintenance report
- **Request Body**:
```json
{
  "property_ids": ["prop_123456789"],
  "start_date": "2025-01-01",
  "end_date": "2025-04-30",
  "categories": ["plumbing", "electrical", "hvac"],
  "status": ["completed", "pending"],
  "format": "xlsx"
}
```
- **Response** (200 OK):
```json
{
  "report_id": "report_456789123",
  "type": "maintenance",
  "properties": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments"
    }
  ],
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-04-30"
  },
  "summary": {
    "total_requests": 47,
    "completed_requests": 42,
    "pending_requests": 5,
    "avg_completion_time_days": 2.3,
    "total_cost": 5876.45
  },
  "report_url": "https://storage.example.com/reports/report_456789123.xlsx",
  "generated_at": "2025-04-30T12:00:00Z"
}
```

### 67. Get Property Dashboard Data
- **Endpoint**: `GET /api/dashboard/property/{property_id}`
- **Access**: Owner (of property), Admin
- **Description**: Gets dashboard data for a property
- **Response** (200 OK):
```json
{
  "property_id": "prop_123456789",
  "name": "Sunset Apartments",
  "snapshot": {
    "total_units": 24,
    "occupied_units": 21,
    "vacancy_rate": 12.5,
    "rent_collection": {
      "total_due_current_month": 37800.00,
      "total_collected": 35000.00,
      "collection_rate": 92.6
    },
    "maintenance": {
      "open_requests": 5,
      "completed_last_30_days": 12
    },
    "leases_expiring_next_90_days": 3
  },
  "financial_summary": {
    "current_month": {
      "revenue": 37800.00,
      "expenses": 9500.00,
      "net_income": 28300.00
    },
    "year_to_date": {
      "revenue": 148500.00,
      "expenses": 42300.00,
      "net_income": 106200.00
    }
  },
  "occupancy_trend": [
    {
      "month": "2025-01",
      "rate": 83.3
    },
    {
      "month": "2025-02",
      "rate": 87.5
    },
    {
      "month": "2025-03",
      "rate": 87.5
    },
    {
      "month": "2025-04",
      "rate": 87.5
    }
  ],
  "active_notices": [
    {
      "announcement_id": "ann_123456789",
      "title": "Planned water shutdown",
      "importance": "high",
      "end_date": "2025-05-15"
    }
  ]
}
```

### 68. Get Owner Dashboard Data
- **Endpoint**: `GET /api/dashboard/owner`
- **Access**: Owner
- **Description**: Gets dashboard data across all owner properties
- **Response** (200 OK):
```json
{
  "snapshot": {
    "total_properties": 3,
    "total_units": 56,
    "occupied_units": 49,
    "overall_vacancy_rate": 12.5,
    "rent_collection": {
      "total_due_current_month": 87500.00,
      "total_collected": 82300.00,
      "collection_rate": 94.1
    },
    "maintenance": {
      "open_requests": 8,
      "completed_last_30_days": 23
    },
    "leases_expiring_next_90_days": 7
  },
  "financial_summary": {
    "current_month": {
      "revenue": 87500.00,
      "expenses": 19200.00,
      "net_income": 68300.00
    },
    "year_to_date": {
      "revenue": 348500.00,
      "expenses": 92300.00,
      "net_income": 256200.00
    }
  },
  "property_comparison": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments",
      "units": 24,
      "occupancy_rate": 87.5,
      "monthly_revenue": 37800.00,
      "monthly_expenses": 9500.00
    },
    // More properties...
  ],
  "recent_activity": [
    {
      "type": "lease_signed",
      "property_name": "Sunset Apartments",
      "unit_number": "105",
      "tenant_name": "Sarah Johnson",
      "timestamp": "2025-04-28T14:30:00Z"
    },
    // More activities...
  ]
}
```

### 69. Get Tenant Dashboard Data
- **Endpoint**: `GET /api/dashboard/tenant`
- **Access**: Tenant
- **Description**: Gets dashboard data for a tenant
- **Response** (200 OK):
```json
{
  "tenant_id": "usr_123456789",
  "name": "John Doe",
  "residence": {
    "property": {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments",
      "address": {
        "street": "123 Sunset Blvd",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90210"
      }
    },
    "unit": {
      "unit_id": "unit_123456789",
      "unit_number": "101"
    },
    "lease": {
      "lease_id": "lease_123456789",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "days_remaining": 245
    }
  },
  "financial": {
    "current_rent": 1800.00,
    "next_payment_due": "2025-05-01",
    "security_deposit": 1800.00,
    "balance": 0.00,
    "last_payment": {
      "date": "2025-04-01",
      "amount": 1800.00,
      "method": "credit_card"
    }
  },
  "maintenance": {
    "open_requests": 1,
    "recent_requests": [
      {
        "request_id": "maint_123456789",
        "title": "Leaking faucet in kitchen",
        "status": "assigned",
        "scheduled_date": "2025-05-02",
        "created_at": "2025-04-30T12:00:00Z"
      }
    ]
  },
  "notices": [
    {
      "announcement_id": "ann_123456789",
      "title": "Planned water shutdown",
      "importance": "high",
      "end_date": "2025-05-15"
    }
  ],
  "unread_messages": 2
}
```

### 70. Get Maintenance Dashboard Data
- **Endpoint**: `GET /api/dashboard/maintenance`
- **Access**: Maintenance
- **Description**: Gets dashboard data for maintenance staff
- **Response** (200 OK):
```json
{
  "maintenance_id": "usr_456789123",
  "name": "Mike Repair",
  "assigned_properties": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments"
    },
    {
      "property_id": "prop_987654321",
      "name": "Mountain View Residences"
    }
  ],
  "request_summary": {
    "assigned_to_me": {
      "pending": 3,
      "in_progress": 2,
      "scheduled": 4,
      "total": 9
    },
    "next_scheduled": [
      {
        "request_id": "maint_123456789",
        "property_name": "Sunset Apartments",
        "unit_number": "101",
        "title": "Leaking faucet in kitchen",
        "scheduled_date": "2025-05-02",
        "scheduled_time": "09:00-12:00"
      },
      // More scheduled requests...
    ]
  },
  "performance": {
    "completed_last_30_days": 18,
    "avg_completion_time_days": 1.8,
    "avg_tenant_rating": 4.7
  },
  "unread_messages": 1
}
```

## Settings & Configuration

### 71. Get System Settings
- **Endpoint**: `GET /api/settings`
- **Access**: Admin
- **Description**: Gets system-wide settings
- **Response** (200 OK):
```json
{
  "company": {
    "name": "ABC Property Management",
    "address": {
      "street": "789 Business Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90001",
      "country": "USA"
    },
    "phone": "555-789-0123",
    "email": "info@abcproperties.com",
    "website": "https://www.abcproperties.com",
    "logo_url": "https://storage.example.com/company/logo.png"
  },
  "payment_settings": {
    "payment_methods": ["credit_card", "bank_transfer", "check"],
    "payment_processors": ["stripe", "paypal"],
    "late_fee_defaults": {
      "grace_period_days": 5,
      "percentage": 5,
      "minimum_amount": 50.00
    }
  },
  "notification_settings": {
    "email_notifications": true,
    "sms_notifications": true,
    "push_notifications": true,
    "default_maintenance_notifications": ["assigned", "scheduled", "completed"]
  },
  "document_templates": [
    {
      "template_id": "template_standard_residential",
      "name": "Standard Residential Lease",
      "document_type": "lease"
    },
    // More templates...
  ]
}
```

### 72. Update System Settings
- **Endpoint**: `PATCH /api/settings`
- **Access**: Admin
- **Description**: Updates system-wide settings
- **Request Body**:
```json
{
  "company": {
    "name": "ABC Property Management Group",
    "phone": "555-789-1234",
    "logo": "base64encodedimagedatahere..."
  },
  "payment_settings": {
    "payment_methods": ["credit_card", "bank_transfer", "check", "cash"],
    "late_fee_defaults": {
      "grace_period_days": 7
    }
  }
}
```
- **Response** (200 OK):
```json
{
  "company": {
    "name": "ABC Property Management Group",
    "phone": "555-789-1234",
    "logo_url": "https://storage.example.com/company/logo_updated.png"
  },
  "payment_settings": {
    "payment_methods": ["credit_card", "bank_transfer", "check", "cash"],
    "late_fee_defaults": {
      "grace_period_days": 7,
      "percentage": 5,
      "minimum_amount": 50.00
    }
  },
  "updated_at": "2025-04-30T15:30:00Z"
}
```

### 73. Get User Notification Preferences
- **Endpoint**: `GET /api/users/me/notification-preferences`
- **Access**: All Authenticated Users
- **Description**: Gets notification preferences for the current user
- **Response** (200 OK):
```json
{
  "email_notifications": {
    "enabled": true,
    "email": "john@example.com",
    "types": [
      "payment_confirmation",
      "payment_reminder",
      "maintenance_updates",
      "lease_expiration",
      "announcements"
    ]
  },
  "sms_notifications": {
    "enabled": true,
    "phone": "555-123-4567",
    "types": [
      "payment_reminder",
      "maintenance_scheduled",
      "emergency_announcements"
    ]
  },
  "push_notifications": {
    "enabled": true,
    "types": [
      "messages",
      "maintenance_updates",
      "announcements"
    ]
  },
  "updated_at": "2025-04-15T10:00:00Z"
}
```

### 74. Update User Notification Preferences
- **Endpoint**: `PATCH /api/users/me/notification-preferences`
- **Access**: All Authenticated Users
- **Description**: Updates notification preferences for the current user
- **Request Body**:
```json
{
  "email_notifications": {
    "types": [
      "payment_confirmation",
      "payment_reminder",
      "maintenance_updates",
      "lease_expiration"
    ]
  },
  "sms_notifications": {
    "enabled": false
  }
}
```
- **Response** (200 OK):
```json
{
  "email_notifications": {
    "enabled": true,
    "email": "john@example.com",
    "types": [
      "payment_confirmation",
      "payment_reminder",
      "maintenance_updates",
      "lease_expiration"
    ]
  },
  "sms_notifications": {
    "enabled": false,
    "phone": "555-123-4567",
    "types": []
  },
  "push_notifications": {
    "enabled": true,
    "types": [
      "messages",
      "maintenance_updates",
      "announcements"
    ]
  },
  "updated_at": "2025-04-30T15:30:00Z"
}
```

## Additional API Endpoints

### 75. Create Inspection
- **Endpoint**: `POST /api/inspections`
- **Access**: Owner, Admin, Maintenance
- **Description**: Creates a property/unit inspection
- **Request Body**:
```json
{
  "unit_id": "unit_123456789",
  "type": "move_in",
  "scheduled_date": "2025-06-01",
  "scheduled_time": "10:00-12:00",
  "inspector_id": "usr_456789123",
  "notify_tenant": true
}
```
- **Response** (201 Created):
```json
{
  "inspection_id": "insp_123456789",
  "unit_id": "unit_123456789",
  "property_id": "prop_123456789",
  "type": "move_in",
  "scheduled_date": "2025-06-01",
  "scheduled_time": "10:00-12:00",
  "inspector": {
    "user_id": "usr_456789123",
    "name": "Mike Repair",
    "role": "maintenance"
  },
  "status": "scheduled",
  "tenant_notified": true,
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 76. Complete Inspection
- **Request Body**:
```json
{
  "condition": "good",
  "notes": "Unit is in good condition with minor wear and tear",
  "items": [
    {
      "category": "kitchen",
      "item": "refrigerator",
      "condition": "excellent",
      "notes": "New appliance, working perfectly"
    },
    {
      "category": "bathroom",
      "item": "shower",
      "condition": "fair",
      "notes": "Some lime scale buildup, needs deep cleaning"
    },
    {
      "category": "bedroom",
      "item": "carpet",
      "condition": "good",
      "notes": "Minor stain near closet door"
    }
  ],
  "images": ["base64encodedimagedatahere...", "base64encodedimagedatahere..."]
}
```
- **Response** (200 OK):
```json
{
  "inspection_id": "insp_123456789",
  "status": "completed",
  "condition": "good",
  "completed_at": "2025-06-01T11:30:00Z",
  "completed_by": {
    "user_id": "usr_456789123",
    "name": "Mike Repair"
  },
  "report_url": "https://storage.example.com/inspections/insp_123456789.pdf"
}
```

### 77. List Inspections
- **Endpoint**: `GET /api/inspections`
- **Access**: 
  - Admin: All inspections
  - Owner: Inspections for their properties
  - Tenant: Inspections for their unit
  - Maintenance: Inspections assigned to them
- **Description**: Lists inspections with optional filtering
- **Query Parameters**: `page`, `limit`, `property_id`, `unit_id`, `status`, `type`, `start_date`, `end_date`
- **Response** (200 OK):
```json
{
  "total": 48,
  "page": 1,
  "limit": 10,
  "inspections": [
    {
      "inspection_id": "insp_123456789",
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "unit": {
        "unit_id": "unit_123456789",
        "unit_number": "101"
      },
      "type": "move_in",
      "scheduled_date": "2025-06-01",
      "scheduled_time": "10:00-12:00",
      "status": "scheduled",
      "inspector": {
        "user_id": "usr_456789123",
        "name": "Mike Repair"
      }
    },
    // More inspections...
  ]
}
```

### 78. Get Inspection Details
- **Endpoint**: `GET /api/inspections/{inspection_id}`
- **Access**: Admin, Owner (of property), Tenant (of unit), Inspector assigned
- **Description**: Gets detailed information about an inspection
- **Response** (200 OK):
```json
{
  "inspection_id": "insp_123456789",
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "unit": {
    "unit_id": "unit_123456789",
    "unit_number": "101"
  },
  "tenant": {
    "user_id": "usr_123456789",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "555-123-4567"
  },
  "type": "move_in",
  "scheduled_date": "2025-06-01",
  "scheduled_time": "10:00-12:00",
  "inspector": {
    "user_id": "usr_456789123",
    "name": "Mike Repair",
    "role": "maintenance"
  },
  "status": "completed",
  "condition": "good",
  "notes": "Unit is in good condition with minor wear and tear",
  "items": [
    {
      "category": "kitchen",
      "item": "refrigerator",
      "condition": "excellent",
      "notes": "New appliance, working perfectly",
      "images": ["https://storage.example.com/inspections/insp_123456789_fridge.jpg"]
    },
    // More items...
  ],
  "tenant_notified": true,
  "created_at": "2025-04-30T12:00:00Z",
  "completed_at": "2025-06-01T11:30:00Z",
  "report_url": "https://storage.example.com/inspections/insp_123456789.pdf"
}
```

### 79. Create Vendor
- **Endpoint**: `POST /api/vendors`
- **Access**: Owner, Admin
- **Description**: Creates a new vendor record
- **Request Body**:
```json
{
  "name": "Quality Plumbing Services",
  "contact_person": "Bob Smith",
  "email": "bob@qualityplumbing.com",
  "phone": "555-333-7777",
  "address": {
    "street": "456 Industrial Way",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90044",
    "country": "USA"
  },
  "services": ["plumbing", "water_heater_repair"],
  "insurance_info": {
    "policy_number": "INS-123456",
    "provider": "AllState",
    "expiration_date": "2026-01-15"
  },
  "tax_id": "123-45-6789",
  "notes": "Reliable service provider with 24/7 emergency availability"
}
```
- **Response** (201 Created):
```json
{
  "vendor_id": "vendor_123456789",
  "name": "Quality Plumbing Services",
  "contact_person": "Bob Smith",
  "email": "bob@qualityplumbing.com",
  "phone": "555-333-7777",
  "address": {
    "street": "456 Industrial Way",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90044",
    "country": "USA"
  },
  "services": ["plumbing", "water_heater_repair"],
  "insurance_info": {
    "policy_number": "INS-123456",
    "provider": "AllState",
    "expiration_date": "2026-01-15"
  },
  "tax_id": "123-45-6789",
  "notes": "Reliable service provider with 24/7 emergency availability",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 80. List Vendors
- **Endpoint**: `GET /api/vendors`
- **Access**: Owner, Admin, Maintenance
- **Description**: Lists vendors with optional filtering
- **Query Parameters**: `page`, `limit`, `search`, `services`
- **Response** (200 OK):
```json
{
  "total": 32,
  "page": 1,
  "limit": 10,
  "vendors": [
    {
      "vendor_id": "vendor_123456789",
      "name": "Quality Plumbing Services",
      "contact_person": "Bob Smith",
      "email": "bob@qualityplumbing.com",
      "phone": "555-333-7777",
      "services": ["plumbing", "water_heater_repair"]
    },
    // More vendors...
  ]
}
```

### 81. Get Vendor Details
- **Endpoint**: `GET /api/vendors/{vendor_id}`
- **Access**: Owner, Admin, Maintenance
- **Description**: Gets detailed information about a vendor
- **Response** (200 OK):
```json
{
  "vendor_id": "vendor_123456789",
  "name": "Quality Plumbing Services",
  "contact_person": "Bob Smith",
  "email": "bob@qualityplumbing.com",
  "phone": "555-333-7777",
  "address": {
    "street": "456 Industrial Way",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90044",
    "country": "USA"
  },
  "services": ["plumbing", "water_heater_repair"],
  "insurance_info": {
    "policy_number": "INS-123456",
    "provider": "AllState",
    "expiration_date": "2026-01-15"
  },
  "tax_id": "123-45-6789",
  "notes": "Reliable service provider with 24/7 emergency availability",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z",
  "work_history": {
    "total_jobs": 15,
    "recent_jobs": [
      {
        "request_id": "maint_987654321",
        "property_name": "Sunset Apartments",
        "unit_number": "203",
        "description": "Water heater replacement",
        "cost": 750.00,
        "completed_at": "2025-03-15T15:30:00Z"
      }
    ]
  },
  "documents": [
    {
      "document_id": "doc_987654321",
      "name": "Insurance Certificate",
      "url": "https://storage.example.com/documents/doc_987654321.pdf"
    }
  ]
}
```

### 82. Create Work Order
- **Endpoint**: `POST /api/work-orders`
- **Access**: Owner, Admin, Maintenance
- **Description**: Creates a work order for a vendor
- **Request Body**:
```json
{
  "maintenance_request_id": "maint_123456789",
  "vendor_id": "vendor_123456789",
  "description": "Replace kitchen sink faucet",
  "estimated_cost": 150.00,
  "scheduled_date": "2025-05-05",
  "scheduled_time": "09:00-12:00",
  "priority": "medium",
  "notes": "Tenant will be home during this time"
}
```
- **Response** (201 Created):
```json
{
  "work_order_id": "wo_123456789",
  "maintenance_request_id": "maint_123456789",
  "vendor_id": "vendor_123456789",
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments"
  },
  "unit": {
    "unit_id": "unit_123456789",
    "unit_number": "101"
  },
  "description": "Replace kitchen sink faucet",
  "estimated_cost": 150.00,
  "scheduled_date": "2025-05-05",
  "scheduled_time": "09:00-12:00",
  "priority": "medium",
  "status": "scheduled",
  "notes": "Tenant will be home during this time",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 83. List Work Orders
- **Endpoint**: `GET /api/work-orders`
- **Access**: 
  - Admin: All work orders
  - Owner: Work orders for their properties
  - Maintenance: Work orders they created or are responsible for
- **Description**: Lists work orders with optional filtering
- **Query Parameters**: `page`, `limit`, `property_id`, `vendor_id`, `status`, `priority`, `start_date`, `end_date`
- **Response** (200 OK):
```json
{
  "total": 67,
  "page": 1,
  "limit": 10,
  "work_orders": [
    {
      "work_order_id": "wo_123456789",
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "unit": {
        "unit_id": "unit_123456789",
        "unit_number": "101"
      },
      "vendor": {
        "vendor_id": "vendor_123456789",
        "name": "Quality Plumbing Services"
      },
      "description": "Replace kitchen sink faucet",
      "scheduled_date": "2025-05-05",
      "status": "scheduled",
      "priority": "medium"
    },
    // More work orders...
  ]
}
```

### 84. Complete Work Order
- **Endpoint**: `POST /api/work-orders/{work_order_id}/complete`
- **Access**: Admin, Owner, Maintenance
- **Description**: Marks a work order as completed
- **Request Body**:
```json
{
  "completion_date": "2025-05-05",
  "actual_cost": 165.75,
  "labor_hours": 1.5,
  "materials_used": "New kitchen faucet, supply lines, plumber's tape",
  "notes": "Completed as scheduled. Replaced faucet and tested for leaks.",
  "invoice_number": "INV-12345",
  "invoice_image": "base64encodedimagedatahere..."
}
```
- **Response** (200 OK):
```json
{
  "work_order_id": "wo_123456789",
  "status": "completed",
  "completion_date": "2025-05-05",
  "actual_cost": 165.75,
  "labor_hours": 1.5,
  "materials_used": "New kitchen faucet, supply lines, plumber's tape",
  "notes": "Completed as scheduled. Replaced faucet and tested for leaks.",
  "invoice_number": "INV-12345",
  "invoice_url": "https://storage.example.com/invoices/wo_123456789.pdf",
  "updated_at": "2025-05-05T11:30:00Z"
}
```

### 85. Create Recurring Expense
- **Endpoint**: `POST /api/expenses/recurring`
- **Access**: Owner, Admin
- **Description**: Creates a recurring expense record
- **Request Body**:
```json
{
  "property_id": "prop_123456789",
  "category": "utility",
  "subcategory": "water",
  "description": "Monthly water bill",
  "amount": 350.00,
  "frequency": "monthly",
  "start_date": "2025-05-01",
  "end_date": "2026-04-30",
  "payment_method": "bank_transfer",
  "vendor_id": "vendor_987654321",
  "notes": "Average for 24-unit building"
}
```
- **Response** (201 Created):
```json
{
  "expense_id": "exp_rec_123456789",
  "property_id": "prop_123456789",
  "category": "utility",
  "subcategory": "water",
  "description": "Monthly water bill",
  "amount": 350.00,
  "frequency": "monthly",
  "start_date": "2025-05-01",
  "end_date": "2026-04-30",
  "payment_method": "bank_transfer",
  "vendor": {
    "vendor_id": "vendor_987654321",
    "name": "City Water & Power"
  },
  "status": "active",
  "notes": "Average for 24-unit building",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z",
  "next_occurrence": "2025-05-01"
}
```

### 86. Record One-time Expense
- **Endpoint**: `POST /api/expenses/one-time`
- **Access**: Owner, Admin
- **Description**: Records a one-time expense
- **Request Body**:
```json
{
  "property_id": "prop_123456789",
  "category": "maintenance",
  "subcategory": "repairs",
  "description": "Emergency roof repair",
  "amount": 1250.00,
  "date": "2025-04-25",
  "payment_method": "credit_card",
  "vendor_id": "vendor_456789123",
  "receipt_image": "base64encodedimagedatahere..."
}
```
- **Response** (201 Created):
```json
{
  "expense_id": "exp_ot_123456789",
  "property_id": "prop_123456789",
  "category": "maintenance",
  "subcategory": "repairs",
  "description": "Emergency roof repair",
  "amount": 1250.00,
  "date": "2025-04-25",
  "payment_method": "credit_card",
  "vendor": {
    "vendor_id": "vendor_456789123",
    "name": "TopNotch Roofing"
  },
  "receipt_url": "https://storage.example.com/receipts/exp_ot_123456789.pdf",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 87. List Expenses
- **Endpoint**: `GET /api/expenses`
- **Access**: Owner, Admin
- **Description**: Lists expenses with optional filtering
- **Query Parameters**: `page`, `limit`, `property_id`, `category`, `type` (recurring/one-time), `start_date`, `end_date`
- **Response** (200 OK):
```json
{
  "total": 178,
  "page": 1,
  "limit": 10,
  "expenses": [
    {
      "expense_id": "exp_ot_123456789",
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "type": "one-time",
      "category": "maintenance",
      "subcategory": "repairs",
      "description": "Emergency roof repair",
      "amount": 1250.00,
      "date": "2025-04-25"
    },
    {
      "expense_id": "exp_rec_123456789",
      "property": {
        "property_id": "prop_123456789",
        "name": "Sunset Apartments"
      },
      "type": "recurring",
      "category": "utility",
      "subcategory": "water",
      "description": "Monthly water bill",
      "amount": 350.00,
      "frequency": "monthly",
      "next_occurrence": "2025-05-01"
    },
    // More expenses...
  ]
}
```

### 88. Create Task
- **Endpoint**: `POST /api/tasks`
- **Access**: All Authenticated Users
- **Description**: Creates a task for self or team members
- **Request Body**:
```json
{
  "title": "Call tenant about lease renewal",
  "description": "Discuss lease renewal options with John Doe in Apt 101",
  "due_date": "2025-05-10",
  "priority": "medium",
  "assigned_to": "usr_987654321",
  "associated_entity": {
    "type": "tenant",
    "id": "usr_123456789"
  },
  "reminder_date": "2025-05-09"
}
```
- **Response** (201 Created):
```json
{
  "task_id": "task_123456789",
  "title": "Call tenant about lease renewal",
  "description": "Discuss lease renewal options with John Doe in Apt 101",
  "due_date": "2025-05-10",
  "priority": "medium",
  "status": "pending",
  "created_by": {
    "user_id": "usr_123456789",
    "name": "Jane Smith",
    "role": "owner"
  },
  "assigned_to": {
    "user_id": "usr_987654321",
    "name": "Mark Johnson",
    "role": "admin"
  },
  "associated_entity": {
    "type": "tenant",
    "id": "usr_123456789",
    "name": "John Doe"
  },
  "reminder_date": "2025-05-09",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 89. List Tasks
- **Endpoint**: `GET /api/tasks`
- **Access**: All Authenticated Users
- **Description**: Lists tasks with optional filtering
- **Query Parameters**: `page`, `limit`, `status`, `priority`, `assigned_to`, `due_before`, `due_after`
- **Response** (200 OK):
```json
{
  "total": 45,
  "page": 1,
  "limit": 10,
  "tasks": [
    {
      "task_id": "task_123456789",
      "title": "Call tenant about lease renewal",
      "due_date": "2025-05-10",
      "priority": "medium",
      "status": "pending",
      "assigned_to": {
        "user_id": "usr_987654321",
        "name": "Mark Johnson"
      },
      "created_at": "2025-04-30T12:00:00Z"
    },
    // More tasks...
  ]
}
```

### 90. Update Task Status
- **Endpoint**: `PATCH /api/tasks/{task_id}`
- **Access**: Task Creator, Task Assignee, Admin
- **Description**: Updates task status and details
- **Request Body**:
```json
{
  "status": "completed",
  "completion_notes": "Called tenant, they will renew for another year at new rate"
}
```
- **Response** (200 OK):
```json
{
  "task_id": "task_123456789",
  "status": "completed",
  "completion_notes": "Called tenant, they will renew for another year at new rate",
  "completed_at": "2025-05-08T14:30:00Z",
  "completed_by": {
    "user_id": "usr_987654321",
    "name": "Mark Johnson"
  },
  "updated_at": "2025-05-08T14:30:00Z"
}
```

### 91. Create Tenant Portal Invitation
- **Endpoint**: `POST /api/tenants/invite`
- **Access**: Owner, Admin
- **Description**: Sends an invitation to a tenant to join the portal
- **Request Body**:
```json
{
  "email": "tenant@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "555-123-4567",
  "unit_id": "unit_123456789",
  "message": "Welcome to Sunset Apartments! Please join our tenant portal to manage your lease and payments."
}
```
- **Response** (201 Created):
```json
{
  "invitation_id": "inv_123456789",
  "email": "tenant@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "unit_id": "unit_123456789",
  "status": "sent",
  "expires_at": "2025-05-14T12:00:00Z",
  "created_at": "2025-04-30T12:00:00Z"
}
```

### 92. Get Property Tax Information
- **Endpoint**: `GET /api/properties/{property_id}/taxes`
- **Access**: Owner (of property), Admin
- **Description**: Gets property tax information and history
- **Response** (200 OK):
```json
{
  "property_id": "prop_123456789",
  "property_name": "Sunset Apartments",
  "tax_id": "APN-12345-6789",
  "annual_assessment": 750000.00,
  "current_year_taxes": 9375.00,
  "payment_schedule": [
    {
      "due_date": "2025-11-01",
      "amount": 4687.50,
      "status": "upcoming"
    },
    {
      "due_date": "2026-02-01",
      "amount": 4687.50,
      "status": "upcoming"
    }
  ],
  "tax_history": [
    {
      "year": 2024,
      "assessment": 725000.00,
      "total_taxes": 9062.50,
      "payments": [
        {
          "date": "2024-10-28",
          "amount": 4531.25,
          "receipt_url": "https://storage.example.com/tax_receipts/prop_123456789_2024_1.pdf"
        },
        {
          "date": "2025-01-25",
          "amount": 4531.25,
          "receipt_url": "https://storage.example.com/tax_receipts/prop_123456789_2024_2.pdf"
        }
      ]
    }
  ]
}
```

### 93. Update Rental Market Analysis
- **Endpoint**: `POST /api/properties/{property_id}/market-analysis`
- **Access**: Owner (of property), Admin
- **Description**: Updates rental market analysis for a property
- **Request Body**:
```json
{
  "analysis_date": "2025-04-30",
  "comparable_properties": [
    {
      "address": "456 Sunset Blvd",
      "distance_miles": 0.5,
      "bedrooms": 2,
      "rent_amount": 1950.00,
      "square_feet": 975,
      "year_built": 1990,
      "amenities": ["pool", "gym", "covered_parking"]
    },
    // More comparable properties...
  ],
  "suggested_rent_adjustments": [
    {
      "unit_type": "1bed_1bath",
      "current_average": 1650.00,
      "suggested_rent": 1700.00,
      "market_average": 1750.00
    },
    {
      "unit_type": "2bed_2bath",
      "current_average": 1950.00,
      "suggested_rent": 2050.00,
      "market_average": 2100.00
    }
  ],
  "notes": "Market showing strong demand for 2-bedroom units in this area"
}
```
- **Response** (201 Created):
```json
{
  "analysis_id": "analysis_123456789",
  "property_id": "prop_123456789",
  "analysis_date": "2025-04-30",
  "comparable_properties_count": 5,
  "suggested_rent_adjustments": [
    {
      "unit_type": "1bed_1bath",
      "current_average": 1650.00,
      "suggested_rent": 1700.00,
      "market_average": 1750.00
    },
    {
      "unit_type": "2bed_2bath",
      "current_average": 1950.00,
      "suggested_rent": 2050.00,
      "market_average": 2100.00
    }
  ],
  "created_by": {
    "user_id": "usr_123456789",
    "name": "Jane Smith"
  },
  "created_at": "2025-04-30T12:00:00Z",
  "report_url": "https://storage.example.com/market_analysis/analysis_123456789.pdf"
}
```

### 94. List Users by Role
- **Endpoint**: `GET /api/users`
- **Access**: Admin
- **Description**: Lists users with role-based filtering
- **Query Parameters**: `page`, `limit`, `role`, `status`, `search`
- **Response** (200 OK):
```json
{
  "total": 156,
  "page": 1,
  "limit": 10,
  "users": [
    {
      "user_id": "usr_123456789",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "tenant",
      "status": "active",
      "created_at": "2025-01-01T12:00:00Z"
    },
    // More users...
  ]
}
```

### 95. Get Tenant Rental History
- **Endpoint**: `GET /api/tenants/{tenant_id}/rental-history`
- **Access**: Admin, Owner (of tenant's current property)
- **Description**: Gets rental history for a tenant
- **Response** (200 OK):
```json
{
  "tenant_id": "usr_123456789",
  "first_name": "John",
  "last_name": "Doe",
  "current_residence": {
    "property": {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments"
    },
    "unit": {
      "unit_id": "unit_123456789",
      "unit_number": "101"
    },
    "move_in_date": "2025-01-01",
    "current_rent": 1800.00,
    "lease_end_date": "2025-12-31"
  },
  "rental_history": [
    {
      "property_name": "Oakwood Apartments",
      "unit_number": "205",
      "move_in_date": "2023-01-15",
      "move_out_date": "2024-12-31",
      "initial_rent": 1600.00,
      "final_rent": 1700.00,
      "payment_history": {
        "on_time_percentage": 95,
        "late_payments": 1,
        "missed_payments": 0
      },
      "maintenance_requests": 4,
      "notes": "Good tenant, no complaints from neighbors"
    }
  ],
  "payment_summary": {
    "lifetime_on_time_percentage": 97,
    "average_days_early": 2
  }
}
```

### 96. Submit Tenant Review
- **Endpoint**: `POST /api/maintenance-requests/{request_id}/review`
- **Access**: Tenant (of request)
- **Description**: Submits a review for completed maintenance work
- **Request Body**:
```json
{
  "rating": 5,
  "comments": "Very professional service. Fixed the issue quickly and cleaned up afterward.",
  "response_time_rating": 5,
  "quality_rating": 5,
  "professionalism_rating": 5
}
```
- **Response** (201 Created):
```json
{
  "review_id": "review_123456789",
  "request_id": "maint_123456789",
  "tenant_id": "usr_123456789",
  "rating": 5,
  "comments": "Very professional service. Fixed the issue quickly and cleaned up afterward.",
  "response_time_rating": 5,
  "quality_rating": 5,
  "professionalism_rating": 5,
  "created_at": "2025-05-05T15:30:00Z"
}
```

### 97. Generate Rent Roll Report
- **Endpoint**: `POST /api/reports/rent-roll`
- **Access**: Owner, Admin
- **Description**: Generates a rent roll report for properties
- **Request Body**:
```json
{
  "property_ids": ["prop_123456789"],
  "as_of_date": "2025-04-30",
  "include_vacant": true,
  "include_tenant_details": true,
  "format": "xlsx"
}
```
- **Response** (200 OK):
```json
{
  "report_id": "report_123456789",
  "type": "rent_roll",
  "properties": [
    {
      "property_id": "prop_123456789",
      "name": "Sunset Apartments"
    }
  ],
  "as_of_date": "2025-04-30",
  "summary": {
    "total_units": 24,
    "occupied_units": 21,
    "vacancy_rate": 12.5,
    "potential_gross_income": 41600.00,
    "actual_gross_income": 37800.00,
    "vacancy_loss": 3800.00
  },
  "report_url": "https://storage.example.com/reports/report_123456789.xlsx",
  "generated_at": "2025-04-30T12:00:00Z"
}
```

### 98. Create Insurance Policy
- **Endpoint**: `POST /api/properties/{property_id}/insurance`
- **Access**: Owner (of property), Admin
- **Description**: Creates an insurance policy record for a property
- **Request Body**:
```json
{
  "insurance_type": "property",
  "provider": "AllState Insurance",
  "policy_number": "POL-123456789",
  "coverage_amount": 2500000.00,
  "deductible": 10000.00,
  "premium": 12500.00,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "coverage_details": {
    "liability": 1000000.00,
    "contents": 250000.00,
    "loss_of_income": 500000.00
  },
  "agent": {
    "name": "Sarah Thompson",
    "email": "sarah@allstate.com",
    "phone": "555-444-8888"
  },
  "policy_document": "base64encodedimagedatahere..."
}
```
- **Response** (201 Created):
```json
{
  "insurance_id": "ins_123456789",
  "property_id": "prop_123456789",
  "insurance_type": "property",
  "provider": "AllState Insurance",
  "policy_number": "POL-123456789",
  "coverage_amount": 2500000.00,
  "deductible": 10000.00,
  "premium": 12500.00,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "coverage_details": {
    "liability": 1000000.00,
    "contents": 250000.00,
    "loss_of_income": 500000.00
  },
  "agent": {
    "name": "Sarah Thompson",
    "email": "sarah@allstate.com",
    "phone": "555-444-8888"
  },
  "status": "active",
  "policy_document_url": "https://storage.example.com/insurance/ins_123456789.pdf",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

### 99. Get Property Analytics
- **Endpoint**: `GET /api/properties/{property_id}/analytics`
- **Access**: Owner (of property), Admin
- **Description**: Gets analytics data for a property
- **Query Parameters**: `period` (month/quarter/year), `start_date`, `end_date`
- **Response** (200 OK):
```json
{
  "property_id": "prop_123456789",
  "property_name": "Sunset Apartments",
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-04-30"
  },
  "financial": {
    "total_income": 148500.00,
    "total_expenses": 42300.00,
    "net_operating_income": 106200.00,
    "cap_rate": 6.8,
    "expense_breakdown": {
      "maintenance": 15600.00,
      "property_taxes": 9375.00,
      "insurance": 4200.00,
      "utilities": 10200.00,
      "management": 2925.00
    },
    "trends": {
      "income": [
        {"month": "Jan 2025", "value": 36800.00},
        {"month": "Feb 2025", "value": 36800.00},
        {"month": "Mar 2025", "value": 37100.00},
        {"month": "Apr 2025", "value": 37800.00}
      ],
      "expenses": [
        {"month": "Jan 2025", "value": 10800.00},
        {"month": "Feb 2025", "value": 9800.00},
        {"month": "Mar 2025", "value": 11200.00},
        {"month": "Apr 2025", "value": 10500.00}
      ]
    }
  },
  "occupancy": {
    "current_rate": 87.5,
    "trend": [
      {"month": "Jan 2025", "value": 83.3},
      {"month": "Feb 2025", "value": 87.5},
      {"month": "Mar 2025", "value": 87.5},
      {"month": "Apr 2025", "value": 87.5}
    ],
    "average_days_vacant": 18,
    "turnover_rate": 4.2
  },
  "maintenance": {
    "total_requests": 47,
    "avg_resolution_time_days": 2.3,
    "total_cost": 15600.00,
    "requests_by_category": {
      "plumbing": 15,
      "electrical": 12,
      "hvac": 8,
      "appliance": 6,
      "other": 6
    }
  },
  "tenant_satisfaction": {
    "average_rating": 4.2,
    "ratings_by_category": {
      "maintenance": 4.5,
      "communication": 4.0,
      "property_condition": 3.9,
      "value": 4.1
    }
  }
}
```

### 100. Create Public Listing
- **Endpoint**: `POST /api/units/{unit_id}/listing`
- **Access**: Owner (of property), Admin
- **Description**: Creates a public rental listing for a vacant unit
- **Request Body**:
```json
{
  "title": "Spacious 2-Bedroom Apartment with Balcony in Downtown LA",
  "description": "Beautiful 2-bedroom apartment featuring hardwood floors, updated kitchen with stainless steel appliances, and private balcony with city views...",
  "monthly_rent": 1850.00,
  "security_deposit": 1850.00,
  "available_date": "2025-06-01",
  "lease_terms": [6, 12],
  "pet_policy": {
    "allowed": true,
    "restrictions": "Cats and small dogs under 25 lbs",
    "pet_deposit": 300.00
  },
  "utilities_included": ["water", "trash"],
  "amenities_highlight": ["dishwasher", "air_conditioning", "balcony", "on-site_laundry"],
  "application_fee": 35.00,
  "featured_photos": ["base64encodedimagedatahere...", "base64encodedimagedatahere..."],
  "video_tour_url": "https://example.com/video/apt101tour",
  "showing_instructions": "Available for viewing weekdays 9 AM - 5 PM by appointment only"
}
```
- **Response** (201 Created):
```json
{
  "listing_id": "list_123456789",
  "unit_id": "unit_123456789",
  "property": {
    "property_id": "prop_123456789",
    "name": "Sunset Apartments",
    "address": {
      "street": "123 Sunset Blvd",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    }
  },
  "title": "Spacious 2-Bedroom Apartment with Balcony in Downtown LA",
  "monthly_rent": 1850.00,
  "security_deposit": 1850.00,
  "available_date": "2025-06-01",
  "status": "active",
  "featured_photos": [
    "https://storage.example.com/listings/list_123456789_1.jpg",
    "https://storage.example.com/listings/list_123456789_2.jpg"
  ],
  "public_url": "https://rentals.example.com/listings/list_123456789",
  "created_at": "2025-04-30T12:00:00Z",
  "updated_at": "2025-04-30T12:00:00Z"
}
```

This comprehensive list of 100 API endpoints covers all the core functionality required for a full-featured property management portal that serves owners, tenants, administrators, and maintenance personnel. Each endpoint includes sample request and response data to help guide your implementation.
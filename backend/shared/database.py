import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
# Try standard names first, then fallback to VITE_ prefixed ones
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("""
    Missing Supabase environment variables. 
    
    Please ensure either of these variables are set in your .env file:
    - SUPABASE_URL or VITE_SUPABASE_URL
    - SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY
    
    You can find these values in your Supabase project:
    1. Go to https://supabase.com and sign in
    2. Open your project
    3. Go to Project Settings > API
    4. For SUPABASE_URL, use the "Project URL"
    5. For SUPABASE_SERVICE_ROLE_KEY, use the "service_role" key (keep this secret!)
    """)

# Initialize Supabase client
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Helper functions for common database operations

async def get_by_id(table: str, id: str):
    """Get a record by ID"""
    response = await supabase_client.table(table).select("*").eq("id", id).execute()
    return response.data[0] if response.data else None

async def create(table: str, data: dict):
    """Create a new record"""
    response = await supabase_client.table(table).insert(data).execute()
    return response.data[0] if response.data else None

async def update(table: str, id: str, data: dict):
    """Update a record by ID"""
    response = await supabase_client.table(table).update(data).eq("id", id).execute()
    return response.data[0] if response.data else None

async def delete_by_id(table: str, id: str):
    """Delete a record by ID"""
    response = await supabase_client.table(table).delete().eq("id", id).execute()
    return response.data[0] if response.data else None

async def query_table(table: str, query_func=None):
    """Query a table with an optional query function"""
    query = supabase_client.table(table).select("*")
    if query_func:
        query = query_func(query)
    response = await query.execute()
    return response.data 
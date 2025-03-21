import uvicorn
import os
import sys

if __name__ == "__main__":
    # Set the environment variable for the Python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.append(current_dir)
    
    # Run the FastAPI application with extended timeout
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        timeout_keep_alive=300,  # Extended keep-alive timeout
        log_level="info"
    ) 
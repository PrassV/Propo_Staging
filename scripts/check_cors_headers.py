#!/usr/bin/env python3
"""
Simple script to check CORS headers of an API endpoint.
This makes a simple OPTIONS request and prints the CORS headers to help debug issues.
"""

import requests
import sys
import argparse
import json

def main():
    parser = argparse.ArgumentParser(description="Check CORS headers for a URL")
    parser.add_argument("url", help="The URL to check")
    parser.add_argument("--origin", default="https://propo-staging.vercel.app",
                        help="Origin header to use in the request")
    args = parser.parse_args()
    
    print(f"Checking CORS headers for: {args.url}")
    print(f"Using origin: {args.origin}")
    print("="*80)
    
    headers = {
        "Origin": args.origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
    }
    
    try:
        response = requests.options(args.url, headers=headers, timeout=10)
        
        print(f"Status code: {response.status_code}")
        print("\nAll response headers:")
        for key, value in response.headers.items():
            print(f"{key}: {value}")
        
        print("\nCORS-specific headers:")
        cors_headers = [
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers",
            "Access-Control-Allow-Credentials",
            "Access-Control-Max-Age",
            "Access-Control-Expose-Headers",
        ]
        
        for header in cors_headers:
            if header in response.headers:
                print(f"{header}: {response.headers[header]}")
            else:
                print(f"{header}: NOT PRESENT")
                
        # Quick assessment
        if "Access-Control-Allow-Origin" in response.headers:
            origin_header = response.headers["Access-Control-Allow-Origin"]
            if origin_header == args.origin or origin_header == "*":
                print("\n✓ Origin is correctly allowed")
            else:
                print(f"\n✗ Origin is not correctly allowed. Expected '{args.origin}' but got '{origin_header}'")
        else:
            print("\n✗ Access-Control-Allow-Origin header is missing")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main() 
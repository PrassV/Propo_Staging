#!/usr/bin/env python3
"""
CORS Debugging Script

This script tests CORS preflight (OPTIONS) requests against your API endpoints
to help diagnose issues with CORS configuration.
"""

import requests
import sys
import json
from urllib.parse import urlparse
import argparse

def parse_args():
    parser = argparse.ArgumentParser(description='Test CORS preflight handling of an API endpoint')
    parser.add_argument('url', help='API endpoint URL to test')
    parser.add_argument('--origin', default='https://propo-staging.vercel.app', 
                      help='Origin header to use in the request (default: https://propo-staging.vercel.app)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed request and response information')
    return parser.parse_args()

def format_headers(headers, indent=2):
    """Format headers dictionary for pretty printing"""
    return json.dumps({k: v for k, v in headers.items()}, indent=indent)

def test_options_request(url, origin, verbose=False):
    """Test OPTIONS request to the specified URL"""
    print(f"\n{'='*80}\nTesting OPTIONS request to: {url}\n{'='*80}")
    
    # Extract base URL for Origin header if not specified
    parsed_url = urlparse(url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
    
    # Headers for OPTIONS request
    headers = {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
        'User-Agent': 'Mozilla/5.0 CORS Debug Script'
    }
    
    if verbose:
        print(f"\nRequest Headers:\n{format_headers(headers)}\n")
    
    try:
        # Make OPTIONS request
        response = requests.options(url, headers=headers, timeout=10)
        
        # Print response details
        print(f"Response Status: {response.status_code}")
        
        if verbose:
            print(f"Response Headers:\n{format_headers(dict(response.headers))}\n")
        
        # Check for CORS headers
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Credentials',
            'Access-Control-Max-Age'
        ]
        
        print("\nCORS Headers Found:")
        for header in cors_headers:
            value = response.headers.get(header)
            if value:
                print(f"  ✅ {header}: {value}")
            else:
                print(f"  ❌ {header}: Not present")
        
        # Analyze potential issues
        print("\nAnalysis:")
        
        # Check status code
        if response.status_code != 200:
            print(f"  ❌ OPTIONS request returned status {response.status_code} instead of 200")
        
        # Check Allow-Origin
        allow_origin = response.headers.get('Access-Control-Allow-Origin')
        if not allow_origin:
            print("  ❌ Access-Control-Allow-Origin header is missing")
        elif allow_origin != origin and allow_origin != '*':
            print(f"  ❌ Access-Control-Allow-Origin does not match request origin: {origin}")
        
        # Check Allow-Headers
        allow_headers = response.headers.get('Access-Control-Allow-Headers', '')
        if not allow_headers:
            print("  ❌ Access-Control-Allow-Headers header is missing")
        else:
            # Check if all requested headers are allowed
            requested_headers = ['Content-Type', 'Authorization']
            allowed_headers = [h.strip().lower() for h in allow_headers.split(',')]
            
            for header in requested_headers:
                if header.lower() not in allowed_headers and '*' not in allowed_headers:
                    print(f"  ❌ Header '{header}' is not included in Access-Control-Allow-Headers")
        
        # Check Allow-Methods
        allow_methods = response.headers.get('Access-Control-Allow-Methods', '')
        if not allow_methods:
            print("  ❌ Access-Control-Allow-Methods header is missing")
        elif 'GET' not in allow_methods and '*' not in allow_methods:
            print("  ❌ GET method is not included in Access-Control-Allow-Methods")
        
        # Check if all required CORS headers are present
        missing_headers = [h for h in cors_headers if h not in response.headers]
        if missing_headers:
            print(f"  ❌ Missing essential CORS headers: {', '.join(missing_headers)}")
        
        # Overall assessment
        if (response.status_code == 200 and 
            allow_origin and (allow_origin == origin or allow_origin == '*') and
            allow_headers and allow_methods):
            print("\n✅ OPTIONS request appears to be correctly configured for CORS")
        else:
            print("\n❌ OPTIONS request is not correctly configured for CORS")
        
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")
    
    print(f"\n{'='*80}\n")

def test_get_request(url, origin, verbose=False):
    """Test GET request to the specified URL"""
    print(f"\n{'='*80}\nTesting direct GET request to: {url}\n{'='*80}")
    
    # Headers for GET request
    headers = {
        'Origin': origin,
        'User-Agent': 'Mozilla/5.0 CORS Debug Script'
    }
    
    if verbose:
        print(f"\nRequest Headers:\n{format_headers(headers)}\n")
    
    try:
        # Make GET request
        response = requests.get(url, headers=headers, timeout=10)
        
        # Print response details
        print(f"Response Status: {response.status_code}")
        
        if verbose:
            print(f"Response Headers:\n{format_headers(dict(response.headers))}\n")
        
        # Check for CORS headers
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Credentials',
            'Access-Control-Expose-Headers'
        ]
        
        print("\nCORS Headers Found in GET response:")
        for header in cors_headers:
            value = response.headers.get(header)
            if value:
                print(f"  ✅ {header}: {value}")
            else:
                print(f"  ❌ {header}: Not present")
                
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")
    
    print(f"\n{'='*80}\n")

def main():
    args = parse_args()
    
    print(f"""
CORS Debugging Tool
==================
Testing URL: {args.url}
Origin: {args.origin}
Verbose: {'Yes' if args.verbose else 'No'}
    """)
    
    test_options_request(args.url, args.origin, args.verbose)
    test_get_request(args.url, args.origin, args.verbose)
    
    print("Debugging complete.")

if __name__ == "__main__":
    main() 
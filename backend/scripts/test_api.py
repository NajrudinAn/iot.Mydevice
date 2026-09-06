#!/usr/bin/env python3
import argparse
import requests
import json
import sys
import time

def print_result(method, url, res):
    print(f"\n[{method}] {url}")
    print(f"Status Code: {res.status_code}")
    try:
        data = res.json()
        print("Response JSON:")
        print(json.dumps(data, indent=2))
    except ValueError:
        print("Response Content (Not JSON):")
        print(res.text)
    print("-" * 50)

def main():
    parser = argparse.ArgumentParser(description="MyDevice API Tester")
    parser.add_argument("url", help="The full API URL to test (e.g. http://localhost:5173/api/v1/public/.../...)")
    parser.add_argument("-m", "--method", default="GET", choices=["GET", "POST"], help="HTTP Method")
    parser.add_argument("-k", "--api-key", help="API Key (for API_KEY_SECRET auth)")
    parser.add_argument("-s", "--api-secret", help="API Secret (for API_KEY_SECRET auth)")
    parser.add_argument("-t", "--token", help="Bearer Token (for APPLICATION_SESSION auth)")
    parser.add_argument("-d", "--data", help="JSON string for POST body (e.g. '{\"device_id\":\"uuid\", \"type\":\"TURN_ON\"}')")
    
    args = parser.parse_args()

    headers = {}
    if args.api_key and args.api_secret:
        headers["X-API-Key"] = args.api_key
        headers["X-API-Secret"] = args.api_secret
    elif args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    if args.method == "POST":
        headers["Content-Type"] = "application/json"
        
    payload = None
    if args.data:
        try:
            payload = json.loads(args.data)
        except json.JSONDecodeError:
            print("Error: Invalid JSON data provided in --data parameter.")
            sys.exit(1)

    print(f"Executing {args.method} request to {args.url}...")
    
    start_time = time.time()
    try:
        if args.method == "GET":
            res = requests.get(args.url, headers=headers)
        elif args.method == "POST":
            res = requests.post(args.url, headers=headers, json=payload)
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        sys.exit(1)
        
    end_time = time.time()
    print(f"Request completed in {((end_time - start_time) * 1000):.2f}ms")
    
    print_result(args.method, args.url, res)

if __name__ == "__main__":
    main()

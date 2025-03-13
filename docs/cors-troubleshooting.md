# CORS Issues Troubleshooting Guide

## What is CORS?

Cross-Origin Resource Sharing (CORS) is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the original page. This is a security measure to prevent malicious websites from accessing sensitive data from other domains.

## The Issue We Experienced

Our frontend hosted on `propo-staging.vercel.app` couldn't fetch data from our backend API on `propostaging-production.up.railway.app` due to CORS restrictions. The browser blocked these requests with the following error:

```
Access to fetch at 'https://propostaging-production.up.railway.app/properties/user/ee13ce27-680d-429a-a0cb-ea273b034a61' from origin 'https://propo-staging.vercel.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution

We implemented a multi-part solution to resolve this issue:

### Backend Changes

1. **Updated CORS settings** in `backend/config/settings.py` to explicitly include our Vercel frontend domain:
   ```python
   DEFAULT_CORS_ORIGINS = [
       "http://localhost:3000",
       "http://localhost:5173",
       "http://127.0.0.1:3000",
       "http://127.0.0.1:5173",
       "https://propo-staging.vercel.app",  # Added this
       "https://propify.netlify.app",       # Added this
   ]
   ```

2. **Enhanced CORS middleware configuration** in `backend/main.py` to better handle preflight requests:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=CORS_ORIGINS,
       allow_credentials=True,
       allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
       allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
       expose_headers=["Content-Length"],
       max_age=600,  # Cache preflight requests for 10 minutes
   )
   ```

3. **Created a CORS diagnostics utility** at `backend/utils/cors_check.py` to help identify and debug CORS issues.

### Frontend Changes

1. **Updated the API fetch function** in `src/utils/api.ts` to handle CORS issues:
   ```typescript
   return fetch(url, {
     ...options,
     mode: 'cors',
     credentials: 'include',
     headers: {
       ...headers,
       'Access-Control-Allow-Origin': '*',
       ...(options.headers || {})
     }
   });
   ```

### Deployment Changes

1. **Created an update script** at `scripts/update_cors.sh` to easily update the CORS settings on Railway:
   ```bash
   railway variables set FRONTEND_URL=https://propo-staging.vercel.app ENVIRONMENT=production
   ```

## How to Verify the Fix

1. Deploy the backend changes to Railway
2. Run the `scripts/update_cors.sh` script to update environment variables
3. Redeploy the backend to apply the new environment variables
4. Run the CORS diagnostics utility to verify the configuration:
   ```bash
   cd backend
   python -m utils.cors_check
   ```
5. Verify that your frontend can now successfully fetch data from the backend

## Future CORS Considerations

When deploying to new domains or environments, you'll need to:

1. Add the new frontend domain to `DEFAULT_CORS_ORIGINS` in `backend/config/settings.py`
2. Update the `FRONTEND_URL` environment variable in your Railway deployment
3. Redeploy the backend

If CORS issues persist, use the diagnostics utility to check the configuration and browser dev tools to check the actual headers being sent and received. 
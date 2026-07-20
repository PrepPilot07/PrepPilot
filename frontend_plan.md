# Frontend EC2 Deployment Plan

## User Review Required
No breaking changes. This plan will install Nginx on your EC2 instance to serve your frontend. 

## Proposed Changes

### 1. Build the Frontend
We will install the frontend dependencies and run the Vite build process. 
Crucially, because this is running on EC2, we must tell the frontend where to find the backend. We will dynamically fetch your EC2's Public IP and inject it into the build process as `VITE_API_URL`.

### 2. Install and Configure Nginx
Nginx is the industry-standard web server for serving static files. We will:
- Install `nginx` via `apt`.
- Create a configuration file that points to your `frontend/dist` folder.
- Add a fallback rule (`try_files $uri $uri/ /index.html;`) which is strictly required for React Router to work correctly on a Single Page Application.

### 3. Open Port 80 (HTTP)
Just like we opened port 3000 for the backend, we must open port 80 for Nginx so the world can access your frontend in their web browsers.

## Verification Plan
1. I will provide you with the exact IP address link.
2. We will visit the link in the browser to ensure the React app loads.
3. We will verify that API requests to the backend (like logging in) succeed.

import axios from "axios";
import ConfigService from "./utils/config";
import auth from "./utils/auth";
import config from './config.json';

export const BACKEND_URL = `${config.API_BASE_URL}`;

export const getBackendUrl = () => {
  return BACKEND_URL;
};

// Create axios instance with default config
const http = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    "Content-type": "application/json",
  }
});

// Attach auth/workspace headers per request rather than once at module
// load -- login/logout/workspace-switch all happen via client-side route
// changes (no full page reload), so a value baked in at import time goes
// stale for the rest of the session: every request after a normal login
// was silently going out with no Authorization header at all, which the
// backend both rejects (403) and rate-limits far more aggressively (the
// unauthenticated per-IP bucket, not the per-user one) -- surfacing to
// users as 429s after just a few clicks.
http.interceptors.request.use((requestConfig) => {
  const access_token = localStorage.getItem('access_token');
  if (access_token) {
    requestConfig.headers.Authorization = `Bearer ${access_token}`;
  }

  const isPublicRoute = window.location.pathname.startsWith('/shared/note/');
  if (!isPublicRoute) {
    try {
      const workspace = ConfigService.getDefaultWorkspace();
      if (workspace?.workspace_id) {
        requestConfig.headers['Workspace-Id'] = workspace.workspace_id;
      }
    } catch (error) {
      // No workspace selected yet -- fine for routes that don't need one.
    }
  }

  return requestConfig;
});

// Add response interceptor to handle errors
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle expired signature error
      if (error.response.status === 403 && 
          error.response.data?.detail === "Signature has expired") {
        // Force logout
        auth.logout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default http;
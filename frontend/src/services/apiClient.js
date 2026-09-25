/**
 * apiClient.js
 * Centralized HTTP Client for CivicSync Frontend.
 *
 * Direct communication with Express backend.
 * Reads token from localStorage, attaches Authorization header,
 * handles 401/403/500 errors uniformly without throwing unhandled exceptions.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const TOKEN_KEY = "civicsync_token";
export const USER_KEY = "civicsync_user";

export function getStoredToken() {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t || t === "null" || t === "undefined" || t.trim() === "") {
      return null;
    }
    return t;
  } catch (e) {
    console.error("Storage access error:", e);
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token && token !== "null" && token !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.error("Storage write error:", e);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || raw === "null" || raw === "undefined") {
      return null;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("User storage parse error:", e);
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.error("User storage write error:", e);
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error("Storage clear error:", e);
  }
}

/**
 * Returns a full URL for a static file (e.g., /uploads/...)
 * Ensures we don't hardcode localhost.
 */
export function getFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  
  // Base URL for uploads is the API_BASE_URL minus the /api part
  let baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  if (baseUrl.endsWith("/api")) {
    baseUrl = baseUrl.slice(0, -4);
  }
  
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Universal Request Handler
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = "GET",
    body = null,
    headers = {},
    params = null,
    requireAuth = true,
  } = options;

  let finalEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  // Ensure endpoint is prefixed with /api
  if (!finalEndpoint.startsWith("/api/")) {
    finalEndpoint = `/api${finalEndpoint}`;
  }

  // Ensure API_BASE_URL doesn't end with slash
  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

  let url = `${baseUrl}${finalEndpoint}`;
  
  // Clean up any double /api/api/ that might occur if baseUrl already includes /api
  while (url.includes("/api/api/")) {
    url = url.replace("/api/api/", "/api/");
  }

  if (params && typeof params === "object") {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, val);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  const token = getStoredToken();
  if (token && requireAuth !== false) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers: defaultHeaders,
  };

  if (body !== null && method !== "GET" && method !== "HEAD") {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const error = new Error(
        data?.message || data?.error || `HTTP ${response.status}: Request failed`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Network errors (e.g. backend not reachable)
    if (!err.status) {
      const networkError = new Error(
        `Unable to reach CivicSync server at ${API_BASE_URL}. Please ensure the backend is running.`
      );
      networkError.status = 0;
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw err;
  }
}

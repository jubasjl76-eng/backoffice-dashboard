/**
 * Backend Client with Automatic Discovery
 * Tries local backend first, then falls back to cloud
 */

const LOCAL_BACKEND_URLS = [
  'http://localhost:3000',
  'http://local-pet-backend:3000',
  'http://raspberrypi.local:3000',
];

const CLOUD_BACKEND_URL = process.env.REACT_APP_CLOUD_BACKEND_URL || 'https://api.petsmart.example.com';

interface BackendConfig {
  baseURL: string;
  isLocal: boolean;
}

class BackendClient {
  private baseURL: string = CLOUD_BACKEND_URL;
  private isLocal: boolean = false;
  private checked: boolean = false;

  async discover(): Promise<BackendConfig> {
    if (this.checked) {
      return { baseURL: this.baseURL, isLocal: this.isLocal };
    }

    // Try local backends first
    for (const url of LOCAL_BACKEND_URLS) {
      try {
        const response = await fetch(`${url}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          console.log(`[Backend] Using local backend: ${url}`);
          this.baseURL = url;
          this.isLocal = true;
          this.checked = true;
          return { baseURL: this.baseURL, isLocal: this.isLocal };
        }
      } catch {
        // Try next URL
      }
    }

    // Fall back to cloud
    console.log(`[Backend] Using cloud backend: ${CLOUD_BACKEND_URL}`);
    this.baseURL = CLOUD_BACKEND_URL;
    this.isLocal = false;
    this.checked = true;
    return { baseURL: this.baseURL, isLocal: this.isLocal };
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  isUsingLocal(): boolean {
    return this.isLocal;
  }

  // API methods
  async get<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  }

  async post<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  }
}

export const backend = new BackendClient();
export default backend;

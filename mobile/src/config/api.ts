// API configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PRODUCTION_URL = 'https://factoapp.replit.app';

// Enhanced logging for API configuration
const logApiConfig = () => {
  console.log('[API Config] Environment:', {
    platform: Platform.OS,
    isDev: __DEV__,
    prodUrl: PRODUCTION_URL
  });
};

export const getApiUrl = () => {
  logApiConfig();
  return PRODUCTION_URL;
};

// API endpoints configuration
export const API_ENDPOINTS = {
  blocks: {
    list: '/api/blocks',
    add: '/api/blocks/add'
  },
  productionJobs: '/api/production-jobs',
  machines: '/api/machines',
  blades: '/api/blades',
  analytics: '/api/analytics/production',
  finishedGoods: {
    stands: '/api/finished-goods/stands',
    ship: '/api/finished-goods/shipments',
    byStand: '/api/finished-goods/by-stand',
    shipments: (id?: number) => {
      const baseEndpoint = '/api/finished-goods/shipments';
      return id ? `${baseEndpoint}/${id}` : baseEndpoint;
    },
    summary: '/api/finished-goods/summary',
    add: '/api/finished-goods/add'
  },
  cuttingJobs: '/api/production-jobs?stage=cutting',
  chemicalJobs: '/api/production-jobs?stage=chemical_conversion',
  grindingJobs: '/api/production-jobs?stage=grinding',
  epoxyJobs: '/api/production-jobs?stage=epoxy',
  polishingJobs: '/api/production-jobs?stage=polishing',
};

// Enhanced error types
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Enhanced fetchWithRetry with better error handling and response validation
export const fetchWithRetry = async (url: string, options?: RequestInit) => {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;
  const ACCEPT_HEADER = 'application/json';

  let lastError: Error | undefined;
  let attemptCount = 0;

  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      'Accept': ACCEPT_HEADER,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // Helps prevent HTML responses
      ...options?.headers,
    },
  };

  while (attemptCount < MAX_RETRIES) {
    try {
      const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, attemptCount);

      if (attemptCount > 0) {
        console.log(`[API] Retry attempt ${attemptCount + 1}/${MAX_RETRIES} after ${retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      const fullUrl = url.startsWith('http') ? url : getFullApiUrl(url);

      console.log('[API Request]', {
        attempt: attemptCount + 1,
        url: fullUrl,
        method: enhancedOptions.method || 'GET',
        headers: enhancedOptions.headers,
      });

      const response = await fetch(fullUrl, enhancedOptions);
      const contentType = response.headers.get('content-type') || '';

      // Check if response is JSON before trying to parse
      if (!contentType.includes('application/json')) {
        throw new ApiError(
          'Expected JSON response but received different content type',
          response.status,
          { contentType, url: fullUrl }
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          `HTTP error! status: ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error('[API] Request failed:', {
        message: lastError.message,
        name: lastError.name,
        attempt: attemptCount + 1,
        url,
        method: enhancedOptions.method || 'GET',
      });

      // Don't retry if we got a response but it wasn't JSON
      if (error instanceof ApiError && error.status) {
        throw error;
      }

      attemptCount++;
      if (attemptCount === MAX_RETRIES) {
        throw new ApiError(
          `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`,
          undefined,
          { lastError }
        );
      }
    }
  }

  throw lastError;
};

// Helper to construct full API URLs
export const getFullApiUrl = (endpoint: string) => {
  const baseUrl = getApiUrl();

  if (endpoint.startsWith('http')) {
    return endpoint;
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const fullUrl = `${cleanBaseUrl}/${cleanEndpoint}`;

  return fullUrl;
};
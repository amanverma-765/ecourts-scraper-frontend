import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let authToken = null;
let tokenPromise = null; // To prevent concurrent token generation

// Generate new token
const generateToken = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/token`);
    if (response.data.status === 'success') {
      authToken = response.data.data.token;
      localStorage.setItem('ecourt_token', authToken);
      return authToken;
    }
    throw new Error('Failed to generate token');
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
};

// Get valid token
const getToken = async () => {
  // If token exists and is valid, return it
  if (authToken) {
    return authToken;
  }

  // Check localStorage
  const storedToken = localStorage.getItem('ecourt_token');
  if (storedToken) {
    authToken = storedToken;
    return authToken;
  }

  // Generate new token (prevent multiple concurrent generations)
  if (!tokenPromise) {
    tokenPromise = generateToken().finally(() => {
      tokenPromise = null;
    });
  }

  return tokenPromise;
};

// Request interceptor - Add auth token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    // Skip token for token generation endpoint
    if (config.url.includes('/auth/token')) {
      return config;
    }

    try {
      const token = await getToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Failed to get token:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors and retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 error and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Clear old token
        authToken = null;
        localStorage.removeItem('ecourt_token');

        // Generate new token
        const newToken = await generateToken();

        // Update the failed request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (tokenError) {
        console.error('Failed to refresh token:', tokenError);
        return Promise.reject(tokenError);
      }
    }

    return Promise.reject(error);
  }
);

// Initialize token on app startup
export const initializeToken = async () => {
  try {
    await getToken();
    return true;
  } catch (error) {
    console.error('Failed to initialize token:', error);
    return false;
  }
};

// API Methods

// Court & Cause List APIs
export const getStates = async () => {
  const response = await apiClient.get('/court/states');
  return response.data;
};

export const getDistricts = async (stateCode) => {
  const response = await apiClient.post('/court/districts', {
    state_code: stateCode,
  });
  return response.data;
};

export const getCourtComplex = async (stateCode, districtCode) => {
  const response = await apiClient.post('/court/complex', {
    state_code: stateCode,
    district_code: districtCode,
  });
  return response.data;
};

export const getCourtNames = async (stateCode, districtCode, courtCode) => {
  const response = await apiClient.post('/court/names', {
    state_code: stateCode,
    district_code: districtCode,
    court_code: courtCode,
  });
  return response.data;
};

export const getCauseList = async (params) => {
  const response = await apiClient.post('/court/cause-list', {
    state_code: params.stateCode,
    district_code: params.districtCode,
    court_code: params.courtCode,
    court_number: params.courtNumber,
    cause_list_type: params.causeListType, // 'CIVIL' or 'CRIMINAL'
    date: params.date, // DD-MM-YYYY
  });
  return response.data;
};

// Cases APIs
export const getCaseDetails = async (cnr) => {
  const response = await apiClient.get('/cases/details', {
    params: { cnr },
  });
  return response.data;
};

// Health check
export const checkHealth = async () => {
  const response = await axios.get(`${BASE_URL}/health`);
  return response.data;
};

// Helper function to parse court names string
// Format: "code^courtNumber~displayName#code^courtNumber~displayName#..."
// Example: "3^1~1-Moushumi De-District and Sessions Judge#3^2~2-Akhtabul Ala-Asstt Sessions Judge"
export const parseCourtNames = (courtNamesString) => {
  if (!courtNamesString) return [];

  const entries = courtNamesString.split('#');
  const courts = [];

  entries.forEach((entry) => {
    // Skip entries without ^ (like "0~Select Court Name" or "D~--------")
    if (!entry.includes('^')) {
      return;
    }

    // Split by ^ to get code and rest
    const [code, rest] = entry.split('^');
    
    // Split rest by ~ to get courtNumber and displayName
    // Example: "1~1-Moushumi De-District and Sessions Judge"
    const parts = rest.split('~');
    
    if (parts.length >= 2) {
      const courtNumber = parts[0]; // The number before ~
      const displayName = parts[1];  // The name after ~
      
      // Filter out invalid entries
      if (code && courtNumber && courtNumber !== '0' && courtNumber !== 'D' && displayName) {
        courts.push({
          courtCode: code, // The court code (1, 2, or 3) - which database group
          courtNumber: courtNumber, // The actual court number within that group
          id: courtNumber, // Keep id for backward compatibility with select value
          name: displayName.trim(),
          raw: entry,
        });
      }
    }
  });

  return courts;
};

export default apiClient;

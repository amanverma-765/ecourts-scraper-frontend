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
export const parseCourtNames = (courtNamesString) => {
  if (!courtNamesString) return [];

  const entries = courtNamesString.split('#');
  const courts = [];

  entries.forEach((entry) => {
    if (entry.includes('^')) {
      const [code, details] = entry.split('^');
      const [id, nameInfo] = code.split('~');

      if (id && id !== '0' && id !== 'D') {
        const match = details?.match(/~(.+?)~/);
        const name = match ? match[1] : details;

        courts.push({
          id,
          name: name || details || 'Unknown',
          raw: entry,
        });
      }
    }
  });

  return courts;
};

export default apiClient;

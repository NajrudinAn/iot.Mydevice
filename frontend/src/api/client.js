import axios from 'axios';

// The platform token (from /api/auth/login)
export const platformClient = axios.create({
  baseURL: '/api'
});

platformClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('platform_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

platformClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('platform_token');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// For application specific endpoints requiring application tokens
export const appClient = axios.create({
  baseURL: '/api'
});

appClient.interceptors.request.use((config) => {
  // If appId is not provided in config, it falls back to whatever is set manually
  // But our ApplicationAuthProvider handles it via URL mostly. We can extract it from URL.
  const match = config.url.match(/^\/applications\/([a-zA-Z0-9-]+)/);
  const appId = config.appId || (match ? match[1] : null);
  
  if (appId) {
    const token = localStorage.getItem(`app_token_${appId}`);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

appClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Just redirect to login on 401
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// For public endpoints that don't need authentication interceptors
export const externalClient = axios.create({
  baseURL: '/api'
});

export const getPlatformStats = async () => {
  const response = await platformClient.get('/workspaces/platform-stats');
  return response.data;
};

export const getPlatformUsers = async () => {
  const response = await platformClient.get('/workspaces/platform-users');
  return response.data;
};

export const promotePlatformUser = async (userId) => {
  const response = await platformClient.put(`/workspaces/platform-users/${userId}/promote`);
  return response.data;
};

export const demotePlatformUser = async (userId) => {
  const response = await platformClient.put(`/workspaces/platform-users/${userId}/demote`);
  return response.data;
};

export const getHealth = async () => {
  const response = await externalClient.get('/health');
  return response.data;
};

export const getPlatformWorkspaces = async () => {
  const response = await platformClient.get('/workspaces/platform-workspaces');
  return response.data;
};

export const getPlatformApplications = async () => {
  const response = await platformClient.get('/workspaces/platform-applications');
  return response.data;
};

export const getApplicationDetails = async (appId) => {
  const response = await platformClient.get(`/applications/${appId}`);
  return response.data;
};

export const getApplicationUsers = async (appId) => {
  const response = await platformClient.get(`/applications/${appId}/users`);
  return response.data;
};

export const addApplicationUser = async (appId, userEmail, role) => {
  const response = await platformClient.post(`/applications/${appId}/users`, { user_email: userEmail, role });
  return response.data;
};

export const updateApplicationUser = async (appId, userId, role) => {
  const response = await platformClient.patch(`/applications/${appId}/users/${userId}`, { role });
  return response.data;
};

export const removeApplicationUser = async (appId, userId) => {
  const response = await platformClient.delete(`/applications/${appId}/users/${userId}`);
  return response.data;
};

export const getApplicationDevices = async (appId) => {
  const response = await platformClient.get(`/applications/${appId}/devices`);
  return response.data;
};

export const getApplicationDashboards = async (appId) => {
  const response = await platformClient.get(`/applications/${appId}/dashboards`);
  return response.data;
};

export const getApplicationDataSources = async (appId) => {
  const response = await platformClient.get(`/applications/${appId}/data-sources`);
  return response.data;
};

export const getApplicationApis = async (appId) => {
  const response = await platformClient.get(`/applications/${appId}/apis`);
  return response.data;
};

export const getWorkspace = async (workspaceId) => {
  const response = await platformClient.get(`/workspaces/${workspaceId}`);
  return response.data;
};

export const deletePlatformWorkspace = async (workspaceId) => {
  const response = await platformClient.delete(`/workspaces/${workspaceId}`);
  return response.data;
};

import { platformClient as api } from './client';

export const getRoutes = (workspaceId) => api.get(`/workspaces/${workspaceId}/api-management/routes`);
export const getRoute = (workspaceId, routeId) => api.get(`/workspaces/${workspaceId}/api-management/routes/${routeId}`);
export const createRoute = (workspaceId, data) => api.post(`/workspaces/${workspaceId}/api-management/routes`, data);
export const updateRoute = (workspaceId, routeId, data) => api.put(`/workspaces/${workspaceId}/api-management/routes/${routeId}`, data);
export const deleteRoute = (workspaceId, routeId) => api.delete(`/workspaces/${workspaceId}/api-management/routes/${routeId}`);

export const getApis = (workspaceId) => api.get(`/workspaces/${workspaceId}/api-management/apis`);
export const getApi = (workspaceId, apiId) => api.get(`/workspaces/${workspaceId}/api-management/apis/${apiId}`);
export const createApi = (workspaceId, data) => api.post(`/workspaces/${workspaceId}/api-management/apis`, data);
export const updateApi = (workspaceId, apiId, data) => api.put(`/workspaces/${workspaceId}/api-management/apis/${apiId}`, data);
export const deleteApi = (workspaceId, apiId) => api.delete(`/workspaces/${workspaceId}/api-management/apis/${apiId}`);

export const createCredential = (workspaceId, apiId, data) => api.post(`/workspaces/${workspaceId}/api-management/apis/${apiId}/credentials`, data);
export const revokeCredential = (workspaceId, apiId, credentialId) => api.post(`/workspaces/${workspaceId}/api-management/apis/${apiId}/credentials/${credentialId}/revoke`);

export const addApiUser = (workspaceId, apiId, appUserId) => api.post(`/workspaces/${workspaceId}/api-management/apis/${apiId}/users`, { app_user_id: appUserId });
export const removeApiUser = (workspaceId, apiId, accessId) => api.delete(`/workspaces/${workspaceId}/api-management/apis/${apiId}/users/${accessId}`);

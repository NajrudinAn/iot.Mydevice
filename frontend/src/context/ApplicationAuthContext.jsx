import React, { createContext, useContext, useState, useEffect } from 'react';
import { appClient } from '../api/client';
import { AUTH_STATES } from './AuthContext';

const ApplicationAuthContext = createContext();

export const ApplicationAuthProvider = ({ children, applicationId }) => {
  const [appUser, setAppUser] = useState(null);
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);
  const [authSettings, setAuthSettings] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!applicationId) return;

    const initAuth = async () => {
      try {
        // 1. Fetch application auth settings
        const res = await appClient.get(`/applications/${applicationId}/auth/settings`);
        setAuthSettings(res.data.settings);
        
        // 2. Check application token
        let token = localStorage.getItem(`app_token_${applicationId}`);
        const platformToken = localStorage.getItem('token'); // MyDevice global token

        // If no app token but we have a MyDevice platform token, attempt seamless SSO
        if (!token && platformToken) {
          try {
            const ssoRes = await appClient.post(`/applications/${applicationId}/auth/sso`, {}, {
              headers: { Authorization: `Bearer ${platformToken}` }
            });
            if (ssoRes.data.token) {
              token = ssoRes.data.token;
              localStorage.setItem(`app_token_${applicationId}`, token);
            }
          } catch (ssoErr) {
            console.log('SSO attempt failed, falling back to unauthenticated', ssoErr.response?.data);
            setAuthError(ssoErr.response?.data?.message || 'Access Denied');
          }
        }

        if (!token) {
          setAuthState(AUTH_STATES.UNAUTHENTICATED);
          return;
        }

        // Verify token by decoding or hitting a basic endpoint.
        // We will just assume logged in for now, interceptors handle 401s
        const payload = JSON.parse(atob(token.split('.')[1]));
        setAppUser({ loggedIn: true, role: payload.role, email: payload.email });
        setAuthState(AUTH_STATES.AUTHENTICATED);

      } catch (e) {
        console.error("Failed to initialize application auth", e);
        if (e.response && e.response.status === 401) {
          localStorage.removeItem(`app_token_${applicationId}`);
          setAuthState(AUTH_STATES.UNAUTHENTICATED);
        } else {
          setAuthError('Unable to connect to the application server.');
          setAuthState(AUTH_STATES.ERROR);
        }
      }
    };

    initAuth();
  }, [applicationId]);

  const login = async (email, password) => {
    try {
      const res = await appClient.post(`/applications/${applicationId}/auth/login`, { email, password });
      if (res.data.token) {
        localStorage.setItem(`app_token_${applicationId}`, res.data.token);
        const payload = JSON.parse(atob(res.data.token.split('.')[1]));
        setAppUser({ loggedIn: true, role: payload.role, email: payload.email });
        setAuthState(AUTH_STATES.AUTHENTICATED);
      }
    } catch (e) {
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem(`app_token_${applicationId}`);
    setAppUser(null);
    setAuthState(AUTH_STATES.UNAUTHENTICATED);
  };

  const loading = authState === AUTH_STATES.LOADING;

  const checkAuth = async () => {
    try {
      const res = await appClient.get(`/applications/${applicationId}/auth/settings`);
      setAuthSettings(res.data.settings);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ApplicationAuthContext.Provider value={{ appUser, login, logout, checkAuth, loading, authState, authSettings, authError }}>
      {children}
    </ApplicationAuthContext.Provider>
  );
};

export const useApplicationAuth = () => useContext(ApplicationAuthContext);

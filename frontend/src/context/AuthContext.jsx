import React, { createContext, useContext, useState, useEffect } from 'react';
import { platformClient } from '../api/client';

const AuthContext = createContext();

export const AUTH_STATES = {
  LOADING: 'LOADING',
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ERROR: 'ERROR'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('platform_token');
      if (!token) {
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        return;
      }

      try {
        await platformClient.get('/workspaces');
        
        let userData = { loggedIn: true };
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userData = { ...payload, loggedIn: true };
        } catch (e) {
          console.error("Failed to decode token", e);
        }
        
        setUser(userData); 
        setAuthState(AUTH_STATES.AUTHENTICATED);
      } catch (e) {
        if (e.response && e.response.status === 401) {
          localStorage.removeItem('platform_token');
          setAuthState(AUTH_STATES.UNAUTHENTICATED);
        } else {
          // Network error or backend down
          setAuthError('Unable to connect to the authentication server.');
          setAuthState(AUTH_STATES.ERROR);
        }
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await platformClient.post('/auth/login', { email, password });
      if (res.data.token) {
        localStorage.setItem('platform_token', res.data.token);
        const userData = res.data.user || { email };
        setUser(userData);
        setAuthState(AUTH_STATES.AUTHENTICATED);
        return userData;
      }
    } catch (e) {
      throw e; // Let the login form handle the error
    }
  };

  const logout = () => {
    localStorage.removeItem('platform_token');
    setUser(null);
    setAuthState(AUTH_STATES.UNAUTHENTICATED);
  };

  const loading = authState === AUTH_STATES.LOADING;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, authState, authError }}>
      {/* We always render children so that routing logic handles loading states securely */}
      {children} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiCall } from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hydrateAuth = async () => {
      const storedAuth = localStorage.getItem('splitwise_auth');
      if (storedAuth) {
        try {
          const { token: storedToken, user: storedUser } = JSON.parse(storedAuth);
          setToken(storedToken);
          setUser(storedUser);

          // Background validation
          const userData = await apiCall('/auth/me');
          setUser(userData); // update with fresh data
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    hydrateAuth();
  }, []);

  const login = (authData) => {
    localStorage.setItem('splitwise_auth', JSON.stringify(authData));
    setToken(authData.token);
    setUser(authData);
  };

  const logout = () => {
    localStorage.removeItem('splitwise_auth');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setGlobalAccessToken } from '../lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthData: (token: string, userData: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt to refresh token on initial load to restore session
  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      try {
        const response = await api.post('/api/auth/refresh');
        if (mounted && response.data.accessToken) {
          setAccessToken(response.data.accessToken);
          setGlobalAccessToken(response.data.accessToken);
          
          // Fetch real user details
          const meRes = await api.get('/api/auth/me');
          setUser(meRes.data.user);
        }
      } catch (err) {
        if (mounted) {
          setAccessToken(null);
          setGlobalAccessToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for unauthorized events from axios interceptor
    const handleUnauthorized = () => {
      setAccessToken(null);
      setGlobalAccessToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const setAuthData = (token: string, userData: User) => {
    setAccessToken(token);
    setGlobalAccessToken(token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAccessToken(null);
      setGlobalAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        setAuthData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

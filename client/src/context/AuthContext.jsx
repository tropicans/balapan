import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const STORAGE_KEY = 'dg_auth_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current authenticated user profile
  const fetchCurrentUser = useCallback(async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      const data = await res.json();
      const userData = data.data || data.user;
      if (data.success && userData) {
        setUser(userData);
        setError(null);
        return userData;
      } else {
        // Token expired or invalid
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching profile:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Real-time socket listener for user status/role changes
  useEffect(() => {
    const socket = io();

    socket.on('user:updated', (updatedUser) => {
      if (!updatedUser) return;
      setUser((prevUser) => {
        if (!prevUser) return null;
        if (prevUser.id === updatedUser.id) {
          return {
            ...prevUser,
            role: updatedUser.role || prevUser.role,
            status: updatedUser.status || prevUser.status,
            name: updatedUser.name || prevUser.name,
            avatar: updatedUser.avatar || prevUser.avatar
          };
        }
        return prevUser;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Login with verified Google ID token
  const loginWithGoogleToken = async (idToken) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: idToken,
          id_token: idToken
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || 'Login Google gagal');
      }

      const newToken = data.data?.token || data.token;
      const newUser = data.data?.user || data.user;

      if (!newToken || !newUser) {
        throw new Error('Respons autentikasi tidak valid');
      }

      localStorage.setItem(STORAGE_KEY, newToken);
      setToken(newToken);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mock / Dev login for testing & offline simulation
  const loginWithMock = async (mockUser) => {
    setLoading(true);
    setError(null);
    try {
      const email = mockUser?.email || 'user@gmail.com';
      const name = mockUser?.name || 'Test User';
      const mockCredential = `mock-google-token:${email}:${name}`;

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: mockCredential,
          mock_user: mockUser
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || 'Mock login gagal');
      }

      const newToken = data.data?.token || data.token;
      const newUser = data.data?.user || data.user;

      if (!newToken || !newUser) {
        throw new Error('Respons autentikasi tidak valid');
      }

      localStorage.setItem(STORAGE_KEY, newToken);
      setToken(newToken);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        error,
        loginWithGoogleToken,
        loginWithMock,
        logout,
        refreshUser: fetchCurrentUser,
        isAuthenticated: !!user,
        isApproved: user?.status === 'approved',
        isPending: user?.status === 'pending',
        isSuspended: user?.status === 'suspended' || user?.status === 'rejected',
        isSuperAdmin: user?.role === 'super_admin' || user?.email === 'tropicans@gmail.com',
        isAdmin: user?.role === 'super_admin' || user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

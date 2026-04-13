// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const validateUser = (user) => {
    return !!(user?._id || user?.id || user?.email);
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');   // ← added
    setCurrentUser(null);
  };

  const loadUser = () => {
    try {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('authToken');

      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        clearAuth();
        return;
      }

      const user = JSON.parse(userStr);

      if (!validateUser(user)) {
        clearAuth();
        return;
      }

      // Restore user_id if missing
      const userId = user._id || user.id;
      if (userId && !localStorage.getItem('user_id')) {
        localStorage.setItem('user_id', String(userId));
      }

      setCurrentUser(user);
    } catch (err) {
      console.error('Auth load error:', err);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = (user, token) => {
    if (!user || !token) return false;
    if (!validateUser(user)) return false;

    localStorage.setItem('token', token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));

    // Save user_id separately for Wellness + other components
    const userId = user._id || user.id;
    if (userId) localStorage.setItem('user_id', String(userId));

    setCurrentUser(user);
    return true;
  };

  const logout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const getToken = () => {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('authToken')
    );
  };

  const updateUser = (newData) => {
    if (!currentUser) return false;
    const updated = { ...currentUser, ...newData };
    localStorage.setItem('user', JSON.stringify(updated));

    // Keep user_id in sync if it changed
    const userId = updated._id || updated.id;
    if (userId) localStorage.setItem('user_id', String(userId));

    setCurrentUser(updated);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        loading,
        getToken,
        updateUser,
        isAuthenticated: !!currentUser,  // removed "&& !loading" — prevents redirect flicker
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
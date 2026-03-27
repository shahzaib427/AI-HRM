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

  // ✅ Validate user object
  const validateUser = (user) => {
    return !!(user?._id || user?.id || user?.email);
  };

  // ✅ Clear auth
  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    setCurrentUser(null);
  };

  // ✅ Load user ONCE
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

      setCurrentUser(user);
    } catch (err) {
      console.error('Auth load error:', err);
      clearAuth();
    }
  };

  // ✅ Run once when app loads
  useEffect(() => {
    loadUser();
    setLoading(false);
  }, []);

  // ✅ Login
  const login = (user, token) => {
    if (!user || !token) return false;

    if (!validateUser(user)) return false;

    localStorage.setItem('token', token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));

    setCurrentUser(user);

    return true;
  };

  // ✅ Logout
  const logout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  // ✅ Get token
  const getToken = () => {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('authToken')
    );
  };

  // ✅ Update user
  const updateUser = (newData) => {
    if (!currentUser) return false;

    const updated = { ...currentUser, ...newData };

    localStorage.setItem('user', JSON.stringify(updated));
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
        isAuthenticated: !!currentUser && !loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

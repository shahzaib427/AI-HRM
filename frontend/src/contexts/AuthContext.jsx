// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const navigateRef                     = useRef(null); // holds the navigate fn from React Router

  // Call this once from AppLayout to wire up React Router navigate
  const setNavigate = (fn) => { navigateRef.current = fn; };

  const validateUser = (user) =>
    !!(user?._id || user?.id || user?.email);

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
    setCurrentUser(null);
  };

  const loadUser = async () => {
    // 2-second splash delay — shows LoadingScreen on first app load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const token   = localStorage.getItem('token') || localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) { clearAuth(); return; }

      const user = JSON.parse(userStr);
      if (!validateUser(user)) { clearAuth(); return; }

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

  useEffect(() => { loadUser(); }, []);

  const login = (user, token) => {
    if (!user || !token || !validateUser(user)) return false;

    localStorage.setItem('token',     token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('user',      JSON.stringify(user));

    const userId = user._id || user.id;
    if (userId) localStorage.setItem('user_id', String(userId));

    setCurrentUser(user);
    return true;
  };

  // ✅ Logout: clear state + navigate WITHOUT page reload
  const logout = () => {
    clearAuth();
    if (navigateRef.current) {
      navigateRef.current('/login', { replace: true });
    }
  };

  const getToken = () =>
    localStorage.getItem('token') || localStorage.getItem('authToken');

  const updateUser = (newData) => {
    if (!currentUser) return false;
    const updated = { ...currentUser, ...newData };
    localStorage.setItem('user', JSON.stringify(updated));
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
        setNavigate,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
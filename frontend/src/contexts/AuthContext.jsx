// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosInstance';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const navigateRef                     = useRef(null);

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

  const fetchUserData = async (user) => {
    if (!user) return user;

    try {
      const role = user.role || 'employee';
      const endpoints = [
        `/${role}/profile`,
        `/employees/profile/me`,
        `/auth/profile`,
        `/auth/me`
      ];

      let profileData = null;

      for (const endpoint of endpoints) {
        try {
          const response = await axiosInstance.get(endpoint);
          if (response.data.success) {
            profileData = response.data.data;
            break;
          }
        } catch (err) {
          continue;
        }
      }

      if (profileData) {
        return {
          ...user,
          name: profileData.name || user.name,
          email: profileData.email || user.email,
          phone: profileData.phone || user.phone,
          employeeId: profileData.employeeId || user.employeeId,
          position: profileData.position || user.position,
          department: profileData.department || user.department,
          joiningDate: profileData.joiningDate || user.joiningDate,
          employeeType: profileData.employeeType || user.employeeType,
          isActive: profileData.isActive !== undefined ? profileData.isActive : user.isActive,
          fatherName: profileData.fatherName || user.fatherName || '',
          profilePicture: profileData.profilePicture || profileData.avatar || user.profilePicture || '',
        };
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }

    return user;
  };

  const loadUser = async () => {
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

      const freshUser = await fetchUserData(user);
      localStorage.setItem('user', JSON.stringify(freshUser));
      setCurrentUser(freshUser);
    } catch (err) {
      console.error('Auth load error:', err);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const login = async (user, token) => {
    if (!user || !token || !validateUser(user)) return false;

    const freshUser = await fetchUserData(user);

    localStorage.setItem('token',     token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('user',      JSON.stringify(freshUser));

    const userId = freshUser._id || freshUser.id;
    if (userId) localStorage.setItem('user_id', String(userId));

    setCurrentUser(freshUser);
    return true;
  };

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

  const refreshUserData = async () => {
    if (!currentUser) return null;
    try {
      const freshUser = await fetchUserData(currentUser);
      if (freshUser) {
        localStorage.setItem('user', JSON.stringify(freshUser));
        setCurrentUser(freshUser);
        return freshUser;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
    return currentUser;
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
        refreshUserData,
        setNavigate,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
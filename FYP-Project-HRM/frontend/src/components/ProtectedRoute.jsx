import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';  // ✅ useAuth hook instead

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, loading } = useAuth();  // ✅ useAuth returns currentUser
  
  if (loading) return <div className="flex justify-center items-center p-6">Loading...</div>;

  // ❌ No user → login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // ❌ Role not allowed
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Authorized
  return children;
};

export default ProtectedRoute;

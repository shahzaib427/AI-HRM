// src/components/AuthGuard.jsx
import { Navigate } from 'react-router-dom'

const AuthGuard = ({ children, requiredRole }) => {
  const user = JSON.parse(localStorage.getItem('user'))
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />
  }
  
  return children
}

export default AuthGuard
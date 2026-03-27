import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const DashboardWrapper = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    switch (user.role) {
        case 'admin':
            return <Navigate to="/admin/dashboard" replace />;
        case 'hr':
            return <Navigate to="/hr/dashboard" replace />;
        case 'employee':
            return <Navigate to="/employee/dashboard" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
};

export default DashboardWrapper;
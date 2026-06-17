// App.jsx
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes, Route, Navigate,
  useLocation, useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import HRChatbot from './components/employee/Chatbot';
import ContactManagement from './components/ContactManagement';

// Notification Pages
import EmployeeNotifications from './components/employee/Employeenotifications';
import HRNotifications       from './components/HR/Hrnotifications';
import AdminNotifications    from './components/Admin/Adminnotifications';

// Public Pages
import Home     from './pages/Home';
import About    from './pages/About';
import Services from './pages/Services';
import Contact  from './pages/Contact';
import Login    from './pages/Login';
import Careers  from './pages/Careers';
import Apply    from './pages/Apply';

// Employee Pages
import EmployeeDashboard  from './components/employee/EmployeeDashboard';
// Employee's own attendance view
import EmployeeOwnAttendance from './components/employee/EmployeeOwnAttendance';
import EmployeePayroll    from './components/employee/EmployeePayroll';
import EmployeeLeave      from './components/employee/EmployeeLeave';
import EmployeeProfile    from './components/employee/EmployeeProfile';
import EmployeeSettings   from './components/employee/EmployeeSettings';
import CareerCoach        from './components/employee/CareerCoach';
import LearningHub        from './components/employee/LearningHub';
import Wellness           from './components/employee/Wellness';

// Admin Pages
import AdminDashboard  from './components/Admin/AdminDashboard';
import AdminEmployee   from './components/Admin/AdminEmployee';
import AdminAttendance from './components/Admin/AdminAttendance';
import AdminPayroll    from './components/Admin/AdminPayroll';
import AdminLeave      from './components/Admin/AdminLeave';
import AdminReports    from './components/Admin/AdminReports';
import AdminProfile    from './components/Admin/AdminProfile';
import AdminSettings   from './components/Admin/AdminSettings';
import RegisterFace from './components/Admin/RegisterFace';

// HR Pages
import HRDashboard   from './components/HR/HRDashboard';
import HRRecruitment from './components/HR/HRRecruitment';
import HRLeave       from './components/HR/HRLeave';
import HRAttendance  from './components/HR/HRAttendance';
import HRProfile     from './components/HR/HRProfile';
import HRPayroll     from './components/HR/HRPayroll';
import HRContracts   from './components/HR/HRContracts';
import HROnboarding  from './components/HR/HROnboarding';
import HRReports     from './components/HR/HRReports';
// HR's view of all employee attendance
import HREmployeeAttendance from './components/HR/HREmployeeAttendance';

// CRUD Components
import AddEmployee     from './components/Admin/AddEmployee';
import EditEmployee    from './components/Admin/EditEmployee';
import EmployeeDetails from './components/Admin/EmployeeDetails';
import ViewEmployee    from './components/Admin/ViewEmployee';

// Employee Messaging
import ComposeMessage  from './components/employee/ComposeMessage';
import EmployeeMessages from './components/employee/EmployeeMessages';

// Admin Messaging
import MessageDashboard    from './components/Admin/MessageDashboard';
import AdminComposeMessage from './components/Admin/AdminComposeMessage';
import AdminMessageDetail  from './components/Admin/AdminMessageDetail';

// HR Messaging
import HRMessageDashboard from './components/HR/HRMessageDashboard';
import HRComposeMessage   from './components/HR/HRComposeMessage';
import MessageDetail      from './components/HR/MessageDetail';

// Shared
import SentMessages from './components/shared/SentMessages';
import MessageStats from './components/shared/MessageStats';

// ─── Generic 404 ──────────────────────────────────────────────────────────────
const Placeholder404 = ({ title = 'Page not found' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/30">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600 text-lg mb-8">
        This page is under construction or does not exist
      </p>
      <button
        onClick={() => window.history.back()}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        Go Back
      </button>
    </div>
  </div>
);

// ─── Loading Screen ───────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
    <div className="text-white text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-lg font-medium">Loading...</p>
      <p className="text-sm text-slate-400 mt-2">Please wait</p>
    </div>
  </div>
);

// ─── Dashboard Layout ─────────────────────────────────────────────────────────
const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2.5 bg-gradient-to-r from-slate-800 to-slate-700
                     text-white rounded-xl shadow-lg hover:from-slate-700 hover:to-slate-600
                     transition-all duration-200 group"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <Sidebar
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onMobileClose={() => setSidebarOpen(false)}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
      />

      <main
        className={`transition-all duration-300 ${sidebarOpen ? 'ml-[260px]' : 'ml-0'}`}
        style={{ minHeight: '100vh' }}
      >
        <div className="p-4 md:p-6">{children}</div>
      </main>

      <HRChatbot isLoggedIn={true} />
    </div>
  );
};

// ─── NavigateInjector ─────────────────────────────────────────────────────────
// Runs inside <Router> so it can call useNavigate(), then wires it into
// AuthContext so logout() can navigate without a page reload.
const NavigateInjector = () => {
  const navigate = useNavigate();
  const { setNavigate } = useAuth();
  useEffect(() => { setNavigate(navigate); }, [navigate, setNavigate]);
  return null;
};

// ─── App Layout ───────────────────────────────────────────────────────────────
function AppLayout({ children }) {
  const location = useLocation();
  const { currentUser, loading } = useAuth();

  const showFooterRoutes = ['/', '/about', '/services', '/contact'];
  const shouldShowFooter = showFooterRoutes.includes(location.pathname);

  const isDashboardRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/hr')    ||
    location.pathname.startsWith('/employee');

  const isLoginPage = location.pathname === '/login';

  // Show spinner on ALL routes for 2 seconds on first app load (splash effect).
  // After logout, loading stays false so this never triggers again — no flash.
  if (loading) {
    return <LoadingScreen />;
  }

  // Already logged in → redirect away from /login
  if (isLoginPage && currentUser) {
    return <Navigate to={`/${currentUser.role || 'employee'}/dashboard`} replace />;
  }

  // Authenticated → show sidebar layout
  if (isDashboardRoute && currentUser) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  // Not authenticated on a dashboard route → go to login
  if (isDashboardRoute && !currentUser && !loading) {
    return <Navigate to="/login" replace />;
  }

  // Public pages
  return (
    <>
      <Header />
      <main style={{ minHeight: 'calc(100vh - 64px)' }}>{children}</main>
      {shouldShowFooter && <Footer />}
      <HRChatbot isLoggedIn={false} />
    </>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Wires React Router's navigate() into AuthContext — no page reload on logout */}
        <NavigateInjector />

        <AppLayout>
          <Routes>
            {/* ── PUBLIC ── */}
            <Route path="/"             element={<Home />} />
            <Route path="/about"        element={<About />} />
            <Route path="/services"     element={<Services />} />
            <Route path="/contact"      element={<Contact />} />
            <Route path="/login"        element={<Login />} />
            <Route path="/careers"      element={<Careers />} />
            <Route path="/jobs"         element={<Careers />} />
            <Route path="/apply/:jobId" element={<Apply />} />

            {/* ── EMPLOYEE ── */}
            <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
            <Route path="/employee/dashboard"        element={<ProtectedRoute allowedRoles={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/attendance"       element={<ProtectedRoute allowedRoles={['employee']}><EmployeeOwnAttendance /></ProtectedRoute>} />
            <Route path="/employee/payroll"          element={<ProtectedRoute allowedRoles={['employee']}><EmployeePayroll /></ProtectedRoute>} />
            <Route path="/employee/leave"            element={<ProtectedRoute allowedRoles={['employee']}><EmployeeLeave /></ProtectedRoute>} />
            <Route path="/employee/profile"          element={<ProtectedRoute allowedRoles={['employee']}><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/employee/settings"         element={<ProtectedRoute allowedRoles={['employee']}><EmployeeSettings /></ProtectedRoute>} />
            <Route path="/employee/career-coach"     element={<ProtectedRoute allowedRoles={['employee']}><CareerCoach /></ProtectedRoute>} />
            <Route path="/employee/learning-hub"     element={<ProtectedRoute allowedRoles={['employee']}><LearningHub /></ProtectedRoute>} />
            <Route path="/employee/wellness"         element={<ProtectedRoute allowedRoles={['employee']}><Wellness /></ProtectedRoute>} />
            <Route path="/employee/notifications"    element={<ProtectedRoute allowedRoles={['employee']}><EmployeeNotifications /></ProtectedRoute>} />
            <Route path="/employee/messages"         element={<ProtectedRoute allowedRoles={['employee']}><EmployeeMessages /></ProtectedRoute>} />
            <Route path="/employee/messages/compose" element={<ProtectedRoute allowedRoles={['employee']}><ComposeMessage /></ProtectedRoute>} />
            <Route path="/employee/messages/sent"    element={<ProtectedRoute allowedRoles={['employee']}><SentMessages /></ProtectedRoute>} />
            <Route path="/employee/messages/:id"     element={<ProtectedRoute allowedRoles={['employee']}><MessageDetail /></ProtectedRoute>} />
            <Route path="/employee/*"                element={<ProtectedRoute allowedRoles={['employee']}><Placeholder404 title="Employee Page Not Found" /></ProtectedRoute>} />

            {/* ── ADMIN ── */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard"        element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/contacts"         element={<ProtectedRoute allowedRoles={['admin']}><ContactManagement /></ProtectedRoute>} />
            <Route path="/admin/notifications"    element={<ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>} />
            <Route path="/admin/employees"        element={<ProtectedRoute allowedRoles={['admin']}><AdminEmployee /></ProtectedRoute>} />
            <Route path="/admin/employees/new"    element={<ProtectedRoute allowedRoles={['admin']}><AddEmployee /></ProtectedRoute>} />
            <Route path="/admin/employees/edit/:id" element={<ProtectedRoute allowedRoles={['admin']}><EditEmployee /></ProtectedRoute>} />
            <Route path="/admin/employees/view/:id" element={<ProtectedRoute allowedRoles={['admin']}><ViewEmployee /></ProtectedRoute>} />
            <Route path="/admin/attendance"       element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/payroll"          element={<ProtectedRoute allowedRoles={['admin']}><AdminPayroll /></ProtectedRoute>} />
            <Route path="/admin/leave"            element={<ProtectedRoute allowedRoles={['admin']}><AdminLeave /></ProtectedRoute>} />
            <Route path="/admin/reports"          element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/profile"          element={<ProtectedRoute allowedRoles={['admin']}><AdminProfile /></ProtectedRoute>} />
            <Route path="/admin/settings"         element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/register-face"    element={<ProtectedRoute allowedRoles={['admin']}><RegisterFace /></ProtectedRoute>} />
            <Route path="/admin/messages"         element={<ProtectedRoute allowedRoles={['admin']}><MessageDashboard /></ProtectedRoute>} />
            <Route path="/admin/messages/compose" element={<ProtectedRoute allowedRoles={['admin']}><AdminComposeMessage /></ProtectedRoute>} />
            <Route path="/admin/messages/sent"    element={<ProtectedRoute allowedRoles={['admin']}><SentMessages /></ProtectedRoute>} />
            <Route path="/admin/messages/:id"     element={<ProtectedRoute allowedRoles={['admin']}><AdminMessageDetail /></ProtectedRoute>} />
            <Route path="/admin/*"                element={<ProtectedRoute allowedRoles={['admin']}><Placeholder404 title="Admin Page Not Found" /></ProtectedRoute>} />

            {/* ── HR ── */}
            <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="/hr/dashboard"        element={<ProtectedRoute allowedRoles={['hr']}><HRDashboard /></ProtectedRoute>} />
            <Route path="/hr/contacts"         element={<ProtectedRoute allowedRoles={['hr']}><ContactManagement /></ProtectedRoute>} />
            <Route path="/hr/notifications"    element={<ProtectedRoute allowedRoles={['hr']}><HRNotifications /></ProtectedRoute>} />
            <Route path="/hr/attendance"       element={<ProtectedRoute allowedRoles={['hr']}><HRAttendance /></ProtectedRoute>} />
            {/* HR Employee Attendance - View all employees' attendance */}
            <Route path="/hr/employee-attendance" element={<ProtectedRoute allowedRoles={['hr']}><HREmployeeAttendance /></ProtectedRoute>} />
            <Route path="/hr/recruitment"      element={<ProtectedRoute allowedRoles={['hr']}><HRRecruitment /></ProtectedRoute>} />
            <Route path="/hr/leave"            element={<ProtectedRoute allowedRoles={['hr']}><HRLeave /></ProtectedRoute>} />
            <Route path="/hr/payroll"          element={<ProtectedRoute allowedRoles={['hr']}><HRPayroll /></ProtectedRoute>} />
            <Route path="/hr/contracts"        element={<ProtectedRoute allowedRoles={['hr']}><HRContracts /></ProtectedRoute>} />
            <Route path="/hr/onboarding"       element={<ProtectedRoute allowedRoles={['hr']}><HROnboarding /></ProtectedRoute>} />
            <Route path="/hr/reports"          element={<ProtectedRoute allowedRoles={['hr']}><HRReports /></ProtectedRoute>} />
            <Route path="/hr/profile"          element={<ProtectedRoute allowedRoles={['hr']}><HRProfile /></ProtectedRoute>} />
            <Route path="/hr/settings"         element={<ProtectedRoute allowedRoles={['hr']}><AdminSettings /></ProtectedRoute>} />
            <Route path="/hr/messages"         element={<ProtectedRoute allowedRoles={['hr']}><HRMessageDashboard /></ProtectedRoute>} />
            <Route path="/hr/messages/compose" element={<ProtectedRoute allowedRoles={['hr']}><HRComposeMessage /></ProtectedRoute>} />
            <Route path="/hr/messages/sent"    element={<ProtectedRoute allowedRoles={['hr']}><SentMessages /></ProtectedRoute>} />
            <Route path="/hr/messages/:id"     element={<ProtectedRoute allowedRoles={['hr']}><MessageDetail /></ProtectedRoute>} />
            <Route path="/hr/*"                element={<ProtectedRoute allowedRoles={['hr']}><Placeholder404 title="HR Page Not Found" /></ProtectedRoute>} />

            {/* ── 404 ── */}
            <Route path="*" element={<Placeholder404 />} />
          </Routes>
        </AppLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
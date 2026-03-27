import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import Chatbot from './components/employee/Chatbot';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Careers from './pages/Careers';
import Apply from './pages/Apply';

// Employee Pages
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import EmployeeAttendance from './components/employee/EmployeeAttendance';
import EmployeePayroll from './components/employee/EmployeePayroll';
import EmployeeLeave from './components/employee/EmployeeLeave';
import EmployeeProfile from './components/employee/EmployeeProfile';
import EmployeeSettings from './components/employee/EmployeeSettings';
import CareerCoach from './components/employee/CareerCoach';
import LearningHub from './components/employee/LearningHub';
import Wellness from './components/employee/Wellness';
import Productivity from './components/employee/productivity';

// Admin Pages
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminEmployee from './components/Admin/AdminEmployee';
import AdminAttendance from './components/Admin/AdminAttendance';
import AdminPayroll from './components/Admin/AdminPayroll';
import AdminLeave from './components/Admin/AdminLeave';
import AdminReports from './components/Admin/AdminReports';
import AdminProfile from './components/Admin/AdminProfile';
import AdminSettings from './components/Admin/AdminSettings';

// HR Pages
import HRDashboard from './components/HR/HRDashboard';
import HRRecruitment from './components/HR/HRRecruitment';
import HRLeave from './components/HR/HRLeave';
import HRAttendance from './components/HR/HRAttendance';
import HRProfile from './components/HR/HRProfile';

// CRUD Components for Employees
import AddEmployee from './components/Admin/AddEmployee';
import EditEmployee from './components/Admin/EditEmployee';
import EmployeeDetails from './components/Admin/EmployeeDetails';
import ViewEmployee from './components/Admin/ViewEmployee';

// ================= MESSAGE COMPONENTS =================
// Employee Messaging
import ComposeMessage from './components/employee/ComposeMessage';
import EmployeeMessages from './components/employee/EmployeeMessages';

// Admin Messaging
import MessageDashboard from './components/Admin/MessageDashboard';
import AdminComposeMessage from './components/Admin/AdminComposeMessage';
import AdminMessageDetail from './components/Admin/AdminMessageDetail';

// HR Messaging
import HRMessageDashboard from './components/HR/HRMessageDashboard';
import HRComposeMessage from './components/HR/HRComposeMessage';
import MessageDetail from './components/HR/MessageDetail';

// Shared Components
import SentMessages from './components/shared/SentMessages';
import MessageStats from './components/shared/MessageStats';

// Placeholder components for missing HR pages
const HRContracts = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">HR Contracts Management</h1>
        <p className="text-gray-600">Contract management portal - Under development</p>
      </div>
    </div>
  </div>
);

const HROnboarding = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Employee Onboarding</h1>
        <p className="text-gray-600">Onboarding portal - Under development</p>
      </div>
    </div>
  </div>
);

// Generic 404
const Placeholder404 = ({ title = "Page not found" }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/30">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600 text-lg mb-8">This page is under construction or does not exist</p>
      <button
        onClick={() => window.history.back()}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        Go Back
      </button>
    </div>
  </div>
);

function App() {
  // State for chatbot visibility
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Listen for chatbot toggle events from header
  useEffect(() => {
    const handleToggleChatbot = () => {
      setIsChatbotOpen(prev => !prev);
    };

    window.addEventListener('toggleChatbot', handleToggleChatbot);
    
    return () => {
      window.removeEventListener('toggleChatbot', handleToggleChatbot);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">
            <Routes>
              {/* ================= PUBLIC ROUTES ================= */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/jobs" element={<Careers />} />
              <Route path="/apply/:jobId" element={<Apply />} />

              {/* ================= EMPLOYEE ROUTES ================= */}
              <Route path="/employee/dashboard" element={
                <ProtectedRoute allowedRoles={['employee']}><EmployeeDashboard /></ProtectedRoute>
              } />
              <Route path="/employee/attendance" element={
                <ProtectedRoute allowedRoles={['employee']}><EmployeeAttendance /></ProtectedRoute>
              } />
              <Route path="/employee/payroll" element={
                <ProtectedRoute allowedRoles={['employee']}><EmployeePayroll /></ProtectedRoute>
              } />
              <Route path="/employee/leave" element={
                <ProtectedRoute allowedRoles={['employee']}><EmployeeLeave /></ProtectedRoute>
              } />
              <Route path="/employee/profile" element={
                <ProtectedRoute allowedRoles={['employee']}><EmployeeProfile /></ProtectedRoute>
              } />
              <Route path="/employee/settings" element={
                <ProtectedRoute allowedRoles={['employee']}><EmployeeSettings /></ProtectedRoute>
              } />
              <Route path="/employee/career-coach" element={
                <ProtectedRoute allowedRoles={['employee']}><CareerCoach /></ProtectedRoute>
              } />
              <Route path="/employee/learning-hub" element={
                <ProtectedRoute allowedRoles={['employee']}><LearningHub /></ProtectedRoute>
              } />
              <Route path="/employee/wellness" element={
                <ProtectedRoute allowedRoles={['employee']}><Wellness /></ProtectedRoute>
              } />
              <Route path="/employee/productivity" element={
                <ProtectedRoute allowedRoles={['employee']}><Productivity /></ProtectedRoute>
              } />
              
              {/* ================= EMPLOYEE MESSAGE ROUTES ================= */}
              <Route path="/employee/messages" element={
                <ProtectedRoute allowedRoles={['employee']}><EmployeeMessages /></ProtectedRoute>
              } />
              <Route path="/employee/messages/compose" element={
                <ProtectedRoute allowedRoles={['employee']}><ComposeMessage /></ProtectedRoute>
              } />
              <Route path="/employee/messages/sent" element={
                <ProtectedRoute allowedRoles={['employee']}><SentMessages /></ProtectedRoute>
              } />
              <Route path="/employee/messages/:id" element={
                <ProtectedRoute allowedRoles={['employee']}><MessageDetail /></ProtectedRoute>
              } />
              
              <Route path="/employee/*" element={
                <ProtectedRoute allowedRoles={['employee']}><Placeholder404 title="Employee Page Not Found" /></ProtectedRoute>
              } />
              <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />

              {/* ================= ADMIN ROUTES ================= */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />
              
              {/* Employee Management CRUD Routes */}
              <Route path="/admin/employees" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminEmployee /></ProtectedRoute>
              } />
              <Route path="/admin/employees/new" element={
                <ProtectedRoute allowedRoles={['admin']}><AddEmployee /></ProtectedRoute>
              } />
              <Route path="/admin/employees/edit/:id" element={
                <ProtectedRoute allowedRoles={['admin']}><EditEmployee /></ProtectedRoute>
              } />
              <Route path="/admin/employees/view/:id" element={
                <ProtectedRoute allowedRoles={['admin']}><ViewEmployee /></ProtectedRoute>
              } />
              <Route path="/admin/employees/:id" element={
                <ProtectedRoute allowedRoles={['admin']}><EmployeeDetails /></ProtectedRoute>
              } />
              
              <Route path="/admin/attendance" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>
              } />
              <Route path="/admin/payroll" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminPayroll /></ProtectedRoute>
              } />
              <Route path="/admin/leave" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminLeave /></ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>
              } />
              <Route path="/admin/profile" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminProfile /></ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>
              } />
              
              {/* ================= ADMIN MESSAGE ROUTES ================= */}
              <Route path="/admin/messages" element={
                <ProtectedRoute allowedRoles={['admin']}><MessageDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/messages/compose" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminComposeMessage /></ProtectedRoute>
              } />
              <Route path="/admin/messages/:id" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminMessageDetail /></ProtectedRoute>
              } />
              <Route path="/admin/messages/sent" element={
                <ProtectedRoute allowedRoles={['admin']}><SentMessages /></ProtectedRoute>
              } />
              <Route path="/admin/messages/stats" element={
                <ProtectedRoute allowedRoles={['admin']}><MessageStats /></ProtectedRoute>
              } />
              
              <Route path="/admin/*" element={
                <ProtectedRoute allowedRoles={['admin']}><Placeholder404 title="Admin Page Not Found" /></ProtectedRoute>
              } />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* ================= HR ROUTES ================= */}
              <Route path="/hr/dashboard" element={
                <ProtectedRoute allowedRoles={['hr']}><HRDashboard /></ProtectedRoute>
              } />
              
              {/* HR cannot access employee management - redirect to recruitment */}
              <Route path="/hr/employees" element={
                <ProtectedRoute allowedRoles={['hr']}><Navigate to="/hr/recruitment" replace /></ProtectedRoute>
              } />
              <Route path="/hr/employees/new" element={
                <ProtectedRoute allowedRoles={['hr']}><Navigate to="/hr/recruitment" replace /></ProtectedRoute>
              } />
              <Route path="/hr/employees/edit/:id" element={
                <ProtectedRoute allowedRoles={['hr']}><Navigate to="/hr/recruitment" replace /></ProtectedRoute>
              } />
              <Route path="/hr/employees/:id" element={
                <ProtectedRoute allowedRoles={['hr']}><Navigate to="/hr/recruitment" replace /></ProtectedRoute>
              } />
              
              {/* HR-specific pages */}
              <Route path="/hr/attendance" element={
                <ProtectedRoute allowedRoles={['hr']}><HRAttendance /></ProtectedRoute>
              } />
              <Route path="/hr/recruitment" element={
                <ProtectedRoute allowedRoles={['hr']}><HRRecruitment /></ProtectedRoute>
              } />
              <Route path="/hr/leave" element={
                <ProtectedRoute allowedRoles={['hr']}><HRLeave /></ProtectedRoute>
              } />
              <Route path="/hr/contracts" element={
                <ProtectedRoute allowedRoles={['hr']}><HRContracts /></ProtectedRoute>
              } />
              <Route path="/hr/onboarding" element={
                <ProtectedRoute allowedRoles={['hr']}><HROnboarding /></ProtectedRoute>
              } />
              <Route path="/hr/reports" element={
                <ProtectedRoute allowedRoles={['hr']}><AdminReports /></ProtectedRoute>
              } />
              <Route path="/hr/profile" element={
                <ProtectedRoute allowedRoles={['hr']}><HRProfile /></ProtectedRoute>
              } />
              <Route path="/hr/settings" element={
                <ProtectedRoute allowedRoles={['hr']}><AdminSettings /></ProtectedRoute>
              } />
              
              {/* ================= HR MESSAGE ROUTES ================= */}
              <Route path="/hr/messages" element={
                <ProtectedRoute allowedRoles={['hr']}><HRMessageDashboard /></ProtectedRoute>
              } />
              <Route path="/hr/messages/compose" element={
                <ProtectedRoute allowedRoles={['hr']}><HRComposeMessage /></ProtectedRoute>
              } />
              <Route path="/hr/messages/:id" element={
                <ProtectedRoute allowedRoles={['hr']}><MessageDetail /></ProtectedRoute>
              } />
              <Route path="/hr/messages/sent" element={
                <ProtectedRoute allowedRoles={['hr']}><SentMessages /></ProtectedRoute>
              } />
              <Route path="/hr/messages/stats" element={
                <ProtectedRoute allowedRoles={['hr']}><MessageStats /></ProtectedRoute>
              } />
              
              <Route path="/hr/*" element={
                <ProtectedRoute allowedRoles={['hr']}><Placeholder404 title="HR Page Not Found" /></ProtectedRoute>
              } />
              <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />

              {/* ================= GLOBAL 404 ================= */}
              <Route path="*" element={<Placeholder404 />} />
            </Routes>
          </main>
          <Footer />
          
          {/* Chatbot Component - Only shows when open */}
          {isChatbotOpen && (
            <Chatbot onClose={() => setIsChatbotOpen(false)} />
          )}
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
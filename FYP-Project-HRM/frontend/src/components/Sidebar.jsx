import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaChartLine, FaUsers, FaCalendarCheck, FaMoneyBillWave, 
  FaClipboardList, FaUserCircle, FaEnvelope, FaBrain,
  FaBook, FaHeartbeat, FaBell, FaSignOutAlt, FaUserGraduate,
  FaGraduationCap, FaHandHoldingHeart, FaBriefcase, FaFileSignature,
  FaUserCheck, FaChartBar, FaTachometerAlt, FaRocket,
  FaChevronRight, FaAddressBook, FaCamera
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ isOpen, onMobileClose, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [isAIToolsOpen, setIsAIToolsOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleAITools = () => {
    setIsAIToolsOpen(!isAIToolsOpen);
  };

  const getInitials = () => {
    if (!currentUser?.name) return 'U';
    return currentUser.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getRoleGradient = () => {
    switch (currentUser?.role) {
      case 'admin': return 'from-[#3b1fa8] to-[#4a2bc8]';
      case 'hr': return 'from-[#3b1fa8] to-[#4a2bc8]';
      case 'employee': return 'from-[#3b1fa8] to-[#4a2bc8]';
      default: return 'from-[#3b1fa8] to-[#4a2bc8]';
    }
  };

  const getNavItems = () => {
    const role = currentUser?.role;
    
    const baseItems = [
      { path: `/${role}/dashboard`, label: 'Dashboard', icon: <FaTachometerAlt className="text-lg" /> }
    ];

    const roleSpecificItems = {
      admin: [
        { path: '/admin/employees',         label: 'Employees',           icon: <FaUsers className="text-lg" /> },
        { path: '/admin/attendance',        label: 'Attendance',          icon: <FaCalendarCheck className="text-lg" /> },
        { path: '/admin/register-face',     label: 'Register Face',       icon: <FaCamera className="text-lg" /> },
        { path: '/admin/payroll',           label: 'Payroll',             icon: <FaMoneyBillWave className="text-lg" /> },
        { path: '/admin/leave',             label: 'Leave Management',    icon: <FaClipboardList className="text-lg" /> },
        { path: '/admin/contacts',          label: 'Contact Submissions', icon: <FaAddressBook className="text-lg" /> },
        { path: '/admin/reports',           label: 'Reports',             icon: <FaChartBar className="text-lg" /> },
        { path: '/admin/messages',          label: 'Messages',            icon: <FaEnvelope className="text-lg" /> },
      ],
      hr: [
        { path: '/hr/recruitment',          label: 'Recruitment',         icon: <FaBriefcase className="text-lg" /> },
        { path: '/hr/contracts',            label: 'Contracts',           icon: <FaFileSignature className="text-lg" /> },
        { path: '/hr/onboarding',           label: 'Onboarding',          icon: <FaUserCheck className="text-lg" /> },
        { path: '/hr/attendance',           label: 'My Attendance',       icon: <FaCalendarCheck className="text-lg" /> },
        // ── HR views ALL employee attendance records ───────────────────────
        { path: '/hr/employee-attendance',  label: 'Employee Attendance', icon: <FaCalendarCheck className="text-lg" /> },
        // ── HR does NOT have Register Face - only admin ────────────────────
        { path: '/hr/leave',                label: 'Leave',               icon: <FaClipboardList className="text-lg" /> },
        { path: '/hr/payroll',              label: 'Payroll',             icon: <FaMoneyBillWave className="text-lg" /> },
        { path: '/hr/contacts',             label: 'Contact Submissions', icon: <FaAddressBook className="text-lg" /> },
        { path: '/hr/reports',              label: 'Reports',             icon: <FaChartBar className="text-lg" /> },
        { path: '/hr/messages',             label: 'Messages',            icon: <FaEnvelope className="text-lg" /> },
      ],
      employee: [
        { path: '/employee/attendance',     label: 'Attendance',          icon: <FaCalendarCheck className="text-lg" /> },
        { path: '/employee/leave',          label: 'Leave',               icon: <FaClipboardList className="text-lg" /> },
        { path: '/employee/payroll',        label: 'Payroll',             icon: <FaMoneyBillWave className="text-lg" /> },
        { path: '/employee/messages',       label: 'Messages',            icon: <FaEnvelope className="text-lg" /> },
      ],
    };

    const aiToolsItem = role === 'employee' ? {
      label: 'AI Tools',
      icon: <FaBrain className="text-lg" />,
      isDropdown: true,
      children: [
        { path: '/employee/career-coach', label: 'Career Coach', icon: <FaUserGraduate className="text-sm" /> },
        { path: '/employee/learning-hub', label: 'Learning Hub', icon: <FaGraduationCap className="text-sm" /> },
        { path: '/employee/wellness',     label: 'Wellness',     icon: <FaHandHoldingHeart className="text-sm" /> },
      ]
    } : null;

    const regularItems = roleSpecificItems[role] || [];
    
    return { baseItems, regularItems, aiToolsItem };
  };

  const { baseItems, regularItems, aiToolsItem } = getNavItems();
  
  const isActive = (path) => {
    if (!path) return false;
    if (location.pathname === path) return true;
    if (path.includes(':id')) {
      const basePath = path.split('/:')[0];
      if (location.pathname.startsWith(basePath)) return true;
    }
    return false;
  };

  const bottomItems = [
    { path: `/${currentUser?.role}/profile`,       label: 'Profile',       icon: <FaUserCircle className="text-lg" /> },
    { path: `/${currentUser?.role}/notifications`,  label: 'Notifications', icon: <FaBell className="text-lg" /> },
  ];

  if (!currentUser) return null;

  const sidebarWidth = 'w-64';

  if (isMobile && !isOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed left-0 top-0 h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
          text-white transition-all duration-300 z-50 flex flex-col shadow-2xl
          ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
          ${sidebarWidth}
        `}
      >
        {/* Close Button for Mobile */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 z-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Logo Section */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <Link to={`/${currentUser?.role}/dashboard`} className="flex items-center space-x-3 group">
            <div className={`w-8 h-8 bg-gradient-to-br ${getRoleGradient()} rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105`}>
              <FaRocket className="text-sm" />
            </div>
            <div>
              <div className="font-bold text-sm bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                HRM System
              </div>
              <div className="text-xs text-white/50">Enterprise Portal</div>
            </div>
          </Link>
        </div>

        {/* User Profile Section */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleGradient()} flex items-center justify-center shadow-lg flex-shrink-0 transition-all duration-300`}>
              <span className="text-white font-bold text-base">{getInitials()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate text-white">{currentUser?.name || 'User'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                <p className="text-xs text-white/60 capitalize">{currentUser?.role}</p>
              </div>
              <p className="text-xs text-white/40 truncate mt-0.5">{currentUser?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 sidebar-nav">
          <div className="space-y-1">

            {/* Base Items (Dashboard) */}
            {baseItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive(item.path) 
                    ? `bg-gradient-to-r ${getRoleGradient()} text-white shadow-lg` 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                <span className="text-sm font-medium truncate">{item.label}</span>
                {isActive(item.path) && (
                  <div className="ml-auto w-1 h-6 rounded-full bg-white"></div>
                )}
              </Link>
            ))}

            {/* Regular Items */}
            {regularItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive(item.path) 
                    ? `bg-gradient-to-r ${getRoleGradient()} text-white shadow-lg` 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                <span className="text-sm font-medium truncate">{item.label}</span>
                {isActive(item.path) && (
                  <div className="ml-auto w-1 h-6 rounded-full bg-white"></div>
                )}
              </Link>
            ))}

            {/* AI Tools Dropdown (Employee only) */}
            {aiToolsItem && (
              <div>
                <button
                  onClick={toggleAITools}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-white/70 hover:bg-white/10 hover:text-white group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">{aiToolsItem.icon}</span>
                    <span className="text-sm font-medium">{aiToolsItem.label}</span>
                  </div>
                  <FaChevronRight className={`text-xs transition-transform duration-200 ${isAIToolsOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {isAIToolsOpen && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-white/10 pl-3">
                    {aiToolsItem.children.map((child, childIndex) => (
                      <Link
                        key={childIndex}
                        to={child.path}
                        onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                        className={`
                          flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200
                          ${isActive(child.path) 
                            ? `bg-gradient-to-r ${getRoleGradient()} text-white` 
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <span className="flex-shrink-0">{child.icon}</span>
                        <span className="text-xs truncate">{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Items */}
        <div className="border-t border-white/10 px-3 py-3">
          <div className="space-y-1">
            {bottomItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${isActive(item.path) 
                    ? `bg-gradient-to-r ${getRoleGradient()} text-white shadow-lg` 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                <span className="text-sm font-medium truncate">{item.label}</span>
                {isActive(item.path) && (
                  <div className="ml-auto w-1 h-6 rounded-full bg-white"></div>
                )}
              </Link>
            ))}

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <FaSignOutAlt className="text-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        .sidebar-nav {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sidebar-nav::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
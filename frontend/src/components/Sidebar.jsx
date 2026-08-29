import React, { useState, useEffect } from 'react';
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
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser?.profilePicture]);

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

  // Single flat accent color instead of a gradient — matches the SaaS
  // dashboard's "avoid excessive gradients" rule while keeping the
  // indigo/purple brand accent for active/selected states.
  const accentBg = 'bg-indigo-600';

  const getProfileImageUrl = () => {
    if (!currentUser?.profilePicture) return null;
    
    if (currentUser.profilePicture.startsWith('http://') || 
        currentUser.profilePicture.startsWith('https://')) {
      return currentUser.profilePicture;
    }
    
    if (currentUser.profilePicture.startsWith('/')) {
      return `http://localhost:5000${currentUser.profilePicture}`;
    }
    
    return `http://localhost:5000/${currentUser.profilePicture}`;
  };

  const getNavItems = () => {
    const role = currentUser?.role;
    
    const baseItems = [
      { path: `/${role}/dashboard`, label: 'Dashboard', icon: <FaTachometerAlt className="text-[15px]" /> }
    ];

    const roleSpecificItems = {
      admin: [
        { path: '/admin/employees',         label: 'Employees',           icon: <FaUsers className="text-[15px]" /> },
        { path: '/admin/attendance',        label: 'Attendance',          icon: <FaCalendarCheck className="text-[15px]" /> },
        { path: '/admin/register-face',     label: 'Register Face',       icon: <FaCamera className="text-[15px]" /> },
        { path: '/admin/payroll',           label: 'Payroll',             icon: <FaMoneyBillWave className="text-[15px]" /> },
        { path: '/admin/leave',             label: 'Leave Management',    icon: <FaClipboardList className="text-[15px]" /> },
        { path: '/admin/contacts',          label: 'Contact Submissions', icon: <FaAddressBook className="text-[15px]" /> },
        { path: '/admin/reports',           label: 'Reports',             icon: <FaChartBar className="text-[15px]" /> },
        { path: '/admin/messages',          label: 'Messages',            icon: <FaEnvelope className="text-[15px]" /> },
      ],
      hr: [
        { path: '/hr/recruitment',          label: 'Recruitment',         icon: <FaBriefcase className="text-[15px]" /> },
        { path: '/hr/contracts',            label: 'Contracts',           icon: <FaFileSignature className="text-[15px]" /> },
        { path: '/hr/onboarding',           label: 'Onboarding',          icon: <FaUserCheck className="text-[15px]" /> },
        { path: '/hr/attendance',           label: 'My Attendance',       icon: <FaCalendarCheck className="text-[15px]" /> },
        { path: '/hr/employee-attendance',  label: 'Employee Attendance', icon: <FaCalendarCheck className="text-[15px]" /> },
        { path: '/hr/leave',                label: 'Leave',               icon: <FaClipboardList className="text-[15px]" /> },
        { path: '/hr/payroll',              label: 'Payroll',             icon: <FaMoneyBillWave className="text-[15px]" /> },
        { path: '/hr/contacts',             label: 'Contact Submissions', icon: <FaAddressBook className="text-[15px]" /> },
        { path: '/hr/reports',              label: 'Reports',             icon: <FaChartBar className="text-[15px]" /> },
        { path: '/hr/messages',             label: 'Messages',            icon: <FaEnvelope className="text-[15px]" /> },
      ],
      employee: [
        { path: '/employee/attendance',     label: 'Attendance',          icon: <FaCalendarCheck className="text-[15px]" /> },
        { path: '/employee/leave',          label: 'Leave',               icon: <FaClipboardList className="text-[15px]" /> },
        { path: '/employee/contracts',      label: 'My Contracts',        icon: <FaFileSignature className="text-[15px]" /> },
        { path: '/employee/onboarding',     label: 'My Onboarding',       icon: <FaUserCheck className="text-[15px]" /> },
        { path: '/employee/payroll',        label: 'Payroll',             icon: <FaMoneyBillWave className="text-[15px]" /> },
        { path: '/employee/messages',       label: 'Messages',            icon: <FaEnvelope className="text-[15px]" /> },
      ],
    };

    const aiToolsItem = role === 'employee' ? {
      label: 'AI Tools',
      icon: <FaBrain className="text-[15px]" />,
      isDropdown: true,
      children: [
        { path: '/employee/career-coach', label: 'Career Coach', icon: <FaUserGraduate className="text-xs" /> },
        { path: '/employee/learning-hub', label: 'Learning Hub', icon: <FaGraduationCap className="text-xs" /> },
        { path: '/employee/wellness',     label: 'Wellness',     icon: <FaHandHoldingHeart className="text-xs" /> },
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

  if (!currentUser) return null;

  const sidebarWidth = 'w-64';

  if (isMobile && !isOpen) return null;

  const renderProfilePicture = (size = 'w-5 h-5') => {
    const imageUrl = getProfileImageUrl();
    if (imageUrl && !avatarError) {
      return (
        <img 
          src={imageUrl} 
          alt="Profile" 
          className={`${size} rounded-full object-cover`}
          onError={() => setAvatarError(true)}
        />
      );
    } else {
      return (
        <div className={`${size} rounded-full ${accentBg} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-semibold text-[10px]">{getInitials()}</span>
        </div>
      );
    }
  };

  // Shared classNames for a nav row, active vs. inactive
  const navRowClass = (active) => `
    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 group
    ${active
      ? `${accentBg} text-white`
      : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
    }
  `;

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
          onClick={onMobileClose}
        />
      )}

      <aside 
        className={`
          fixed left-0 top-0 h-full bg-[#0B1120]
          text-white transition-transform duration-200 z-50 flex flex-col
          border-r border-white/[0.06]
          ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
          ${sidebarWidth}
        `}
      >
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
          <Link to={`/${currentUser?.role}/dashboard`} className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 ${accentBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <FaRocket className="text-xs" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-white truncate leading-tight">HRM System</div>
              <div className="text-[11px] text-slate-500 truncate">Enterprise Portal</div>
            </div>
          </Link>

          <Link
            to={`/${currentUser?.role}/notifications`}
            onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
            className="relative flex-shrink-0 p-2 rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            title="Notifications"
          >
            <FaBell className="text-sm" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          </Link>
        </div>

        {/* User profile */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {getProfileImageUrl() && !avatarError ? (
                <img 
                  src={getProfileImageUrl()} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className={`w-10 h-10 rounded-full ${accentBg} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-semibold text-sm">{getInitials()}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-white leading-tight">{currentUser?.name || 'User'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <p className="text-[11px] text-slate-400 capitalize truncate">{currentUser?.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 sidebar-nav">
          <div className="space-y-0.5">
            {baseItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                className={navRowClass(isActive(item.path))}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="text-[13px] font-medium truncate">{item.label}</span>
              </Link>
            ))}

            {regularItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                className={navRowClass(isActive(item.path))}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="text-[13px] font-medium truncate">{item.label}</span>
              </Link>
            ))}

            {aiToolsItem && (
              <div>
                <button
                  onClick={toggleAITools}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors duration-150 text-slate-400 hover:bg-white/[0.06] hover:text-white group"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0">{aiToolsItem.icon}</span>
                    <span className="text-[13px] font-medium">{aiToolsItem.label}</span>
                  </div>
                  <FaChevronRight className={`text-[10px] transition-transform duration-150 ${isAIToolsOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {isAIToolsOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/[0.08] pl-3">
                    {aiToolsItem.children.map((child, childIndex) => (
                      <Link
                        key={childIndex}
                        to={child.path}
                        onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150
                          ${isActive(child.path) 
                            ? `${accentBg} text-white` 
                            : 'text-slate-500 hover:bg-white/[0.06] hover:text-white'
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

        {/* Footer: Profile, Notifications, Logout */}
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className="space-y-0.5">
            <Link
              to={`/${currentUser?.role}/profile`}
              onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
              className={navRowClass(isActive(`/${currentUser?.role}/profile`))}
            >
              <span className="flex-shrink-0">{renderProfilePicture('w-5 h-5')}</span>
              <span className="text-[13px] font-medium truncate">Profile</span>
            </Link>

            <Link
              to={`/${currentUser?.role}/notifications`}
              onClick={() => { if (isMobile && onMobileClose) onMobileClose(); }}
              className={navRowClass(isActive(`/${currentUser?.role}/notifications`))}
            >
              <span className="flex-shrink-0"><FaBell className="text-[15px]" /></span>
              <span className="text-[13px] font-medium truncate">Notifications</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
            >
              <FaSignOutAlt className="text-[15px] flex-shrink-0" />
              <span className="text-[13px] font-medium">Logout</span>
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
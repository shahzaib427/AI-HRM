import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBrain, FaBook, FaHeartbeat, FaChartLine, FaUserTie, FaUsers, 
  FaCalendarAlt, FaMoneyBill, FaChartBar, FaCog, FaSignOutAlt, 
  FaBriefcase, FaFileContract, FaUserPlus, FaEye, FaHome,
  FaInfoCircle, FaConciergeBell, FaIdBadge, FaEnvelope,
  FaClipboardCheck, FaRobot
} from 'react-icons/fa';
import { FiChevronDown, FiBell, FiSettings } from 'react-icons/fi';

// Import the chatbot component
import HRChatbot from './employee/Chatbot';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ TOKEN-BASED USER (NO useAuth CRASH)
  const getUserFromToken = () => {
    try {
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        if (user._id) {
          setCurrentEmployeeId(user._id);
        }
        return user;
      }
      return null;
    } catch {
      return null;
    }
  };

  const user = getUserFromToken();

  /* ---------- FIXED ROLE LINKS ---------- */
  const roleLinks = {
    admin: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: <FaChartBar className="text-sm" /> },
      { path: '/admin/employees', label: 'Employees', icon: <FaUsers className="text-sm" /> },
      { path: '/admin/attendance', label: 'Attendance', icon: <FaCalendarAlt className="text-sm" /> },
      { path: '/admin/payroll', label: 'Payroll', icon: <FaMoneyBill className="text-sm" /> },
      { path: '/admin/leave', label: 'Leave Management', icon: <FaClipboardCheck className="text-sm" /> },
      { path: '/admin/messages', label: 'Messages', icon: <FaEnvelope className="text-sm" /> },
    ],
    hr: [
      { path: '/hr/dashboard', label: 'Dashboard', icon: <FaChartBar className="text-sm" /> },
      { path: '/hr/recruitment', label: 'Recruitment', icon: <FaBriefcase className="text-sm" /> },
      { path: '/hr/leave', label: 'Leave', icon: <FaCalendarAlt className="text-sm" /> },
      { path: '/hr/messages', label: 'Messages', icon: <FaEnvelope className="text-sm" /> },
      { path: '/hr/attendance', label: 'Attendance', icon: <FaCalendarAlt className="text-sm" /> },
      { path: '/hr/contracts', label: 'Contracts', icon: <FaFileContract className="text-sm" /> },
      { path: '/hr/onboarding', label: 'Onboarding', icon: <FaUserPlus className="text-sm" /> },
    ],
    employee: [
      { path: '/employee/dashboard', label: 'Dashboard', icon: <FaChartBar className="text-sm" /> },
      { path: '/employee/attendance', label: 'Attendance', icon: <FaCalendarAlt className="text-sm" /> },
      { path: '/employee/messages', label: 'Messages', icon: <FaEnvelope className="text-sm" /> },
      { path: '/employee/payroll', label: 'Payroll', icon: <FaMoneyBill className="text-sm" /> },
      { path: '/employee/leave', label: 'Leave', icon: <FaCalendarAlt className="text-sm" /> },
    ],
  };

  /* ---------- PROFILE LINKS - FIXED DUPLICATE KEYS ---------- */
  const getProfileLinks = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return [
        { path: '/admin/profile', label: 'Admin Profile', icon: <FaUserTie className="text-sm" /> },
        { path: '/admin/reports', label: 'Reports', icon: <FaChartBar className="text-sm" /> },
        { path: '/admin/settings', label: 'Settings', icon: <FaCog className="text-sm" /> },
      ];
    } else if (user.role === 'hr') {
      return [
        { path: '/hr/profile', label: 'HR Profile', icon: <FaUserTie className="text-sm" /> },
        { path: '/hr/reports', label: 'Reports', icon: <FaChartBar className="text-sm" /> },
        { path: '/hr/settings', label: 'Settings', icon: <FaCog className="text-sm" /> },
      ];
    } else if (user.role === 'employee') {
      return [
        { path: '/employee/profile', label: 'My Profile', icon: <FaUserTie className="text-sm" /> },
        { path: '/employee/settings', label: 'Settings', icon: <FaCog className="text-sm" /> },
        { path: '#', label: 'Chatbot', icon: <FaRobot className="text-sm" />, isChatbot: true },
      ];
    }
    
    return [];
  };

  /* ---------- AI LINKS ---------- */
  const aiLinks = user?.role === 'employee' ? [
    { path: '/employee/career-coach', label: 'Career Coach', icon: <FaBrain className="text-sm" /> },
    { path: '/employee/learning-hub', label: 'Learning Hub', icon: <FaBook className="text-sm" /> },
    { path: '/employee/wellness', label: 'Wellness', icon: <FaHeartbeat className="text-sm" /> },
    { path: '/employee/productivity', label: 'Productivity', icon: <FaChartLine className="text-sm" /> },
  ] : [];

  /* ---------- PUBLIC LINKS ---------- */
  const publicLinks = [
    { path: '/', label: 'Home', icon: <FaHome /> },
    { path: '/about', label: 'About', icon: <FaInfoCircle /> },
    { path: '/careers', label: 'Careers', icon: <FaIdBadge /> },
    { path: '/contact', label: 'Contact', icon: <FaEnvelope /> },
  ];

  const getLinks = () => (!user ? publicLinks : roleLinks[user.role] || []);

  /* ---------- NOTIFICATIONS ---------- */
  const notifications = [
    { id: 1, text: 'New leave request from John Doe', time: '2 min ago', unread: true },
    { id: 2, text: 'Payroll processed successfully', time: '1 hour ago', unread: true },
    { id: 3, text: 'System maintenance scheduled', time: '3 hours ago', unread: true },
    { id: 4, text: 'New employee onboarded', time: '1 day ago', unread: false },
    { id: 5, text: 'Attendance report generated', time: '2 days ago', unread: false },
  ];

  /* ---------- LOGOUT ---------- */
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  const handleMarkAllAsRead = () => {
    setUnreadNotifications(0);
    setNotificationsOpen(false);
  };

  // Handle chatbot click
  const handleChatbotClick = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('toggleChatbot'));
  };

  /* ---------- COMPONENTS ---------- */
  const NavItem = ({ path, label, icon, onClick }) => (
    <Link
      to={path}
      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
        location.pathname === path
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
      onClick={onClick || (() => setIsMenuOpen(false))}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );

  const DropdownLink = ({ to, children, onClick }) => (
    <Link
      to={to}
      className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors group"
      onClick={onClick}
    >
      {children}
    </Link>
  );

  return (
    <>
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white sticky top-0 z-50 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* LOGO */}
          <Link
            to={!user ? '/' : `/${user.role}/dashboard`}
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <FaUserTie className="text-lg" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-lg leading-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                HRM System
              </div>
              <div className="text-xs text-slate-300 leading-tight">Human Resource Management</div>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center space-x-1 ml-4">
            {getLinks().map(link => (
              <NavItem key={link.path} {...link} />
            ))}

            {/* AI Tools Dropdown for Employees */}
            {user?.role === 'employee' && aiLinks.length > 0 && (
              <div className="relative group">
                <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200">
                  <FaBrain className="text-sm" />
                  <span>AI Tools</span>
                  <FiChevronDown className="text-xs" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {aiLinks.map(link => (
                    <DropdownLink key={link.path} to={link.path}>
                      <span className="mr-3 text-slate-400">{link.icon}</span>
                      <span>{link.label}</span>
                    </DropdownLink>
                  ))}
                </div>
              </div>
            )}

            {/* Public Login Button */}
            {!user && (
              <NavItem 
                path="/login" 
                label="Login" 
                icon={<span className="text-sm">🔐</span>} 
              />
            )}

            {/* User Controls */}
            {user && (
              <div className="flex items-center space-x-2 ml-2">
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors relative"
                  >
                    <FiBell className="text-lg" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-xs rounded-full flex items-center justify-center">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notificationsOpen && (
                    <>
                      <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                        <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                          <h3 className="font-semibold text-white">Notifications</h3>
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Mark all as read
                          </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.map(notification => (
                            <div
                              key={notification.id}
                              className={`px-4 py-3 border-b border-slate-700 hover:bg-slate-700 cursor-pointer ${
                                notification.unread ? 'bg-slate-700/30' : ''
                              }`}
                            >
                              <p className="text-sm text-white">{notification.text}</p>
                              <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                            </div>
                          ))}
                        </div>
                        <div className="px-4 py-3 border-t border-slate-700">
                          <Link
                            to={`/${user.role}/notifications`}
                            className="text-sm text-center text-blue-400 hover:text-blue-300 block"
                          >
                            View all notifications
                          </Link>
                        </div>
                      </div>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setNotificationsOpen(false)}
                      />
                    </>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="font-medium">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium leading-tight">{user.name || 'User'}</div>
                      <div className="text-xs opacity-80 capitalize">{user.role}</div>
                    </div>
                    <FiChevronDown className={`transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown Content */}
                  {isProfileOpen && (
                    <>
                      <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-slate-700">
                          <div className="font-semibold text-white truncate">{user.name}</div>
                          <div className="text-xs text-slate-400 capitalize mt-1">{user.role}</div>
                          <div className="text-xs text-slate-500 truncate mt-1">{user.email}</div>
                          <div className="text-xs text-slate-500 mt-1">ID: {user.employeeId || user._id?.substring(0, 8)}</div>
                        </div>

                        {/* Profile Links */}
                        <div className="py-1">
                          {getProfileLinks().map(link => {
                            // Special handling for chatbot link
                            if (link.isChatbot) {
                              return (
                                <button
                                  key="chatbot"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.dispatchEvent(new CustomEvent('toggleChatbot'));
                                    setIsProfileOpen(false);
                                  }}
                                  className="w-full flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors group"
                                >
                                  <span className="mr-3 text-slate-400">{link.icon}</span>
                                  <span>{link.label}</span>
                                </button>
                              );
                            }
                            return (
                              <DropdownLink 
                                key={link.path} 
                                to={link.path} 
                                onClick={() => setIsProfileOpen(false)}
                              >
                                <span className="mr-3 text-slate-400">{link.icon}</span>
                                <span>{link.label}</span>
                              </DropdownLink>
                            );
                          })}
                        </div>

                        {/* AI Tools for Mobile (if employee) */}
                        {user.role === 'employee' && (
                          <div className="border-t border-slate-700 py-1">
                            <div className="px-4 py-2 text-xs uppercase tracking-wider text-slate-400 font-medium">
                              AI Tools
                            </div>
                            {aiLinks.map(a => (
                              <DropdownLink 
                                key={a.path} 
                                to={a.path} 
                                onClick={() => setIsProfileOpen(false)}
                              >
                                <span className="mr-3 text-slate-400">{a.icon}</span>
                                <span>{a.label}</span>
                              </DropdownLink>
                            ))}
                          </div>
                        )}

                        {/* Logout */}
                        <div className="border-t border-slate-700">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-4 py-3 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                          >
                            <FaSignOutAlt className="mr-3" />
                            Logout
                          </button>
                        </div>
                      </div>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileOpen(false)}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </nav>

          {/* MOBILE MENU BUTTON */}
          <button
            className="md:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <span className="text-xl">✕</span>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* MOBILE MENU */}
        {isMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-700 p-4 space-y-1">
            {getLinks().map(link => (
              <NavItem key={link.path} {...link} />
            ))}

            {/* AI Tools for Mobile */}
            {user?.role === 'employee' && (
              <>
                <div className="pt-3 border-t border-slate-700">
                  <div className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">
                    AI Tools
                  </div>
                  {aiLinks.map(a => (
                    <NavItem key={a.path} {...a} />
                  ))}
                </div>
              </>
            )}

            {!user && (
              <NavItem 
                path="/login" 
                label="Login" 
                icon={<span className="text-sm">🔐</span>} 
              />
            )}

            {user && (
              <>
                <div className="pt-3 border-t border-slate-700">
                  <div className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">
                    Account
                  </div>
                  
                  {getProfileLinks().map(link => {
                    // Special handling for chatbot link in mobile
                    if (link.isChatbot) {
                      return (
                        <button
                          key="chatbot-mobile"
                          onClick={(e) => {
                            e.preventDefault();
                            window.dispatchEvent(new CustomEvent('toggleChatbot'));
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white w-full"
                        >
                          <span className="flex-shrink-0">{link.icon}</span>
                          <span>{link.label}</span>
                        </button>
                      );
                    }
                    return <NavItem key={link.path} {...link} />;
                  })}
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-400 hover:bg-slate-700 rounded transition-colors mt-2"
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Add the chatbot component */}
      <HRChatbot />
    </>
  );
};

export default Header;
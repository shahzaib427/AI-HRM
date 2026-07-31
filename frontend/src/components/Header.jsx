import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaInfoCircle, FaIdBadge, FaEnvelope, FaUserTie } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth?.() || {};
  const [mobileOpen, setMobileOpen] = useState(false);

  // Only public links in header
  const publicLinks = [
    { path: '/', label: 'Home', icon: <FaHome /> },
    { path: '/about', label: 'About', icon: <FaInfoCircle /> },
    { path: '/careers', label: 'Careers', icon: <FaIdBadge /> },
    { path: '/contact', label: 'Contact', icon: <FaEnvelope /> },
  ];

  const isActive = (path) => location.pathname === path;

  // If user is logged in, don't show header
  if (user) {
    return null;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white sticky top-0 z-50 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <FaUserTie className="text-lg" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-lg leading-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                AI-HRM
              </div>
              <div className="text-xs text-slate-300 leading-tight">Human Resource Management</div>
            </div>
          </Link>

          {/* Desktop Navigation - Only Public Pages */}
          <nav className="hidden md:flex items-center space-x-1 ml-4">
            {publicLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="flex-shrink-0">{link.icon}</span>
                <span className="whitespace-nowrap">{link.label}</span>
              </Link>
            ))}

            {/* Login button */}
            <Link
              to="/login"
              className="px-4 py-2 border border-slate-600 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200"
            >
              Log In
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu - Only Public Pages */}
        {mobileOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-700 p-4 space-y-2">
            {publicLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
            <Link
              to="/login"
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-blue-400 hover:bg-slate-700 hover:text-blue-300 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <span>🔐</span>
              <span>Log In</span>
            </Link>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
import React, { useState, useEffect } from 'react';

const EmployeeSettings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      leaveAlerts: true,
      payrollAlerts: true,
      announcementEmails: false,
      marketingEmails: false,
      teamUpdates: true,
      projectUpdates: true,
      dailyDigest: true,
      weeklyReport: false
    },
    privacy: {
      profileVisibility: 'team', // team, company, public
      showEmail: true,
      showPhone: true,
      showBirthday: false,
      activityStatus: true,
      lastSeen: true,
      syncCalendar: true,
      shareDocuments: true
    },
    security: {
      twoFactorAuth: false,
      loginAlerts: true,
      deviceManagement: true,
      sessionTimeout: 30, // minutes
      passwordExpiry: 90, // days
      trustedDevices: []
    },
    preferences: {
      theme: 'light', // light, dark, auto
      language: 'english',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      currency: 'INR',
      weekStart: 'monday',
      timeFormat: '24h',
      compactView: false
    },
    integrations: {
      googleCalendar: true,
      microsoftTeams: true,
      slack: false,
      github: false,
      jira: true,
      asana: false,
      dropbox: false,
      googleDrive: true
    }
  });

  const [activeSection, setActiveSection] = useState('notifications');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ show: false, type: '', message: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [devices, setDevices] = useState([
    { id: 1, name: 'MacBook Pro', type: 'laptop', os: 'macOS', lastActive: '2024-01-31 10:30', location: 'Bangalore', current: true },
    { id: 2, name: 'iPhone 14', type: 'mobile', os: 'iOS', lastActive: '2024-01-31 09:15', location: 'Bangalore', current: false },
    { id: 3, name: 'Windows Desktop', type: 'desktop', os: 'Windows 11', lastActive: '2024-01-29 15:45', location: 'Home Office', current: false }
  ]);

  const [activityLogs, setActivityLogs] = useState([
    { id: 1, action: 'Login', device: 'MacBook Pro', location: 'Bangalore', time: '2024-01-31 10:30', status: 'success' },
    { id: 2, action: 'Password Change', device: 'iPhone 14', location: 'Bangalore', time: '2024-01-30 14:20', status: 'success' },
    { id: 3, action: 'Profile Update', device: 'Windows Desktop', location: 'Home', time: '2024-01-29 15:45', status: 'success' },
    { id: 4, action: 'Failed Login', device: 'Unknown', location: 'Mumbai', time: '2024-01-28 03:15', status: 'failed' },
    { id: 5, action: 'Settings Updated', device: 'MacBook Pro', location: 'Bangalore', time: '2024-01-27 11:10', status: 'success' }
  ]);

  // Handle setting changes
  const handleSettingChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  // Handle toggle switches
  const handleToggle = (category, field) => {
    handleSettingChange(category, field, !settings[category][field]);
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSaveStatus({
        show: true,
        type: 'success',
        message: 'Settings saved successfully!'
      });
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveStatus({ show: false, type: '', message: '' });
      }, 3000);
    } catch (error) {
      setSaveStatus({
        show: true,
        type: 'error',
        message: 'Failed to save settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveStatus({
        show: true,
        type: 'error',
        message: 'New passwords do not match!'
      });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setSaveStatus({
        show: true,
        type: 'error',
        message: 'Password must be at least 8 characters long!'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus({
        show: true,
        type: 'success',
        message: 'Password changed successfully!'
      });
      
      // Reset form and close modal
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveStatus({ show: false, type: '', message: '' });
      }, 3000);
    } catch (error) {
      setSaveStatus({
        show: true,
        type: 'error',
        message: 'Failed to change password. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle revoke device
  const handleRevokeDevice = (deviceId) => {
    if (window.confirm('Are you sure you want to revoke access for this device?')) {
      setDevices(devices.filter(device => device.id !== deviceId));
    }
  };

  // Render setting toggle
  const SettingToggle = ({ label, description, category, field, disabled = false }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <label className="font-medium text-gray-900 text-sm">{label}</label>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => !disabled && handleToggle(category, field)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          settings[category][field]
            ? 'bg-gradient-to-r from-blue-600 to-cyan-500'
            : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            settings[category][field] ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  // Render select input
  const SettingSelect = ({ label, description, category, field, options }) => (
    <div className="py-3">
      <label className="font-medium text-gray-900 text-sm mb-2 block">{label}</label>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <select
        value={settings[category][field]}
        onChange={(e) => handleSettingChange(category, field, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );

  // Render number input
  const SettingNumber = ({ label, description, category, field, min, max, unit }) => (
    <div className="py-3">
      <label className="font-medium text-gray-900 text-sm mb-2 block">{label}</label>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={settings[category][field]}
          onChange={(e) => handleSettingChange(category, field, parseInt(e.target.value))}
          min={min}
          max={max}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
        />
        {unit && <span className="text-sm text-gray-600">{unit}</span>}
      </div>
    </div>
  );

  // Activity log item
  const ActivityLogItem = ({ log }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          log.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {log.status === 'success' ? '✓' : '✗'}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{log.action}</p>
          <p className="text-xs text-gray-500">{log.device} • {log.location}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-600">{log.time}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {log.status}
        </span>
      </div>
    </div>
  );

  // Device item
  const DeviceItem = ({ device }) => (
    <div className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            device.type === 'laptop' ? 'bg-blue-100 text-blue-600' :
            device.type === 'mobile' ? 'bg-purple-100 text-purple-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {device.type === 'laptop' ? '💻' : device.type === 'mobile' ? '📱' : '🖥️'}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{device.name}</p>
            <p className="text-xs text-gray-500">{device.os} • {device.location}</p>
          </div>
        </div>
        {device.current && (
          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Current
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Last active: {device.lastActive}</p>
        {!device.current && (
          <button
            onClick={() => handleRevokeDevice(device.id)}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Revoke Access
          </button>
        )}
      </div>
    </div>
  );

  // Settings sidebar navigation
  const settingsSections = [
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '👁️' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'integrations', label: 'Integrations', icon: '🔄' },
    { id: 'devices', label: 'Devices', icon: '📱' },
    { id: 'activity', label: 'Activity Log', icon: '📝' },
    { id: 'account', label: 'Account', icon: '👤' }
  ];

  return (
    <div className="min-h-screen py-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50/30">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-200/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-200/20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Settings</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your account settings and preferences
              </p>
            </div>
            
            {/* Save Status Indicator */}
            {saveStatus.show && (
              <div className={`px-4 py-2 rounded-lg font-medium text-sm ${
                saveStatus.type === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {saveStatus.message}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveSection('account')}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 hover:from-red-700 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium text-sm shadow hover:shadow-md"
              >
                Delete Account
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg transition-all duration-200 font-medium text-sm shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Settings</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {settingsSections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-all duration-200 ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span className="font-medium text-sm">{section.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Settings Overview</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Active Devices</span>
                  <span className="text-sm font-bold text-blue-600">{devices.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Integrations</span>
                  <span className="text-sm font-bold text-green-600">
                    {Object.values(settings.integrations).filter(v => v).length}/8
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Notifications</span>
                  <span className="text-sm font-bold text-purple-600">
                    {Object.values(settings.notifications).filter(v => v).length}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">2FA Enabled</span>
                  <span className="text-sm font-bold text-amber-600">
                    {settings.security.twoFactorAuth ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-6">
                {/* Notifications Section */}
                {activeSection === 'notifications' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSettings(prev => ({
                              ...prev,
                              notifications: Object.fromEntries(
                                Object.keys(prev.notifications).map(key => [key, true])
                              )
                            }))
                          }}
                          className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Enable All
                        </button>
                        <button
                          onClick={() => {
                            setSettings(prev => ({
                              ...prev,
                              notifications: Object.fromEntries(
                                Object.keys(prev.notifications).map(key => [key, false])
                              )
                            }))
                          }}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Disable All
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <h3 className="font-medium text-gray-900 mb-3">Work Related</h3>
                        <SettingToggle
                          label="Leave Alerts"
                          description="Get notified about leave approvals and rejections"
                          category="notifications"
                          field="leaveAlerts"
                        />
                        <SettingToggle
                          label="Payroll Alerts"
                          description="Salary updates and payslip availability"
                          category="notifications"
                          field="payrollAlerts"
                        />
                        <SettingToggle
                          label="Team Updates"
                          description="Team announcements and member changes"
                          category="notifications"
                          field="teamUpdates"
                        />
                        <SettingToggle
                          label="Project Updates"
                          description="Project deadlines and task assignments"
                          category="notifications"
                          field="projectUpdates"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="font-medium text-gray-900 mb-3">Email Preferences</h3>
                        <SettingToggle
                          label="Email Notifications"
                          description="Receive notifications via email"
                          category="notifications"
                          field="emailNotifications"
                        />
                        <SettingToggle
                          label="Announcement Emails"
                          description="Company-wide announcements and news"
                          category="notifications"
                          field="announcementEmails"
                        />
                        <SettingToggle
                          label="Marketing Emails"
                          description="Product updates and promotional offers"
                          category="notifications"
                          field="marketingEmails"
                        />
                        <SettingToggle
                          label="Daily Digest"
                          description="Daily summary of activities and updates"
                          category="notifications"
                          field="dailyDigest"
                        />
                        <SettingToggle
                          label="Weekly Report"
                          description="Weekly performance and activity report"
                          category="notifications"
                          field="weeklyReport"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-3">Push Notifications</h3>
                      <SettingToggle
                        label="Push Notifications"
                        description="Receive browser and mobile push notifications"
                        category="notifications"
                        field="pushNotifications"
                      />
                    </div>
                  </div>
                )}

                {/* Privacy Section */}
                {activeSection === 'privacy' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Privacy Settings</h2>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Profile Visibility</h3>
                      <SettingSelect
                        label="Who can see your profile?"
                        description="Control who can view your profile information"
                        category="privacy"
                        field="profileVisibility"
                        options={[
                          { value: 'team', label: 'Team Members Only' },
                          { value: 'company', label: 'All Company Employees' },
                          { value: 'public', label: 'Public (Logged-in users)' }
                        ]}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-gray-900 mb-3">Personal Information</h3>
                      <SettingToggle
                        label="Show Email Address"
                        description="Make your email visible to team members"
                        category="privacy"
                        field="showEmail"
                      />
                      <SettingToggle
                        label="Show Phone Number"
                        description="Make your phone number visible to team members"
                        category="privacy"
                        field="showPhone"
                      />
                      <SettingToggle
                        label="Show Birthday"
                        description="Display your birthday to team members"
                        category="privacy"
                        field="showBirthday"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-gray-900 mb-3">Activity & Presence</h3>
                      <SettingToggle
                        label="Show Activity Status"
                        description="Let others see when you're active"
                        category="privacy"
                        field="activityStatus"
                      />
                      <SettingToggle
                        label="Show Last Seen"
                        description="Show when you were last active"
                        category="privacy"
                        field="lastSeen"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-gray-900 mb-3">Data Sharing</h3>
                      <SettingToggle
                        label="Sync Calendar"
                        description="Sync your work calendar with external apps"
                        category="privacy"
                        field="syncCalendar"
                      />
                      <SettingToggle
                        label="Share Documents"
                        description="Allow document sharing with team members"
                        category="privacy"
                        field="shareDocuments"
                      />
                    </div>
                  </div>
                )}

                {/* Security Section */}
                {activeSection === 'security' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-gray-900 mb-3">Authentication</h3>
                      <SettingToggle
                        label="Two-Factor Authentication"
                        description="Add an extra layer of security to your account"
                        category="security"
                        field="twoFactorAuth"
                      />
                      <SettingToggle
                        label="Login Alerts"
                        description="Get notified of new logins from unknown devices"
                        category="security"
                        field="loginAlerts"
                      />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Password Management</h3>
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-blue-900">Password Strength</p>
                            <p className="text-xs text-blue-700">Last changed 30 days ago</p>
                          </div>
                          <button
                            onClick={() => setShowPasswordModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg transition-all duration-200 text-sm"
                          >
                            Change Password
                          </button>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div className="w-3/4 h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"></div>
                        </div>
                        <p className="text-xs text-blue-700 mt-2">Strong password recommended</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <SettingNumber
                        label="Session Timeout"
                        description="Automatically log out after inactivity"
                        category="security"
                        field="sessionTimeout"
                        min={5}
                        max={120}
                        unit="minutes"
                      />
                      <SettingNumber
                        label="Password Expiry"
                        description="Require password change after"
                        category="security"
                        field="passwordExpiry"
                        min={30}
                        max={365}
                        unit="days"
                      />
                    </div>
                    
                    <SettingToggle
                      label="Device Management"
                      description="Manage and review logged-in devices"
                      category="security"
                      field="deviceManagement"
                    />
                  </div>
                )}

                {/* Preferences Section */}
                {activeSection === 'preferences' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Preferences</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <SettingSelect
                        label="Theme"
                        description="Choose your preferred theme"
                        category="preferences"
                        field="theme"
                        options={[
                          { value: 'light', label: 'Light Theme' },
                          { value: 'dark', label: 'Dark Theme' },
                          { value: 'auto', label: 'Auto (System)' }
                        ]}
                      />
                      <SettingSelect
                        label="Language"
                        description="Choose your preferred language"
                        category="preferences"
                        field="language"
                        options={[
                          { value: 'english', label: 'English' },
                          { value: 'hindi', label: 'Hindi' },
                          { value: 'spanish', label: 'Spanish' },
                          { value: 'french', label: 'French' }
                        ]}
                      />
                      <SettingSelect
                        label="Timezone"
                        description="Set your local timezone"
                        category="preferences"
                        field="timezone"
                        options={[
                          { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
                          { value: 'America/New_York', label: 'Eastern Time (ET)' },
                          { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
                          { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' }
                        ]}
                      />
                      <SettingSelect
                        label="Date Format"
                        description="Choose your preferred date format"
                        category="preferences"
                        field="dateFormat"
                        options={[
                          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                        ]}
                      />
                      <SettingSelect
                        label="Currency"
                        description="Set your preferred currency"
                        category="preferences"
                        field="currency"
                        options={[
                          { value: 'INR', label: 'Indian Rupee (₹)' },
                          { value: 'USD', label: 'US Dollar ($)' },
                          { value: 'EUR', label: 'Euro (€)' },
                          { value: 'GBP', label: 'British Pound (£)' }
                        ]}
                      />
                      <SettingSelect
                        label="Week Start"
                        description="First day of the week"
                        category="preferences"
                        field="weekStart"
                        options={[
                          { value: 'monday', label: 'Monday' },
                          { value: 'sunday', label: 'Sunday' }
                        ]}
                      />
                      <SettingSelect
                        label="Time Format"
                        description="Choose 12-hour or 24-hour format"
                        category="preferences"
                        field="timeFormat"
                        options={[
                          { value: '12h', label: '12-hour (AM/PM)' },
                          { value: '24h', label: '24-hour' }
                        ]}
                      />
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <SettingToggle
                        label="Compact View"
                        description="Use compact view for lists and tables"
                        category="preferences"
                        field="compactView"
                      />
                    </div>
                  </div>
                )}

                {/* Integrations Section */}
                {activeSection === 'integrations' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Integrations</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Connect your favorite apps and services to enhance your workflow
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 text-lg">📅</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Google Calendar</p>
                              <p className="text-xs text-gray-500">Sync your work calendar</p>
                            </div>
                          </div>
                          <SettingToggle
                            category="integrations"
                            field="googleCalendar"
                            label=""
                            description=""
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <span className="text-purple-600 text-lg">💬</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Microsoft Teams</p>
                              <p className="text-xs text-gray-500">Team communication</p>
                            </div>
                          </div>
                          <SettingToggle
                            category="integrations"
                            field="microsoftTeams"
                            label=""
                            description=""
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                              <span className="text-yellow-600 text-lg">💬</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Slack</p>
                              <p className="text-xs text-gray-500">Team messaging</p>
                            </div>
                          </div>
                          <SettingToggle
                            category="integrations"
                            field="slack"
                            label=""
                            description=""
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-600 text-lg">💻</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">GitHub</p>
                              <p className="text-xs text-gray-500">Code repository</p>
                            </div>
                          </div>
                          <SettingToggle
                            category="integrations"
                            field="github"
                            label=""
                            description=""
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 text-lg">🎯</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Jira</p>
                              <p className="text-xs text-gray-500">Project management</p>
                            </div>
                          </div>
                          <SettingToggle
                            category="integrations"
                            field="jira"
                            label=""
                            description=""
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                              <span className="text-orange-600 text-lg">✅</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Asana</p>
                              <p className="text-xs text-gray-500">Task management</p>
                            </div>
                          </div>
                          <SettingToggle
                            category="integrations"
                            field="asana"
                            label=""
                            description=""
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 text-lg">📦</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Dropbox</p>
                              <p className="text-xs text-gray-500">File storage</p>
                            </div>
                          </div>
                          <SettingToggle
                            category="integrations"
                            field="dropbox"
                            label=""
                            description=""
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                              <span className="text-green-600 text-lg">☁️</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Google Drive</p>
                              <p className="text-xs text-gray-500">Cloud storage</p>
                            </div>
                          </div>
                          <SettingToggle
                            category="integrations"
                            field="googleDrive"
                            label=""
                            description=""
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Devices Section */}
                {activeSection === 'devices' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Active Devices</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Manage devices that are logged into your account
                    </p>
                    
                    <div className="space-y-3">
                      {devices.map(device => (
                        <DeviceItem key={device.id} device={device} />
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        If you see any unfamiliar devices, revoke access immediately.
                      </p>
                    </div>
                  </div>
                )}

                {/* Activity Log Section */}
                {activeSection === 'activity' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Activity Log</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Recent account activities and security events
                    </p>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {activityLogs.map(log => (
                        <ActivityLogItem key={log.id} log={log} />
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Load More Activity →
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Section */}
                {activeSection === 'account' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Account Management</h2>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                        <h3 className="font-bold text-red-900 mb-2">Danger Zone</h3>
                        <p className="text-sm text-red-700 mb-4">
                          These actions are irreversible. Please proceed with caution.
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-300">
                            <div>
                              <p className="font-medium text-red-900">Delete Account</p>
                              <p className="text-xs text-red-700">
                                Permanently delete your account and all data
                              </p>
                            </div>
                            <button className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 hover:from-red-700 hover:to-pink-600 text-white rounded-lg transition-all duration-200 text-sm">
                              Delete
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-300">
                            <div>
                              <p className="font-medium text-amber-900">Deactivate Account</p>
                              <p className="text-xs text-amber-700">
                                Temporarily deactivate your account
                              </p>
                            </div>
                            <button className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white rounded-lg transition-all duration-200 text-sm">
                              Deactivate
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-300">
                            <div>
                              <p className="font-medium text-blue-900">Export Data</p>
                              <p className="text-xs text-blue-700">
                                Download all your personal data
                              </p>
                            </div>
                            <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg transition-all duration-200 text-sm">
                              Export
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <h3 className="font-bold text-green-900 mb-2">Account Information</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-800">Account Created</span>
                            <span className="text-sm font-medium text-green-900">June 1, 2020</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-800">Last Login</span>
                            <span className="text-sm font-medium text-green-900">Today, 10:30 AM</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-800">Account Status</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md animate-fade-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  type="button"
                  className="text-gray-400 hover:text-gray-600 text-xl transition-colors"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="Enter current password"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="At least 8 characters"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use a strong password with letters, numbers, and symbols
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="Re-enter new password"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 text-sm font-medium"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style jsx>{`
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EmployeeSettings;
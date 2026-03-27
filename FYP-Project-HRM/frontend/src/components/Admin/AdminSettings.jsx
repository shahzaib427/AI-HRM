import React, { useState, useEffect } from 'react';
import { 
  FiSettings, FiSave, FiRefreshCw, FiDatabase, 
  FiShield, FiBell, FiMail, FiGlobe, FiLock,
  FiUsers, FiCpu, FiHardDrive, FiCloud, FiKey,
  FiUserPlus, FiTrash2, FiUpload, FiDownload,
  FiAlertCircle, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import { FaAws, FaGoogle, FaMicrosoft } from 'react-icons/fa';

const AdminSettings = () => {
  // ========== STATE ==========
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Settings data
  const [settings, setSettings] = useState({
    general: {
      siteName: 'HRM System',
      siteDescription: 'Human Resource Management System',
      timezone: 'UTC-05:00',
      dateFormat: 'MM/DD/YYYY',
      language: 'en',
      enableRegistration: true,
      maintenanceMode: false
    },
    email: {
      smtpHost: 'smtp.company.com',
      smtpPort: '587',
      smtpUser: 'noreply@company.com',
      smtpSecure: true,
      fromName: 'HRM System',
      fromEmail: 'noreply@company.com',
      emailNotifications: true
    },
    security: {
      enable2FA: true,
      passwordMinLength: 8,
      passwordRequireNumbers: true,
      passwordRequireSymbols: true,
      sessionTimeout: 30, // minutes
      maxLoginAttempts: 5,
      ipWhitelist: ['192.168.1.0/24'],
      enableAuditLog: true
    },
    storage: {
      storageProvider: 'local', // local, aws, azure, google
      awsBucket: '',
      awsRegion: '',
      azureContainer: '',
      googleBucket: '',
      maxFileSize: 10, // MB
      allowedFileTypes: ['jpg', 'png', 'pdf', 'doc', 'docx']
    },
    api: {
      enableApi: true,
      apiKey: '••••••••••••••••',
      apiRateLimit: 100,
      enableWebhooks: false,
      webhookUrl: ''
    },
    integrations: {
      enableSlack: false,
      slackWebhook: '',
      enableGoogleAuth: false,
      googleClientId: '',
      enableMicrosoftAuth: false,
      microsoftClientId: '',
      enableZoom: false,
      zoomApiKey: ''
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily', // daily, weekly, monthly
      backupTime: '02:00',
      keepBackups: 30, // days
      backupLocation: 'cloud', // local, cloud
      lastBackup: '2024-01-15 02:00:00',
      backupSize: '2.4 GB'
    }
  });

  // ========== HANDLERS ==========
  const handleSettingChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    setSaveMessage('');
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1000);
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      // Reset to initial state
      setSettings({
        general: {
          siteName: 'HRM System',
          siteDescription: 'Human Resource Management System',
          timezone: 'UTC-05:00',
          dateFormat: 'MM/DD/YYYY',
          language: 'en',
          enableRegistration: true,
          maintenanceMode: false
        },
        email: {
          smtpHost: 'smtp.company.com',
          smtpPort: '587',
          smtpUser: 'noreply@company.com',
          smtpSecure: true,
          fromName: 'HRM System',
          fromEmail: 'noreply@company.com',
          emailNotifications: true
        },
        security: {
          enable2FA: true,
          passwordMinLength: 8,
          passwordRequireNumbers: true,
          passwordRequireSymbols: true,
          sessionTimeout: 30,
          maxLoginAttempts: 5,
          ipWhitelist: ['192.168.1.0/24'],
          enableAuditLog: true
        },
        storage: {
          storageProvider: 'local',
          awsBucket: '',
          awsRegion: '',
          azureContainer: '',
          googleBucket: '',
          maxFileSize: 10,
          allowedFileTypes: ['jpg', 'png', 'pdf', 'doc', 'docx']
        },
        api: {
          enableApi: true,
          apiKey: '••••••••••••••••',
          apiRateLimit: 100,
          enableWebhooks: false,
          webhookUrl: ''
        },
        integrations: {
          enableSlack: false,
          slackWebhook: '',
          enableGoogleAuth: false,
          googleClientId: '',
          enableMicrosoftAuth: false,
          microsoftClientId: '',
          enableZoom: false,
          zoomApiKey: ''
        },
        backup: {
          autoBackup: true,
          backupFrequency: 'daily',
          backupTime: '02:00',
          keepBackups: 30,
          backupLocation: 'cloud',
          lastBackup: '2024-01-15 02:00:00',
          backupSize: '2.4 GB'
        }
      });
      
      setSaveMessage('Settings reset to defaults!');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleRunBackup = () => {
    alert('Starting manual backup...');
    // In real app, trigger backup process
  };

  const handleRegenerateApiKey = () => {
    const newKey = [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
    handleSettingChange('api', 'apiKey', newKey);
    setSaveMessage('API key regenerated!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // ========== COMPONENTS ==========
  const SettingToggle = ({ label, checked, onChange, description }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30">
      <div className="flex-1">
        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {label}
        </p>
        {description && (
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 rounded-full peer ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} peer-checked:bg-green-500 peer-focus:ring-2 peer-focus:ring-green-500/20 transition-colors`}>
          <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform ${checked ? 'translate-x-full' : ''}`}></div>
        </div>
      </label>
    </div>
  );

  const SettingInput = ({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) => (
    <div className="space-y-1">
      <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-lg transition-all duration-300 ${
          darkMode
            ? 'bg-gray-700 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  );

  const SettingSelect = ({ label, value, onChange, options, disabled = false }) => (
    <div className="space-y-1">
      <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-lg transition-all duration-300 ${
          darkMode
            ? 'bg-gray-700 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            : 'bg-white border border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const TabButton = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 text-sm font-medium ${
        activeTab === tab
          ? darkMode 
            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
          : darkMode
            ? 'text-gray-400 hover:text-white hover:bg-gray-800'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const SystemStatusCard = ({ title, status, value, icon, color }) => (
    <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === 'online' ? 'bg-green-500/20 text-green-400' :
          status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {status}
        </span>
      </div>
      <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {title}
      </p>
      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );

  // ========== RENDER TAB CONTENT ==========
  const renderTabContent = () => {
    switch(activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SettingInput
                  label="Site Name"
                  value={settings.general.siteName}
                  onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
                />
                <SettingInput
                  label="Site Description"
                  value={settings.general.siteDescription}
                  onChange={(e) => handleSettingChange('general', 'siteDescription', e.target.value)}
                />
                <SettingSelect
                  label="Timezone"
                  value={settings.general.timezone}
                  onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                  options={[
                    { value: 'UTC-05:00', label: 'UTC-05:00 (EST)' },
                    { value: 'UTC+00:00', label: 'UTC+00:00 (GMT)' },
                    { value: 'UTC+05:30', label: 'UTC+05:30 (IST)' },
                    { value: 'UTC+08:00', label: 'UTC+08:00 (CST)' },
                    { value: 'UTC+09:00', label: 'UTC+09:00 (JST)' }
                  ]}
                />
                <SettingSelect
                  label="Date Format"
                  value={settings.general.dateFormat}
                  onChange={(e) => handleSettingChange('general', 'dateFormat', e.target.value)}
                  options={[
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                  ]}
                />
              </div>
              <div className="space-y-4">
                <SettingSelect
                  label="Language"
                  value={settings.general.language}
                  onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                    { value: 'de', label: 'German' },
                    { value: 'ja', label: 'Japanese' }
                  ]}
                />
                <SettingToggle
                  label="Enable User Registration"
                  checked={settings.general.enableRegistration}
                  onChange={(e) => handleSettingChange('general', 'enableRegistration', e.target.checked)}
                  description="Allow new users to register"
                />
                <SettingToggle
                  label="Maintenance Mode"
                  checked={settings.general.maintenanceMode}
                  onChange={(e) => handleSettingChange('general', 'maintenanceMode', e.target.checked)}
                  description="Put site under maintenance (admins only)"
                />
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SettingInput
                  label="SMTP Host"
                  value={settings.email.smtpHost}
                  onChange={(e) => handleSettingChange('email', 'smtpHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                />
                <SettingInput
                  label="SMTP Port"
                  value={settings.email.smtpPort}
                  onChange={(e) => handleSettingChange('email', 'smtpPort', e.target.value)}
                  type="number"
                />
                <SettingInput
                  label="SMTP Username"
                  value={settings.email.smtpUser}
                  onChange={(e) => handleSettingChange('email', 'smtpUser', e.target.value)}
                  type="email"
                />
                <SettingInput
                  label="SMTP Password"
                  value="••••••••"
                  onChange={(e) => handleSettingChange('email', 'smtpPassword', e.target.value)}
                  type="password"
                  placeholder="Enter password"
                />
              </div>
              <div className="space-y-4">
                <SettingToggle
                  label="Use SSL/TLS"
                  checked={settings.email.smtpSecure}
                  onChange={(e) => handleSettingChange('email', 'smtpSecure', e.target.checked)}
                  description="Enable secure connection"
                />
                <SettingInput
                  label="From Name"
                  value={settings.email.fromName}
                  onChange={(e) => handleSettingChange('email', 'fromName', e.target.value)}
                />
                <SettingInput
                  label="From Email"
                  value={settings.email.fromEmail}
                  onChange={(e) => handleSettingChange('email', 'fromEmail', e.target.value)}
                  type="email"
                />
                <SettingToggle
                  label="Email Notifications"
                  checked={settings.email.emailNotifications}
                  onChange={(e) => handleSettingChange('email', 'emailNotifications', e.target.checked)}
                  description="Send system notifications via email"
                />
              </div>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-center gap-3">
                <FiMail className={`text-blue-500 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <h4 className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                    Test Email Configuration
                  </h4>
                  <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    Send a test email to verify your SMTP settings
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  placeholder="test@example.com"
                  className={`flex-1 px-3 py-2 text-sm rounded-lg ${
                    darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                />
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg text-sm">
                  Send Test
                </button>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SettingToggle
                  label="Enable Two-Factor Authentication"
                  checked={settings.security.enable2FA}
                  onChange={(e) => handleSettingChange('security', 'enable2FA', e.target.checked)}
                  description="Require 2FA for all admin accounts"
                />
                <SettingInput
                  label="Password Minimum Length"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => handleSettingChange('security', 'passwordMinLength', e.target.value)}
                  type="number"
                />
                <SettingToggle
                  label="Require Numbers in Password"
                  checked={settings.security.passwordRequireNumbers}
                  onChange={(e) => handleSettingChange('security', 'passwordRequireNumbers', e.target.checked)}
                />
                <SettingToggle
                  label="Require Symbols in Password"
                  checked={settings.security.passwordRequireSymbols}
                  onChange={(e) => handleSettingChange('security', 'passwordRequireSymbols', e.target.checked)}
                />
              </div>
              <div className="space-y-4">
                <SettingInput
                  label="Session Timeout (minutes)"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleSettingChange('security', 'sessionTimeout', e.target.value)}
                  type="number"
                />
                <SettingInput
                  label="Max Login Attempts"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', e.target.value)}
                  type="number"
                />
                <SettingInput
                  label="IP Whitelist"
                  value={settings.security.ipWhitelist.join(', ')}
                  onChange={(e) => handleSettingChange('security', 'ipWhitelist', e.target.value.split(',').map(ip => ip.trim()))}
                  placeholder="192.168.1.0/24, 10.0.0.0/8"
                />
                <SettingToggle
                  label="Enable Audit Log"
                  checked={settings.security.enableAuditLog}
                  onChange={(e) => handleSettingChange('security', 'enableAuditLog', e.target.checked)}
                  description="Log all security events"
                />
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiShield className="inline mr-2" />
                Security Overview
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-100 to-green-200">
                  <p className="text-xl font-bold text-green-700">245</p>
                  <p className="text-xs text-green-800">Active Sessions</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200">
                  <p className="text-xl font-bold text-blue-700">12</p>
                  <p className="text-xs text-blue-800">Failed Logins</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200">
                  <p className="text-xl font-bold text-purple-700">98%</p>
                  <p className="text-xs text-purple-800">2FA Enabled</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200">
                  <p className="text-xl font-bold text-amber-700">45</p>
                  <p className="text-xs text-amber-800">Audit Events</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'storage':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SettingSelect
                  label="Storage Provider"
                  value={settings.storage.storageProvider}
                  onChange={(e) => handleSettingChange('storage', 'storageProvider', e.target.value)}
                  options={[
                    { value: 'local', label: 'Local Storage' },
                    { value: 'aws', label: 'Amazon S3' },
                    { value: 'azure', label: 'Azure Blob Storage' },
                    { value: 'google', label: 'Google Cloud Storage' }
                  ]}
                />
                
                {settings.storage.storageProvider === 'aws' && (
                  <>
                    <SettingInput
                      label="S3 Bucket Name"
                      value={settings.storage.awsBucket}
                      onChange={(e) => handleSettingChange('storage', 'awsBucket', e.target.value)}
                      placeholder="my-bucket"
                    />
                    <SettingInput
                      label="AWS Region"
                      value={settings.storage.awsRegion}
                      onChange={(e) => handleSettingChange('storage', 'awsRegion', e.target.value)}
                      placeholder="us-east-1"
                    />
                    <SettingInput
                      label="AWS Access Key"
                      value="••••••••"
                      onChange={(e) => handleSettingChange('storage', 'awsAccessKey', e.target.value)}
                      type="password"
                    />
                  </>
                )}
                
                <SettingInput
                  label="Max File Size (MB)"
                  value={settings.storage.maxFileSize}
                  onChange={(e) => handleSettingChange('storage', 'maxFileSize', e.target.value)}
                  type="number"
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    Allowed File Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['jpg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip'].map(type => (
                      <label key={type} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={settings.storage.allowedFileTypes.includes(type)}
                          onChange={(e) => {
                            const newTypes = e.target.checked
                              ? [...settings.storage.allowedFileTypes, type]
                              : settings.storage.allowedFileTypes.filter(t => t !== type);
                            handleSettingChange('storage', 'allowedFileTypes', newTypes);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          .{type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Storage Used
                    </span>
                    <span className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      2.4 GB / 10 GB
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                      style={{ width: '24%' }}
                    ></div>
                  </div>
                </div>
                
                <button className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white rounded-lg text-sm">
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SettingToggle
                  label="Enable API"
                  checked={settings.api.enableApi}
                  onChange={(e) => handleSettingChange('api', 'enableApi', e.target.checked)}
                  description="Enable REST API access"
                />
                
                <div className="space-y-1">
                  <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.api.apiKey}
                      readOnly
                      className={`flex-1 px-3 py-2 text-sm rounded-lg ${
                        darkMode
                          ? 'bg-gray-700 border border-gray-600 text-gray-300'
                          : 'bg-gray-50 border border-gray-300 text-gray-900'
                      }`}
                    />
                    <button
                      onClick={handleRegenerateApiKey}
                      className="px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white rounded-lg text-sm"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
                
                <SettingInput
                  label="API Rate Limit"
                  value={settings.api.apiRateLimit}
                  onChange={(e) => handleSettingChange('api', 'apiRateLimit', e.target.value)}
                  type="number"
                  description="Requests per minute per IP"
                />
              </div>
              
              <div className="space-y-4">
                <SettingToggle
                  label="Enable Webhooks"
                  checked={settings.api.enableWebhooks}
                  onChange={(e) => handleSettingChange('api', 'enableWebhooks', e.target.checked)}
                  description="Send webhook notifications"
                />
                
                <SettingInput
                  label="Webhook URL"
                  value={settings.api.webhookUrl}
                  onChange={(e) => handleSettingChange('api', 'webhookUrl', e.target.value)}
                  placeholder="https://webhook.site/..."
                  disabled={!settings.api.enableWebhooks}
                />
                
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h4 className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    API Usage
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Today's Requests</span>
                      <span className="font-medium">1,245</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Total Endpoints</span>
                      <span className="font-medium">42</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Active Keys</span>
                      <span className="font-medium">12</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SettingToggle
                  label="Automatic Backups"
                  checked={settings.backup.autoBackup}
                  onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
                  description="Enable automatic system backups"
                />
                
                <SettingSelect
                  label="Backup Frequency"
                  value={settings.backup.backupFrequency}
                  onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' }
                  ]}
                  disabled={!settings.backup.autoBackup}
                />
                
                <SettingInput
                  label="Backup Time"
                  value={settings.backup.backupTime}
                  onChange={(e) => handleSettingChange('backup', 'backupTime', e.target.value)}
                  type="time"
                  disabled={!settings.backup.autoBackup}
                />
                
                <SettingInput
                  label="Keep Backups (days)"
                  value={settings.backup.keepBackups}
                  onChange={(e) => handleSettingChange('backup', 'keepBackups', e.target.value)}
                  type="number"
                />
              </div>
              
              <div className="space-y-4">
                <SettingSelect
                  label="Backup Location"
                  value={settings.backup.backupLocation}
                  onChange={(e) => handleSettingChange('backup', 'backupLocation', e.target.value)}
                  options={[
                    { value: 'local', label: 'Local Server' },
                    { value: 'cloud', label: 'Cloud Storage' },
                    { value: 'both', label: 'Both Local & Cloud' }
                  ]}
                />
                
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Backup Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Last Backup</span>
                      <span className="font-medium">{settings.backup.lastBackup}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Backup Size</span>
                      <span className="font-medium">{settings.backup.backupSize}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Next Backup</span>
                      <span className="font-medium">Tomorrow 02:00</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleRunBackup}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <FiDownload />
                    Run Backup Now
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg text-sm">
                    Restore
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            {/* System Status */}
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiCpu className="inline mr-2" />
                System Status
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SystemStatusCard
                  title="CPU Usage"
                  status="normal"
                  value="65%"
                  icon={<FiCpu className="text-blue-500" />}
                  color="bg-blue-500/10"
                />
                <SystemStatusCard
                  title="Memory"
                  status="warning"
                  value="78%"
                  icon={<FiHardDrive className="text-green-500" />}
                  color="bg-green-500/10"
                />
                <SystemStatusCard
                  title="Disk Space"
                  status="normal"
                  value="42%"
                  icon={<FiDatabase className="text-purple-500" />}
                  color="bg-purple-500/10"
                />
                <SystemStatusCard
                  title="Uptime"
                  status="online"
                  value="15 days"
                  icon={<FiCloud className="text-cyan-500" />}
                  color="bg-cyan-500/10"
                />
              </div>
            </div>

            {/* Database Information */}
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiDatabase className="inline mr-2" />
                Database Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200">
                  <p className="text-2xl font-bold text-blue-700">245</p>
                  <p className="text-sm text-blue-800">Total Users</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-100 to-green-200">
                  <p className="text-2xl font-bold text-green-700">1,248</p>
                  <p className="text-sm text-green-800">Records</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200">
                  <p className="text-2xl font-bold text-purple-700">2.4 GB</p>
                  <p className="text-sm text-purple-800">Database Size</p>
                </div>
              </div>
            </div>

            {/* Maintenance Tools */}
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-sm'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiTool className="inline mr-2" />
                Maintenance Tools
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <button className="p-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white transition-all duration-300 text-sm">
                  Clear Cache
                </button>
                <button className="p-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white transition-all duration-300 text-sm">
                  Optimize DB
                </button>
                <button className="p-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white transition-all duration-300 text-sm">
                  Rebuild Indexes
                </button>
                <button className="p-3 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white transition-all duration-300 text-sm">
                  Emergency Mode
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30'
    }`}>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiSettings className="inline mr-3" />
                System Settings
              </h1>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Configure system-wide settings and preferences
              </p>
            </div>
            
            {/* Save Status */}
            <div className="flex items-center gap-4">
              {saveMessage && (
                <div className={`px-3 py-2 rounded-lg ${
                  saveMessage.includes('success') || saveMessage.includes('reset')
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  <span className="text-sm">{saveMessage}</span>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleResetSettings}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                    darkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg transition-all duration-300 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1">
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-lg'
            }`}>
              <div className="space-y-1">
                <TabButton tab="general" label="General" icon={<FiSettings />} />
                <TabButton tab="email" label="Email" icon={<FiMail />} />
                <TabButton tab="security" label="Security" icon={<FiShield />} />
                <TabButton tab="storage" label="Storage" icon={<FiDatabase />} />
                <TabButton tab="api" label="API" icon={<FiKey />} />
                <TabButton tab="backup" label="Backup" icon={<FiCloud />} />
                <TabButton tab="system" label="System" icon={<FiCpu />} />
              </div>
              
              {/* Quick Stats */}
              <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      System Version
                    </span>
                    <span className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      v2.4.1
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Last Updated
                    </span>
                    <span className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      2024-01-15
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Settings Count
                    </span>
                    <span className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      42
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className={`rounded-xl p-6 ${
              darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white shadow-lg'
            }`}>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
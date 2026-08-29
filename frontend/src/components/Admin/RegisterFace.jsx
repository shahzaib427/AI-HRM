import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import {
  FaBrain, FaCamera, FaDownload, FaSpinner, FaCheckCircle,
  FaTimesCircle, FaUser, FaSearch, FaImages, FaRedo, FaInfoCircle,
  FaUserPlus, FaUpload, FaSmile, FaRegSmile, FaUserCheck, FaShieldAlt,
  FaChevronDown, FaExclamationTriangle
} from 'react-icons/fa';

// Badge Component - Matching Payroll style
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// KpiCard Component - Matching Payroll style
const KpiCard = ({ title, value, icon, color, subtitle }) => {
  const colors = {
    blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
    purple: 'bg-purple-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500',
    rose: 'bg-rose-500', cyan: 'bg-cyan-500', orange: 'bg-orange-500',
    gray: 'bg-gray-500'
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color] || 'bg-gray-500'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const RegisterFace = () => {
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [searching, setSearching] = useState(false);
  // ✅ Real error state — replaces the old silent mock-employee fallback
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showDropdown, setShowDropdown] = useState(true); // Start with dropdown open
  // 'all' | 'unregistered' | 'registered' — lets an admin jump straight to
  // who still needs registration instead of scrolling the whole roster.
  const [statusFilter, setStatusFilter] = useState('unregistered');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [tab, setTab] = useState('upload');
  const [camStatus, setCamStatus] = useState('idle');
  const [capturedImages, setCapturedImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const REQUIRED_PHOTOS = 5;
  const activeImages = tab === 'webcam' ? capturedImages : uploadedImages;

  // Load ALL employees on mount
  const loadEmployees = useCallback(async () => {
    setSearching(true);
    setLoadError(null);
    try {
      console.log('🔍 Fetching employees...');
      const { data } = await axiosInstance.get('/employees?limit=200');
      console.log('📊 Employees response:', data);

      // Handle different response structures
      let list = [];
      if (data.data && Array.isArray(data.data)) {
        list = data.data;
      } else if (data.employees && Array.isArray(data.employees)) {
        list = data.employees;
      } else if (Array.isArray(data)) {
        list = data;
      }

      console.log('👥 Employees loaded:', list.length);
      setAllEmployees(list);
      setEmployees(list);
    } catch (err) {
      console.error('❌ Failed to load employees:', err);
      // ✅ Real failure — no fake employees. Registering a face against a
      // fabricated _id would either error deep in the flow or, worse,
      // silently write to the wrong record. Show a retryable error instead.
      setAllEmployees([]);
      setEmployees([]);
      setLoadError(
        err.response?.status === 401
          ? 'Your session has expired. Please refresh the page and log in again.'
          : 'Failed to load employee list. Please check your connection and try again.'
      );
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Filter locally as user types, plus the registered/unregistered toggle
  useEffect(() => {
    let list = allEmployees;

    if (statusFilter === 'unregistered') {
      list = list.filter(e => !e.hasFaceRegistered);
    } else if (statusFilter === 'registered') {
      list = list.filter(e => e.hasFaceRegistered);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
      );
    }

    setEmployees(list);
    setHighlightedIndex(-1);
  }, [search, allEmployees, statusFilter]);

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Camera helpers
  const startCamera = useCallback(async () => {
    setCamStatus('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamStatus('ready');
    } catch (err) {
      console.error('Camera error:', err);
      setCamStatus('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    if (capturedImages.length >= REQUIRED_PHOTOS) {
      alert(`Already captured ${REQUIRED_PHOTOS} photos! Click "Register Face" to submit.`);
      return;
    }

    const { videoWidth: w, videoHeight: h } = videoRef.current;
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    canvasRef.current.getContext('2d').drawImage(videoRef.current, 0, 0, w, h);

    const newImage = canvasRef.current.toDataURL('image/jpeg', 0.9);
    setCapturedImages(prev => [...prev, newImage]);
  }, [capturedImages.length]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const selectedFiles = imageFiles.slice(0, REQUIRED_PHOTOS);

    const readers = selectedFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(images => {
      setUploadedImages(images);
      setResult(null);
    });
  };

  useEffect(() => {
    if (tab === 'webcam') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [tab, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const switchTab = (newTab) => {
    if (newTab === tab) return;
    setTab(newTab);
    setCapturedImages([]);
    setUploadedImages([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
    if (newTab === 'webcam') {
      setCamStatus('idle');
    }
  };

  const resetAll = () => {
    setSelected(null);
    setSearch('');
    setCapturedImages([]);
    setUploadedImages([]);
    setResult(null);
    setCamStatus('idle');
    setTab('upload');
    setShowDropdown(true);
    if (fileRef.current) fileRef.current.value = '';
    stopCamera();
  };

  const clearImages = () => {
    setCapturedImages([]);
    setUploadedImages([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Handle employee selection
  const handleSelectEmployee = (employee) => {
    console.log('✅ Selected employee:', employee);
    setSelected(employee);
    setSearch('');
    setShowDropdown(false);
    setResult(null);
    // Clear images when changing employee
    setCapturedImages([]);
    setUploadedImages([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!selected || activeImages.length === 0) {
      alert('Please select an employee and capture/upload photos');
      return;
    }

    const imagesToSend = activeImages.slice(0, REQUIRED_PHOTOS);

    setSubmitting(true);
    setResult(null);

    try {
      const { data } = await axiosInstance.post('/attendance/ai/register-face', {
        employeeId: selected._id,
        images: imagesToSend,
      });

      if (data.success) {
        setResult({
          success: true,
          message: data.message || `Face registered for ${selected.name}`
        });
        setCapturedImages([]);
        setUploadedImages([]);
        if (fileRef.current) fileRef.current.value = '';
        setTab('upload');
      } else {
        setResult({
          success: false,
          message: data.message || 'Registration failed'
        });
      }
    } catch (err) {
      console.error('Registration error:', err);

      const status = err.response?.status;
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;

      if (status === 422) {
        setResult({
          success: false,
          message: 'No face detected in one or more photos. Please ensure:\n• Face is clearly visible\n• Good lighting\n• No glasses glare\n• Face is facing the camera'
        });
      } else if (status === 400) {
        if (errorMsg.includes('Maximum')) {
          setResult({
            success: false,
            message: `${errorMsg}\n\nPlease try again with fewer photos.`
          });
        } else {
          setResult({
            success: false,
            message: errorMsg || 'Invalid request. Please check the photos and try again.'
          });
        }
      } else if (status === 401) {
        setResult({
          success: false,
          message: 'Session expired. Please refresh the page and try again.'
        });
      } else if (status === 502 || status === 503) {
        setResult({
          success: false,
          message: 'AI service is temporarily unavailable. Please try again in a few minutes.'
        });
      } else {
        setResult({
          success: false,
          message: errorMsg || 'Registration failed. Please try again.'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!selected && activeImages.length >= 1 && !submitting;
  const remainingPhotos = REQUIRED_PHOTOS - activeImages.length;

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!selected) {
      setShowDropdown(!showDropdown);
      if (!showDropdown) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    }
  };

  // Keyboard navigation: arrow keys move through the list, Enter selects,
  // Escape closes — makes the dropdown usable without reaching for the mouse.
  const handleSearchKeyDown = (e) => {
    if (!showDropdown || employees.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, employees.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && employees[highlightedIndex]) {
        handleSelectEmployee(employees[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  if (searching && allEmployees.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  // ✅ Real error state instead of silently loading fake employees
  if (loadError && allEmployees.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-red-500 text-lg" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Couldn't Load Employees</h2>
          <p className="text-gray-500 text-sm mb-5">{loadError}</p>
          <button
            onClick={loadEmployees}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Matching Payroll Style */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaBrain className="text-indigo-600" /> Face Registration
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Register employee faces for AI-powered attendance tracking
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaShieldAlt className="w-5 h-5" />
              <span className="text-sm">ArcFace AI</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard 
            title="Photos Required" 
            value={REQUIRED_PHOTOS} 
            icon={<FaCamera className="w-6 h-6 text-white" />} 
            color="blue"
            subtitle="For optimal accuracy"
          />
          <KpiCard 
            title="Current Photos" 
            value={activeImages.length} 
            icon={<FaImages className="w-6 h-6 text-white" />} 
            color={activeImages.length >= REQUIRED_PHOTOS ? 'emerald' : 'yellow'}
            subtitle={`${REQUIRED_PHOTOS - activeImages.length} more needed`}
          />
          <KpiCard 
            title="Status" 
            value={selected ? 'Selected' : 'No Selection'} 
            icon={<FaUser className="w-6 h-6 text-white" />} 
            color={selected ? 'purple' : 'gray'}
            subtitle={selected ? selected.name : 'Select an employee'}
          />
          <KpiCard 
            title="AI Model" 
            value="ArcFace" 
            icon={<FaBrain className="w-6 h-6 text-white" />} 
            color="indigo"
            subtitle="Deep learning face recognition"
          />
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FaInfoCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-1">ArcFace AI - Best Practices</p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside leading-relaxed">
                <li>Capture {REQUIRED_PHOTOS} photos with slightly different angles and expressions</li>
                <li>Ensure good lighting and face is clearly visible</li>
                <li>Remove glasses if possible or ensure no glare</li>
                <li>The AI averages multiple photos for best recognition accuracy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 1: Select Employee */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">1</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Select Employee</h3>
                <p className="text-xs text-gray-400">Choose the employee to register</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {selected ? (
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center">
                    <FaUser className="text-indigo-700 text-xl" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-800">{selected.name}</p>
                    <p className="text-sm text-gray-500">{selected.employeeId} · {selected.department}</p>
                  </div>
                </div>
                <button 
                  onClick={resetAll} 
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <FaRedo className="text-xs" /> Change
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div 
                  className="relative cursor-pointer"
                  onClick={toggleDropdown}
                >
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by name, employee ID, or email..."
                    value={search}
                    onChange={e => { 
                      setSearch(e.target.value); 
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-11 pr-12 py-3.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-text"
                  />
                  <FaChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  {searching && (
                    <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm animate-spin" />
                  )}
                </div>

                {/* Status filter chips — jump straight to who still needs registration */}
                {showDropdown && !selected && allEmployees.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {[
                      { key: 'unregistered', label: 'Needs Registration', count: allEmployees.filter(e => !e.hasFaceRegistered).length },
                      { key: 'registered', label: 'Already Registered', count: allEmployees.filter(e => e.hasFaceRegistered).length },
                      { key: 'all', label: 'All', count: allEmployees.length },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          statusFilter === f.key
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && !selected && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-80 overflow-y-auto">
                    {searching ? (
                      <div className="p-6 text-center">
                        <FaSpinner className="animate-spin text-2xl text-indigo-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Loading employees...</p>
                      </div>
                    ) : employees.length > 0 ? (
                      employees.map((emp, idx) => (
                        <button
                          key={emp._id}
                          onClick={() => handleSelectEmployee(emp)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`w-full flex items-center gap-4 px-5 py-3.5 transition-colors text-left border-b border-gray-50 last:border-0 ${
                            highlightedIndex === idx ? 'bg-indigo-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {emp.profilePicture ? (
                              <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              <FaUser className="text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.employeeId} · {emp.department || 'No department'}</p>
                          </div>
                          <Badge variant={emp.hasFaceRegistered ? 'success' : 'default'}>
                            {emp.hasFaceRegistered ? 'Registered' : 'Not Registered'}
                          </Badge>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-sm text-gray-500">
                          {search
                            ? `No employees found matching "${search}"`
                            : statusFilter === 'unregistered'
                              ? 'Everyone in this view already has a registered face 🎉'
                              : 'No employees available'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Show employee count */}
            {!selected && !showDropdown && allEmployees.length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                {allEmployees.length} employees available. Click to search.
              </p>
            )}
            
            {/* Show employee count when dropdown is open */}
            {!selected && showDropdown && allEmployees.length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                Showing {employees.length} of {allEmployees.length} employees
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Capture Photos - Only show if employee is selected */}
        {selected && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">2</span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Capture Photos</h3>
                    <p className="text-xs text-gray-400">
                      {activeImages.length} of {REQUIRED_PHOTOS} photos captured
                    </p>
                  </div>
                </div>
                <Badge variant={activeImages.length >= REQUIRED_PHOTOS ? 'success' : 'warning'}>
                  {activeImages.length >= REQUIRED_PHOTOS ? 'Complete' : `${REQUIRED_PHOTOS - activeImages.length} remaining`}
                </Badge>
              </div>
            </div>
            <div className="p-6">
              {/* Tab Switcher */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-6">
                {[
                  ['upload', 'Upload Photos', FaUpload],
                  ['webcam', 'Webcam Capture', FaCamera]
                ].map(([key, label, Icon]) => (
                  <button 
                    key={key} 
                    onClick={() => switchTab(key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${tab === key ? 'bg-white shadow-md text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Icon className="text-sm" /> {label}
                  </button>
                ))}
              </div>

              {/* Upload Tab */}
              {tab === 'upload' && (
                <div className="space-y-4">
                  {uploadedImages.length > 0 && (
                    <>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {uploadedImages.map((img, idx) => (
                          <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square relative group">
                            <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                              <FaCheckCircle className="text-white text-xs" />
                            </div>
                          </div>
                        ))}
                        {Array(Math.max(0, REQUIRED_PHOTOS - uploadedImages.length)).fill().map((_, idx) => (
                          <div key={`placeholder-${idx}`} className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 aspect-square flex flex-col items-center justify-center">
                            <FaImages className="text-gray-300 text-2xl mb-1" />
                            <span className="text-xs text-gray-400">#{uploadedImages.length + idx + 1}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="flex-1 py-2.5 border-2 border-indigo-200 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <FaUpload className="inline mr-2 text-xs" /> Add More Photos
                        </button>
                        <button
                          onClick={clearImages}
                          className="flex-1 py-2.5 border-2 border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <FaRedo className="inline mr-2 text-xs" /> Clear All
                        </button>
                      </div>
                    </>
                  )}
                  
                  {uploadedImages.length === 0 && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-56 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-gray-400"
                    >
                      <FaUpload className="text-4xl" />
                      <span className="text-sm font-medium text-gray-600">Upload {REQUIRED_PHOTOS} photos of {selected.name}</span>
                      <span className="text-xs text-gray-400">Select multiple files (different angles preferred)</span>
                    </button>
                  )}
                  
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}

              {/* Webcam Tab */}
              {tab === 'webcam' && (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      playsInline muted autoPlay
                      className={`w-full h-full object-cover ${camStatus === 'ready' ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {camStatus === 'ready' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-56 h-72 border-2 border-white/40 rounded-full" />
                      </div>
                    )}
                    {camStatus !== 'ready' && camStatus !== 'loading' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm">
                        {camStatus === 'idle' && (
                          <>
                            <FaCamera className="text-4xl text-gray-500 mb-3" />
                            <p className="text-gray-400">Click "Capture Photo" to start camera</p>
                          </>
                        )}
                        {camStatus === 'loading' && (
                          <>
                            <FaSpinner className="animate-spin text-4xl text-indigo-400 mb-3" />
                            <p className="text-gray-400">Starting camera...</p>
                          </>
                        )}
                        {camStatus === 'error' && (
                          <>
                            <FaTimesCircle className="text-4xl text-red-400 mb-3" />
                            <p className="text-gray-400">Camera unavailable — use Upload instead</p>
                          </>
                        )}
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* Captured Photos Preview */}
                  {capturedImages.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {capturedImages.map((img, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border-2 border-emerald-400 bg-gray-50 aspect-square relative">
                          <img src={img} alt={`Capture ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{idx + 1}</span>
                          </div>
                        </div>
                      ))}
                      {Array(REQUIRED_PHOTOS - capturedImages.length).fill().map((_, idx) => (
                        <div key={`empty-${idx}`} className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 aspect-square flex items-center justify-center">
                          <span className="text-xs text-gray-400">{capturedImages.length + idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={capturePhoto}
                      disabled={camStatus !== 'ready' || capturedImages.length >= REQUIRED_PHOTOS}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FaCamera className="text-sm" /> 
                      Capture Photo ({capturedImages.length}/{REQUIRED_PHOTOS})
                    </button>
                    
                    {capturedImages.length > 0 && (
                      <button
                        onClick={clearImages}
                        className="px-5 py-3 border-2 border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FaRedo className="inline mr-1" /> Clear
                      </button>
                    )}
                  </div>

                  {capturedImages.length === REQUIRED_PHOTOS && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-sm text-emerald-700 font-medium flex items-center justify-center gap-2">
                        <FaCheckCircle className="text-emerald-500" /> All {REQUIRED_PHOTOS} photos captured! Ready to register.
                      </p>
                    </div>
                  )}
                  
                  {capturedImages.length > 0 && capturedImages.length < REQUIRED_PHOTOS && (
                    <p className="text-center text-sm text-amber-600">
                      ⚠ {REQUIRED_PHOTOS - capturedImages.length} more photo(s) needed
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Register - Only show if employee is selected */}
        {selected && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">3</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Register with ArcFace AI</h3>
                  <p className="text-xs text-gray-400">Submit photos for AI processing</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {result && (
                <div className={`rounded-xl p-4 flex items-start gap-3 border ${
                  result.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}>
                  {result.success
                    ? <FaCheckCircle className="text-emerald-500 text-lg mt-0.5 flex-shrink-0" />
                    : <FaTimesCircle className="text-red-500 text-lg mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className={`text-sm font-medium whitespace-pre-line ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>
                      {result.message}
                    </p>
                    {result.success && (
                      <p className="text-xs text-emerald-600 mt-1">
                        {selected.name} can now use AI Check In / Check Out with ArcFace recognition.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all
                  ${canSubmit
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin text-base" /> 
                    Processing {activeImages.length} photos with ArcFace AI...
                  </>
                ) : (
                  <>
                    <FaBrain className="text-base" /> Register Face with ArcFace AI
                  </>
                )}
              </button>

              {activeImages.length > 0 && activeImages.length < REQUIRED_PHOTOS && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-center text-sm text-amber-700">
                    ⚠ {REQUIRED_PHOTOS - activeImages.length} more photo(s) recommended for best accuracy
                  </p>
                </div>
              )}

              {activeImages.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-center text-sm text-red-700">
                    ⚠ Please capture or upload at least 1 photo
                  </p>
                </div>
              )}

              {result?.success && (
                <button
                  onClick={resetAll}
                  className="w-full py-3 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <FaUserPlus className="inline mr-2" /> Register Another Employee
                </button>
              )}
            </div>
          </div>
        )}

        {/* Help Section - Matching Payroll style */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaShieldAlt className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-1">Need Help with Face Registration?</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              For face registration assistance, AI model issues, or technical support, contact IT support at <span className="text-indigo-600 font-medium">it-support@company.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterFace;
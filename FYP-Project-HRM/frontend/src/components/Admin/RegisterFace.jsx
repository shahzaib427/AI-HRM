import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import {
  FaBrain, FaCamera, FaDownload, FaSpinner, FaCheckCircle,
  FaTimesCircle, FaUser, FaSearch, FaImages, FaRedo, FaInfoCircle
} from 'react-icons/fa';

const RegisterFace = () => {
  const [search, setSearch]             = useState('');
  const [employees, setEmployees]       = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [selected, setSelected]         = useState(null);

  const [tab, setTab]                   = useState('upload');
  const [camStatus, setCamStatus]       = useState('idle');
  const [capturedImages, setCapturedImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);

  const [submitting, setSubmitting]     = useState(false);
  const [result, setResult]             = useState(null);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef   = useRef(null);

  const REQUIRED_PHOTOS = 5;
  const activeImages = tab === 'webcam' ? capturedImages : uploadedImages;

  // Load ALL employees on mount
  useEffect(() => {
    const loadEmployees = async () => {
      setSearching(true);
      try {
        const { data } = await axiosInstance.get('/employees?limit=200');
        const list = data.data || data.employees || [];
        setAllEmployees(list);
        setEmployees(list);
      } catch (err) {
        console.error('Failed to load employees:', err);
      } finally {
        setSearching(false);
      }
    };
    loadEmployees();
  }, []);

  // Filter locally as user types
  useEffect(() => {
    if (!search.trim()) {
      setEmployees(allEmployees);
      return;
    }
    const q = search.toLowerCase();
    setEmployees(
      allEmployees.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
      )
    );
  }, [search, allEmployees]);

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
      alert(`Already captured ${REQUIRED_PHOTOS} photos! Click "Submit" to register.`);
      return;
    }
    
    const { videoWidth: w, videoHeight: h } = videoRef.current;
    canvasRef.current.width  = w;
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
  }, [tab]);

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
    if (fileRef.current) fileRef.current.value = '';
    stopCamera();
  };

  const clearImages = () => {
    setCapturedImages([]);
    setUploadedImages([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

const handleSubmit = async () => {
  if (!selected || activeImages.length === 0) {
    alert('Please select an employee and capture/upload photos');
    return;
  }
  
  const imagesToSend = activeImages.slice(0, REQUIRED_PHOTOS);
  
  console.log('📸 Submitting registration:');
  console.log('   Employee:', selected.name);
  console.log('   Images to send:', imagesToSend.length);
  
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
    
    // Handle different error types with user-friendly messages
    if (status === 422) {
      setResult({
        success: false,
        message: '❌ No face detected in one or more photos.\n\nPlease ensure:\n• Face is clearly visible\n• Good lighting\n• No glasses glare\n• Face is facing the camera'
      });
    } else if (status === 400) {
      if (errorMsg.includes('Maximum')) {
        setResult({
          success: false,
          message: `⚠️ ${errorMsg}\n\nPlease try again with fewer photos.`
        });
      } else {
        setResult({
          success: false,
          message: errorMsg || 'Invalid request. Please check the photos and try again.'
        });
      }
    } else if (status === 401) {
      // This shouldn't happen now, but just in case
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
  const showDropdown = !selected && employees.length > 0;
  const remainingPhotos = REQUIRED_PHOTOS - capturedImages.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaBrain className="text-indigo-600" /> Register Employee Face
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Capture {REQUIRED_PHOTOS} photos for robust face recognition (ArcFace AI)
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <div className="flex items-start gap-2">
            <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-1">ArcFace AI - Best Practices</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Capture {REQUIRED_PHOTOS} photos with slightly different angles/expressions</li>
                <li>Ensure good lighting and face is clearly visible</li>
                <li>Remove glasses if possible or ensure no glare</li>
                <li>The AI averages multiple photos for best accuracy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 1: Select employee */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            Select Employee
          </p>

          {selected ? (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-200 rounded-full flex items-center justify-center">
                  <FaUser className="text-indigo-700 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.employeeId} · {selected.department}</p>
                </div>
              </div>
              <button onClick={resetAll} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search by name or employee ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {searching && (
                <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs animate-spin" />
              )}

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden max-h-60 overflow-y-auto">
                  {employees.map(emp => (
                    <button
                      key={emp._id}
                      onClick={() => { setSelected(emp); setSearch(''); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FaUser className="text-gray-400 text-xs" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.employeeId} · {emp.department}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Capture face */}
        {selected && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Capture Photos of <span className="text-indigo-700 ml-1">{selected.name}</span>
              <span className="text-xs text-gray-500 ml-auto">
                ({activeImages.length}/{REQUIRED_PHOTOS})
              </span>
            </p>

            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4">
              {[
                ['upload', 'Upload Photos', FaDownload], 
                ['webcam', 'Webcam Capture', FaCamera]
              ].map(([key, label, Ico]) => (
                <button 
                  key={key} 
                  onClick={() => switchTab(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all
                    ${tab === key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Ico className="text-xs" />{label}
                </button>
              ))}
            </div>

            {/* Upload tab */}
            {tab === 'upload' && (
              <div className="space-y-3">
                {uploadedImages.length > 0 && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                          <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {Array(Math.max(0, REQUIRED_PHOTOS - uploadedImages.length)).fill().map((_, idx) => (
                        <div key={`placeholder-${idx}`} className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 aspect-square flex items-center justify-center">
                          <FaImages className="text-gray-300 text-2xl" />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex-1 py-2 border border-indigo-200 rounded-xl text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        Add More Photos
                      </button>
                      <button
                        onClick={clearImages}
                        className="flex-1 py-2 border border-red-200 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Clear All
                      </button>
                    </div>
                  </>
                )}
                
                {uploadedImages.length === 0 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-gray-400"
                  >
                    <FaDownload className="text-2xl" />
                    <span className="text-xs font-medium">Upload {REQUIRED_PHOTOS} photos of {selected.name}</span>
                    <span className="text-xs">Select multiple files (different angles preferred)</span>
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

            {/* Webcam tab - MANUAL CAPTURE */}
            {tab === 'webcam' && (
              <div className="space-y-3">
                <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                  <video
                    ref={videoRef}
                    playsInline muted autoPlay
                    className={`w-full h-full object-cover ${camStatus === 'ready' ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {camStatus !== 'ready' && camStatus !== 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs opacity-70">
                      {camStatus === 'loading' ? 'Starting camera…'
                        : camStatus === 'error' ? 'Camera unavailable — use Upload instead' : ''}
                    </div>
                  )}
                  {camStatus === 'ready' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-52 border-2 border-white/60 rounded-full" />
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Position face inside oval and click capture
                </p>

                {/* Show captured photos preview */}
                {capturedImages.length > 0 && (
                  <div className="grid grid-cols-5 gap-1">
                    {capturedImages.map((img, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                        <img src={img} alt={`Capture ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {Array(REQUIRED_PHOTOS - capturedImages.length).fill().map((_, idx) => (
                      <div key={`empty-${idx}`} className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 aspect-square flex items-center justify-center">
                        <span className="text-xs text-gray-400">{capturedImages.length + idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={capturePhoto}
                    disabled={camStatus !== 'ready' || capturedImages.length >= REQUIRED_PHOTOS}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <FaCamera className="text-xs" /> 
                    Capture Photo ({capturedImages.length}/{REQUIRED_PHOTOS})
                  </button>
                  
                  {capturedImages.length > 0 && (
                    <button
                      onClick={clearImages}
                      className="px-4 py-2.5 border border-red-200 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <FaRedo /> Clear
                    </button>
                  )}
                </div>

                {capturedImages.length === REQUIRED_PHOTOS && (
                  <p className="text-center text-xs text-green-600 font-medium">
                    ✅ All {REQUIRED_PHOTOS} photos captured! Click "Register Face" below.
                  </p>
                )}
                
                {capturedImages.length > 0 && capturedImages.length < REQUIRED_PHOTOS && (
                  <p className="text-center text-xs text-amber-600">
                    ⚠ {REQUIRED_PHOTOS - capturedImages.length} more photo(s) needed
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Submit */}
        {selected && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              Register Face with ArcFace AI
            </p>

            {result && (
              <div className={`rounded-xl p-4 flex items-start gap-3 ${result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                {result.success
                  ? <FaCheckCircle className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                  : <FaTimesCircle className="text-red-500 text-sm mt-0.5 flex-shrink-0" />}
                <div>
                  <p className={`text-sm font-medium ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>
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
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all
                ${canSubmit
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {submitting
                ? <><FaSpinner className="animate-spin text-xs" /> Processing {activeImages.length} photos with ArcFace…</>
                : <><FaBrain className="text-xs" /> Register Face with ArcFace AI</>}
            </button>

            {activeImages.length > 0 && activeImages.length < REQUIRED_PHOTOS && (
              <p className="text-center text-xs text-amber-600">
                ⚠ {REQUIRED_PHOTOS - activeImages.length} more photo(s) recommended for best accuracy
              </p>
            )}

            {activeImages.length === 0 && (
              <p className="text-center text-xs text-red-500">
                ⚠ Please capture or upload at least 1 photo
              </p>
            )}

            {result?.success && (
              <button
                onClick={resetAll}
                className="w-full py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Register Another Employee
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterFace;
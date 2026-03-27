import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Change this line to include /api
const API_BASE_URL = 'http://localhost:5001/api';

const LearningHub = () => {
  const [learningProfile, setLearningProfile] = useState({
    level: 'Intermediate',
    preferredFormat: 'Video',
    weeklyHours: 5,
    currentSkills: [],
    targetSkills: []
  });

  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [learningPlan, setLearningPlan] = useState([]);
  const [dailyRecommendation, setDailyRecommendation] = useState(null);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [loading, setLoading] = useState({
    courses: false,
    path: false,
    daily: false,
    detection: false
  });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('courses');
  const [newSkill, setNewSkill] = useState('');
  
  // Auto-detection states
  const [detectionMode, setDetectionMode] = useState('manual'); // 'manual' or 'auto'
  const [jobRole, setJobRole] = useState('');
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({ name: '', description: '', technologies: '' });
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [detectedSkills, setDetectedSkills] = useState([]);
  const [skillSources, setSkillSources] = useState({});
  const [showSkillConfidence, setShowSkillConfidence] = useState(false);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAvailableSkills();
    fetchJobRoles();
  }, []);

  // Fetch when target skills change (only in manual mode)
  useEffect(() => {
    if (detectionMode === 'manual' && learningProfile.targetSkills.length > 0) {
      fetchRecommendations();
      fetchLearningPath();
      fetchDailyTask();
    }
  }, [learningProfile.targetSkills, detectionMode]);

  const fetchAvailableSkills = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/skills`);
      setAvailableSkills(response.data.all_skills || response.data);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    }
  };

  const fetchJobRoles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/job-roles`);
      setJobRoles(response.data.job_roles);
    } catch (err) {
      console.error('Failed to fetch job roles:', err);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setResumeFile(file);
      // Add detected skills to temporary list
      const newDetectedSkills = response.data.detected_skills.map(skill => ({
        name: skill,
        confidence: response.data.confidence_scores[skill] || 70,
        source: 'resume'
      }));
      
      setDetectedSkills(prev => {
        const combined = [...prev, ...newDetectedSkills];
        // Remove duplicates
        const unique = Array.from(new Map(combined.map(item => [item.name, item])).values());
        return unique;
      });
      
      setSkillSources(prev => ({ ...prev, resume: true }));
      
    } catch (err) {
      console.error('Failed to upload resume:', err);
      setError('Failed to process resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const addProject = () => {
    if (!newProject.name.trim()) return;
    
    const projectToAdd = {
      ...newProject,
      technologies: newProject.technologies.split(',').map(t => t.trim()).filter(t => t)
    };
    
    setProjects([...projects, projectToAdd]);
    setNewProject({ name: '', description: '', technologies: '' });
  };

  const removeProject = (index) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const detectSkills = async () => {
    setLoading(prev => ({ ...prev, detection: true }));
    setError(null);

    try {
      const payload = {
        job_role: jobRole || undefined,
        projects: projects.map(p => ({
          name: p.name,
          description: p.description,
          technologies: p.technologies
        }))
      };

      // If resume was uploaded, we already have those skills
      const response = await axios.post(`${API_BASE_URL}/detect-skills`, payload);
      
      const detectedFromAPI = response.data.detected_skills;
      
      // Combine with resume-detected skills
      setDetectedSkills(prev => {
        const combined = [...prev, ...detectedFromAPI];
        // Remove duplicates, keep highest confidence
        const skillMap = new Map();
        combined.forEach(skill => {
          if (!skillMap.has(skill.name) || skillMap.get(skill.name).confidence < skill.confidence) {
            skillMap.set(skill.name, skill);
          }
        });
        return Array.from(skillMap.values());
      });
      
      setSkillSources(response.data.sources_used);
      
    } catch (err) {
      setError('Failed to detect skills');
      console.error('Skill detection error:', err);
    } finally {
      setLoading(prev => ({ ...prev, detection: false }));
    }
  };

  const applyDetectedSkills = () => {
    const skillNames = detectedSkills.map(s => s.name);
    setLearningProfile(prev => ({
      ...prev,
      currentSkills: skillNames.slice(0, 5), // Top 5 as current skills
      targetSkills: skillNames.slice(5, 10) // Next 5 as target skills
    }));
    
    // Fetch recommendations with these skills
    setTimeout(() => {
      fetchRecommendationsWithSkills(skillNames);
    }, 100);
  };

  const fetchRecommendationsWithSkills = async (skills) => {
    setLoading(prev => ({ ...prev, courses: true }));
    
    try {
      const response = await axios.post(`${API_BASE_URL}/recommend`, {
        use_auto_detection: false,
        skills: skills
      });
      
      setRecommendedCourses(response.data.recommendations || response.data);
    } catch (err) {
      setError('Failed to fetch course recommendations');
      console.error('API Error:', err);
    } finally {
      setLoading(prev => ({ ...prev, courses: false }));
    }
  };

  const fetchRecommendations = async () => {
    setLoading(prev => ({ ...prev, courses: true }));
    setError(null);
    
    try {
      let payload;
      
      if (detectionMode === 'auto' && detectedSkills.length > 0) {
        // Use auto-detected skills
        payload = {
          use_auto_detection: true,
          job_role: jobRole || undefined,
          projects: projects.map(p => ({
            name: p.name,
            description: p.description,
            technologies: p.technologies
          }))
        };
      } else {
        // Use manual skills
        const allSkills = [...learningProfile.currentSkills, ...learningProfile.targetSkills];
        payload = {
          use_auto_detection: false,
          skills: allSkills
        };
      }
      
      const response = await axios.post(`${API_BASE_URL}/recommend`, payload);
      
      // Handle both old and new response formats
      const courses = response.data.recommendations || response.data;
      setRecommendedCourses(courses);
      
      // If we have skill gap analysis, show it
      if (response.data.skill_gap_analysis) {
        console.log('Skill gaps:', response.data.skill_gap_analysis);
      }
      
    } catch (err) {
      setError('Failed to fetch course recommendations');
      console.error('API Error:', err);
    } finally {
      setLoading(prev => ({ ...prev, courses: false }));
    }
  };

  const fetchLearningPath = async () => {
    setLoading(prev => ({ ...prev, path: true }));
    
    try {
      const skills = detectionMode === 'auto' && detectedSkills.length > 0
        ? detectedSkills.map(s => s.name)
        : learningProfile.targetSkills;
        
      const response = await axios.post(`${API_BASE_URL}/learning-path`, {
        targetSkills: skills
      });
      
      setLearningPlan(response.data.learning_path || response.data);
    } catch (err) {
      console.error('Failed to fetch learning path:', err);
    } finally {
      setLoading(prev => ({ ...prev, path: false }));
    }
  };

  const fetchDailyTask = async () => {
    setLoading(prev => ({ ...prev, daily: true }));
    
    try {
      const skills = detectionMode === 'auto' && detectedSkills.length > 0
        ? detectedSkills.map(s => s.name)
        : learningProfile.targetSkills;
        
      const response = await axios.post(`${API_BASE_URL}/daily-task`, {
        skills: skills
      });
      
      setDailyRecommendation(response.data);
    } catch (err) {
      console.error('Failed to fetch daily task:', err);
    } finally {
      setLoading(prev => ({ ...prev, daily: false }));
    }
  };

  const addTargetSkill = (skill) => {
    if (!skill.trim() || learningProfile.targetSkills.includes(skill)) return;
    
    setLearningProfile(prev => ({
      ...prev,
      targetSkills: [...prev.targetSkills, skill]
    }));
    setNewSkill('');
  };

  const removeTargetSkill = (skillToRemove) => {
    setLearningProfile(prev => ({
      ...prev,
      targetSkills: prev.targetSkills.filter(skill => skill !== skillToRemove)
    }));
  };

  const removeDetectedSkill = (skillToRemove) => {
    setDetectedSkills(prev => prev.filter(s => s.name !== skillToRemove));
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-blue-600 bg-blue-100';
    if (confidence >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  // Course Card Component
  const CourseCard = ({ course }) => (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:scale-[1.02] shadow-sm">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{course.title}</h3>
            <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                {course.platform || 'Online Course'}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                {course.level || 'All Levels'}
              </span>
              {course.category && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                  {course.category}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <span className="text-yellow-500">⭐</span>
              <span className="font-bold text-gray-900">{course.rating || '4.5'}</span>
            </div>
            {course.relevance && (
              <div className={`text-xs font-medium ${
                course.relevance >= 90 ? 'text-green-600' :
                course.relevance >= 80 ? 'text-blue-600' : 'text-amber-600'
              }`}>
                {course.relevance}% Match
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {course.skills}
          </p>
          
          <div className="flex justify-between text-sm text-gray-500">
            <span>{course.duration || 'Self-paced'}</span>
            {course.students && (
              <span>{typeof course.students === 'number' ? course.students.toLocaleString() : course.students} students</span>
            )}
          </div>
          
          {course.progress > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">{course.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2 pt-2">
            <button className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg transition-all duration-200 text-sm font-medium">
              {course.progress > 0 ? 'Continue' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Learning Plan Week Component
  const LearningWeek = ({ week }) => (
    <div className="p-4 rounded-xl border border-gray-200 hover:border-green-300 transition-colors bg-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-bold text-gray-900">Week {week.week}</h4>
          <p className="text-sm text-gray-600">{week.focus}</p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          {week.hours} hrs
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-2">📚</span>
          <span>{week.resources} resources</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-2">🎯</span>
          <span>Priority: {week.priority}</span>
        </div>
        {week.skills_covered && (
          <div className="flex flex-wrap gap-1 mt-2">
            {week.skills_covered.map(skill => (
              <span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading.courses && recommendedCourses.length === 0 && detectionMode === 'manual') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finding the best courses for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 bg-gradient-to-br from-green-50 via-white to-emerald-50/30">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-green-200/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-emerald-200/20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                AI Learning Hub
              </h1>
              <p className="mt-2 text-gray-600">
                {detectionMode === 'auto' 
                  ? 'Smart skill detection from your profile' 
                  : 'Personalized learning recommendations powered by AI'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg">
                <span className="font-bold">{learningProfile.weeklyHours} hrs/week</span>
              </div>
              
              {/* Mode Toggle */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setDetectionMode('manual')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    detectionMode === 'manual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setDetectionMode('auto')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    detectionMode === 'auto'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Auto Detect
                </button>
              </div>
              
              <button 
                onClick={fetchRecommendations}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p>{error}</p>
            <button 
              onClick={fetchRecommendations}
              className="mt-2 text-sm font-medium text-red-800 hover:text-red-900"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Auto-Detection Panel */}
        {detectionMode === 'auto' && (
          <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">🎯 Auto Skill Detection</h2>
              <p className="text-green-100 text-sm">Upload your resume, add projects, or enter your job role</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Job Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Role
                  </label>
                  <input
                    type="text"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="e.g., Senior Full Stack Developer"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    list="job-roles-list"
                  />
                  <datalist id="job-roles-list">
                    {jobRoles.map(role => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                </div>

                {/* Resume Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume (PDF)
                  </label>
                  <div className="flex items-center space-x-2">
                    <label className={`flex-1 px-4 py-2 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                      resumeFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-500'
                    }`}>
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-600">
                        {uploadingResume ? 'Uploading...' : resumeFile ? resumeFile.name : 'Choose file'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Project
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newProject.name}
                      onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                      placeholder="Project name"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      value={newProject.technologies}
                      onChange={(e) => setNewProject({...newProject, technologies: e.target.value})}
                      placeholder="Technologies (comma-separated)"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded"
                    />
                    <button
                      onClick={addProject}
                      className="w-full px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Add Project
                    </button>
                  </div>
                </div>
              </div>

              {/* Projects List */}
              {projects.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Added Projects:</h4>
                  <div className="flex flex-wrap gap-2">
                    {projects.map((project, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
                        {project.name}
                        <button onClick={() => removeProject(index)} className="ml-2 text-blue-600 hover:text-blue-800">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detect Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={detectSkills}
                  disabled={loading.detection}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium flex items-center space-x-2"
                >
                  {loading.detection ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Detect Skills</span>
                    </>
                  )}
                </button>
              </div>

              {/* Detected Skills */}
              {detectedSkills.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Detected Skills ({detectedSkills.length})
                    </h3>
                    <button
                      onClick={() => setShowSkillConfidence(!showSkillConfidence)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showSkillConfidence ? 'Hide confidence' : 'Show confidence'}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {detectedSkills.map(skill => (
                      <div key={skill.name} className="relative group">
                        <span className={`px-3 py-1 rounded-full text-sm flex items-center ${
                          showSkillConfidence ? getConfidenceColor(skill.confidence) : 'bg-purple-100 text-purple-800'
                        }`}>
                          {skill.name}
                          {showSkillConfidence && (
                            <span className="ml-1 text-xs font-bold">
                              {skill.confidence}%
                            </span>
                          )}
                          <button 
                            onClick={() => removeDetectedSkill(skill.name)}
                            className="ml-2 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                        {skill.source && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block">
                            <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                              Source: {skill.source}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sources Used */}
                  {Object.keys(skillSources).length > 0 && (
                    <div className="text-xs text-gray-500 mb-4">
                      Sources: {Object.entries(skillSources)
                        .filter(([_, used]) => used)
                        .map(([source]) => source)
                        .join(', ')}
                    </div>
                  )}

                  <button
                    onClick={applyDetectedSkills}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Apply These Skills & Get Recommendations
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Daily Recommendation */}
        {dailyRecommendation && (
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <span className="font-bold text-lg">Today's Learning Task</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">{dailyRecommendation.topic}</h2>
                <div className="flex items-center space-x-4 text-blue-100 flex-wrap gap-2">
                  <span className="flex items-center">
                    <span className="mr-1">⏱️</span>
                    {dailyRecommendation.duration}
                  </span>
                  <span className="flex items-center">
                    <span className="mr-1">📖</span>
                    {dailyRecommendation.format}
                  </span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    dailyRecommendation.priority === 'High' ? 'bg-red-500/30' : 'bg-yellow-500/30'
                  }`}>
                    {dailyRecommendation.priority} Priority
                  </span>
                  {dailyRecommendation.category && (
                    <span className="px-2 py-1 bg-purple-500/30 rounded text-sm">
                      {dailyRecommendation.category}
                    </span>
                  )}
                </div>
              </div>
              <button className="mt-4 md:mt-0 px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-colors">
                Start Learning
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {['courses', 'path', 'skills'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab === 'courses' ? '📚 Courses' : tab === 'path' ? '🗺️ Learning Path' : '🎯 Skills'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'courses' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Recommended Courses</h3>
                      <span className="text-sm text-gray-500">
                        {detectionMode === 'auto' ? 'Based on detected skills' : 'Based on your skills'}
                      </span>
                    </div>
                    
                    {loading.courses ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : recommendedCourses.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {recommendedCourses.map((course, index) => (
                          <CourseCard key={course.id || index} course={course} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No recommendations yet. Add some skills or use auto-detection!</p>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'path' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900">4-Week Learning Plan</h3>
                    {loading.path ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : learningPlan.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {learningPlan.map(week => (
                          <LearningWeek key={week.week} week={week} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No learning path yet. Add target skills first!</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'skills' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900">Your Skills</h3>
                    
                    {detectionMode === 'auto' && detectedSkills.length > 0 ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Detected Skills (with confidence)
                          </label>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {detectedSkills.map(skill => (
                              <span key={skill.name} className={`px-3 py-1 rounded-full text-sm flex items-center ${getConfidenceColor(skill.confidence)}`}>
                                {skill.name}
                                <span className="ml-1 text-xs font-bold">
                                  {skill.confidence}%
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Skills (Top 5)
                          </label>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {detectedSkills.slice(0, 5).map(skill => (
                              <span key={skill.name} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {skill.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Skills (Next 5)
                          </label>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {detectedSkills.slice(5, 10).map(skill => (
                              <span key={skill.name} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                {skill.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Skills
                          </label>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {learningProfile.currentSkills.map(skill => (
                              <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Skills
                          </label>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {learningProfile.targetSkills.map(skill => (
                              <span key={skill} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
                                {skill}
                                <button 
                                  onClick={() => removeTargetSkill(skill)}
                                  className="ml-2 text-green-600 hover:text-green-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="Add a target skill..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            list="skills-list"
                          />
                          <datalist id="skills-list">
                            {availableSkills.map(skill => (
                              <option key={skill} value={skill} />
                            ))}
                          </datalist>
                          <button
                            onClick={() => addTargetSkill(newSkill)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Skill Progress */}
            {(learningProfile.targetSkills.length > 0 || detectedSkills.length > 0) && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">
                  {detectionMode === 'auto' ? 'Detected Skills Progress' : 'Target Skills Progress'}
                </h3>
                
                <div className="space-y-4">
                  {(detectionMode === 'auto' ? detectedSkills.slice(0, 5) : learningProfile.targetSkills).map((item, index) => {
                    const skillName = typeof item === 'string' ? item : item.name;
                    const confidence = typeof item === 'object' ? item.confidence : Math.floor(Math.random() * 30 + 20);
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">{skillName}</span>
                          <span className="text-sm text-gray-600">
                            {confidence}% Complete
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Learning Stats */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-6">Learning Statistics</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">18</div>
                    <div className="text-sm text-blue-800">Hours This Month</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="text-2xl font-bold text-green-600">3</div>
                    <div className="text-sm text-green-800">Courses Completed</div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-purple-900">Learning Streak</span>
                    <span className="font-bold text-purple-600">7 days 🔥</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div className="w-7/12 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  </div>
                </div>

                {detectionMode === 'auto' && (
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-900">Skills Detected</span>
                      <span className="font-bold text-green-600">{detectedSkills.length}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      From {Object.values(skillSources).filter(Boolean).length} sources
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Resources */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Quick Resources</h3>
              <div className="space-y-3">
                <a href="#" className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <span className="text-blue-600">📖</span>
                  <div>
                    <p className="font-medium text-gray-900">Documentation</p>
                    <p className="text-xs text-gray-500">Official docs & tutorials</p>
                  </div>
                </a>
                <a href="#" className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <span className="text-green-600">🎥</span>
                  <div>
                    <p className="font-medium text-gray-900">Video Courses</p>
                    <p className="text-xs text-gray-500">Hands-on video learning</p>
                  </div>
                </a>
                <a href="#" className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <span className="text-purple-600">💻</span>
                  <div>
                    <p className="font-medium text-gray-900">Practice Labs</p>
                    <p className="text-xs text-gray-500">Interactive exercises</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Learning Tips */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">💡 Learning Tips</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500">•</span>
                  <span>Practice coding daily for 30 minutes</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500">•</span>
                  <span>Join study groups for better retention</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500">•</span>
                  <span>Build projects to apply your skills</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500">•</span>
                  <span>Review and revise weekly</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningHub;
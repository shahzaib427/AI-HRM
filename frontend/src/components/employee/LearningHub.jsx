import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5001/api' });

// ─── tiny helpers ────────────────────────────────────────────────────────────
const getUserId = () =>
  localStorage.getItem('userId') || localStorage.getItem('user_id') || 'user_default';

const LEVEL_COLORS = {
  Beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-100 text-amber-700 border-amberald-200',
  Advanced: 'bg-rose-100 text-rose-700 border-rose-200',
};

const DOMAIN_COLORS = {
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

const Spinner = ({ size = 8, color = 'indigo' }) => (
  <div
    className={`w-${size} h-${size} rounded-full border-4 border-${color}-200 border-t-${color}-600 animate-spin`}
  />
);

const Toast = ({ msg, type }) => (
  <div
    className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all
      ${type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}
  >
    {msg}
  </div>
);

// ─── Course Card ─────────────────────────────────────────────────────────────
const CourseCard = ({ course, onEnroll }) => {
  const lvlClass = LEVEL_COLORS[course.level] || 'bg-gray-100 text-gray-600';
  const relevance = course.relevance || 0;
  const barColor =
    relevance >= 85 ? 'from-emerald-400 to-teal-400' :
    relevance >= 70 ? 'from-blue-400 to-indigo-400' :
                      'from-amber-400 to-orange-400';

  return (
    <div className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-[15px] leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">{course.platform}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-amber-400 text-sm">★</span>
            <span className="font-bold text-slate-700 text-sm">{course.rating}</span>
          </div>
          {relevance > 0 && (
            <div className={`text-xs font-bold mt-0.5 ${relevance >= 85 ? 'text-emerald-600' : relevance >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
              {relevance}% match
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{course.description}</p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${lvlClass}`}>
          {course.level}
        </span>
        {course.category && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {course.category}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-100">
          ⏱ {course.duration}
        </span>
      </div>

      {/* Skills */}
      {course.skills && course.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {course.skills.slice(0, 4).map(sk => (
            <span key={sk} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-500 border border-slate-100">
              {sk}
            </span>
          ))}
          {course.skills.length > 4 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">+{course.skills.length - 4}</span>
          )}
        </div>
      )}

      {/* Relevance bar */}
      {relevance > 0 && (
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>AI Relevance</span>
            <span>{relevance}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`bg-gradient-to-r ${barColor} h-1.5 rounded-full transition-all duration-700`}
              style={{ width: `${relevance}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {course.students && (
          <span className="text-[11px] text-slate-400">
            {Number(course.students).toLocaleString()} students
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          {course.url && (
            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              Preview
            </a>
          )}
          <button
            onClick={() => onEnroll(course)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Enroll →
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Learning Path Week Card ─────────────────────────────────────────────────
const WeekCard = ({ week, index }) => {
  const phaseColors = [
    'border-l-violet-400 bg-violet-50/40',
    'border-l-blue-400 bg-blue-50/40',
    'border-l-emerald-400 bg-emerald-50/40',
    'border-l-amber-400 bg-amber-50/40',
  ];
  const badgeColors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
  ];
  const colorClass = phaseColors[index % 4];
  const badgeClass = badgeColors[index % 4];

  return (
    <div className={`border-l-4 rounded-xl p-5 ${colorClass} transition-all hover:shadow-md`}>
      {/* Week header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{week.icon}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
              Week {week.week}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${week.priority === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              {week.priority}
            </span>
          </div>
          <h4 className="font-bold text-slate-800 mt-1.5">{week.phase}</h4>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{week.focus}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-700">{week.hours}h</div>
          <div className="text-[10px] text-slate-400">per week</div>
        </div>
      </div>

      {/* Activities */}
      <div className="mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Activities</p>
        <div className="grid grid-cols-2 gap-1">
          {(week.activities || []).map((act, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              {act}
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      {week.skills_covered && week.skills_covered.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Skills Focus</p>
          <div className="flex flex-wrap gap-1">
            {week.skills_covered.map(sk => (
              <span key={sk} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                {sk}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Milestone */}
      <div className="bg-white/70 rounded-lg p-3 border border-white">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">🎯 Milestone</p>
        <p className="text-xs text-slate-700 font-medium leading-relaxed">{week.milestone}</p>
      </div>

      {/* Assessment */}
      <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
        <span>📋</span>
        <span><span className="font-semibold">Assessment:</span> {week.assessment}</span>
      </div>
    </div>
  );
};

// ─── Resource Card ────────────────────────────────────────────────────────────
const ResourceCard = ({ res }) => (
  <a
    href={res.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
  >
    <span className="text-xl shrink-0">{res.icon}</span>
    <div>
      <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">{res.title}</p>
      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{res.desc}</p>
    </div>
  </a>
);

// ─── Skill Badge ──────────────────────────────────────────────────────────────
const SkillBadge = ({ skill, confidence, onRemove, showConf }) => {
  const conf = confidence || 0;
  const colorClass =
    conf >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    conf >= 60 ? 'bg-blue-100 text-blue-700 border-blue-200' :
    conf >= 40 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${colorClass}`}>
      {skill}
      {showConf && <span className="opacity-70 text-[10px]">{conf}%</span>}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-60 font-bold text-sm leading-none">×</button>
      )}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LearningHub = () => {
  const userId = getUserId();

  // Data state
  const [skills, setSkills] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [learningPath, setLearningPath] = useState([]);
  const [dailyTask, setDailyTask] = useState(null);
  const [quickResources, setQuickResources] = useState([]);
  const [learningTips, setLearningTips] = useState([]);
  const [detectedSkills, setDetectedSkills] = useState([]);
  const [matchedDomains, setMatchedDomains] = useState({});
  const [profile, setProfile] = useState({ level: 'Beginner', weekly_hours: 5, current_skills: [], target_skills: [] });

  // UI state
  const [activeTab, setActiveTab] = useState('courses');
  const [mode, setMode] = useState('manual'); // 'manual' | 'auto'
  const [showConf, setShowConf] = useState(false);
  const [toast, setToast] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [jobRole, setJobRole] = useState('');
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({ name: '', technologies: '' });
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState({ courses: false, path: false, daily: false, detect: false, resume: false, stats: false });

  const fileRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }));

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      API.get('/skills').then(r => setSkills(r.data.all_skills || [])).catch(() => {}),
      API.get('/job-roles').then(r => setJobRoles(r.data.job_roles || [])).catch(() => {}),
      API.get('/stats', { params: { user_id: userId } }).then(r => setStats(r.data)).catch(() => {}),
      API.get('/profile', { params: { user_id: userId } }).then(r => {
        setProfile(r.data);
      }).catch(() => {}),
    ]);
  }, []);

  // ── Skill autocomplete ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!newSkill.trim()) { setSkillSuggestions([]); return; }
    const q = newSkill.toLowerCase();
    setSkillSuggestions(skills.filter(s => s.toLowerCase().includes(q)).slice(0, 6));
  }, [newSkill, skills]);

  // ── Fetch when target skills change (manual mode) ──────────────────────────
  useEffect(() => {
    if (mode === 'manual' && profile.target_skills && profile.target_skills.length > 0) {
      fetchRecommendations(profile.target_skills);
    }
  }, [profile.target_skills]);

  // ── API calls ──────────────────────────────────────────────────────────────
  const fetchRecommendations = useCallback(async (skillList) => {
    const allSkills = skillList || [...(profile.current_skills || []), ...(profile.target_skills || [])];
    if (!allSkills.length) return;
    setLoad('courses', true);
    try {
      const { data } = await API.post('/recommend', {
        user_id: userId,
        skills: allSkills,
        job_role: jobRole,
        projects: projects.map(p => ({ name: p.name, technologies: p.technologies })),
      });
      setCourses(data.recommendations || []);
      setQuickResources(data.quick_resources || []);
      setLearningTips(data.learning_tips || []);
      setMatchedDomains(data.detected_domains || {});
    } catch (e) {
      showToast('Failed to fetch recommendations', 'error');
    } finally {
      setLoad('courses', false);
    }
  }, [profile, jobRole, projects, userId]);

  const fetchLearningPath = useCallback(async () => {
    const target = mode === 'auto'
      ? detectedSkills.slice(0, 6).map(s => s.name)
      : (profile.target_skills || []);
    if (!target.length) { showToast('Add target skills first', 'error'); return; }
    setLoad('path', true);
    try {
      const { data } = await API.post('/learning-path', {
        user_id: userId,
        targetSkills: target,
        weekly_hours: profile.weekly_hours || 5,
      });
      setLearningPath(data.learning_path || []);
    } catch (e) {
      showToast('Failed to generate learning path', 'error');
    } finally {
      setLoad('path', false);
    }
  }, [mode, detectedSkills, profile, userId]);

  const fetchDailyTask = useCallback(async () => {
    const target = mode === 'auto'
      ? detectedSkills.slice(0, 3).map(s => s.name)
      : (profile.target_skills || []);
    if (!target.length) return;
    setLoad('daily', true);
    try {
      const { data } = await API.post('/daily-task', { user_id: userId, skills: target });
      setDailyTask(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoad('daily', false);
    }
  }, [mode, detectedSkills, profile, userId]);

  const detectSkills = async () => {
    setLoad('detect', true);
    try {
      const { data } = await API.post('/detect-skills', {
        user_id: userId,
        job_role: jobRole,
        projects,
      });
      setDetectedSkills(prev => {
        const map = new Map(prev.map(s => [s.name, s]));
        (data.detected_skills || []).forEach(s => {
          if (!map.has(s.name) || map.get(s.name).confidence < s.confidence)
            map.set(s.name, s);
        });
        return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
      });
      setMatchedDomains(data.matched_domains || {});
      showToast(`Detected ${data.total} skills from ${Object.keys(data.sources_used || {}).length} sources`);
    } catch (e) {
      showToast('Skill detection failed', 'error');
    } finally {
      setLoad('detect', false);
    }
  };

  const uploadResume = async (file) => {
    if (!file) return;
    setLoad('resume', true);
    const form = new FormData();
    form.append('resume', file);
    form.append('user_id', userId);
    try {
      const { data } = await API.post('/upload-resume', form);
      const incoming = (data.skill_details || []).map(s => ({ ...s, source: 'resume' }));
      setDetectedSkills(prev => {
        const map = new Map(prev.map(s => [s.name, s]));
        incoming.forEach(s => {
          if (!map.has(s.name) || map.get(s.name).confidence < s.confidence)
            map.set(s.name, s);
        });
        return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
      });
      showToast(`Extracted ${data.total_skills} skills from resume`);
    } catch (e) {
      showToast(e.response?.data?.error || 'Resume processing failed', 'error');
    } finally {
      setLoad('resume', false);
    }
  };

  const applyDetectedSkills = () => {
    const names = detectedSkills.map(s => s.name);
    const updated = {
      ...profile,
      current_skills: names.slice(0, 5),
      target_skills: names.slice(5, 10),
    };
    setProfile(updated);
    API.put('/profile', { user_id: userId, ...updated }).catch(() => {});
    fetchRecommendations(names);
    fetchDailyTask();
    showToast('Skills applied! Fetching AI recommendations…');
  };

  const addSkill = (sk) => {
    const s = (sk || newSkill).trim().toLowerCase();
    if (!s || (profile.target_skills || []).includes(s)) return;
    const updated = { ...profile, target_skills: [...(profile.target_skills || []), s] };
    setProfile(updated);
    API.put('/profile', { user_id: userId, target_skills: updated.target_skills }).catch(() => {});
    setNewSkill('');
    setSkillSuggestions([]);
  };

  const removeSkill = (sk) => {
    const updated = { ...profile, target_skills: (profile.target_skills || []).filter(x => x !== sk) };
    setProfile(updated);
    API.put('/profile', { user_id: userId, target_skills: updated.target_skills }).catch(() => {});
  };

  const enrollCourse = async (course) => {
    try {
      await API.post('/enroll', {
        user_id: userId,
        course_id: course.id,
        course_title: course.title,
        platform: course.platform,
      });
      showToast(`Enrolled in "${course.title}"! 🎓`);
      if (course.url) window.open(course.url, '_blank');
    } catch (e) {
      showToast(e.response?.data?.message || 'Enroll failed', 'error');
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const allUserSkills = [
    ...(profile.current_skills || []),
    ...(profile.target_skills || []),
  ];

  const domainList = Object.entries(matchedDomains);

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans">
      {toast && <Toast {...toast} />}

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-black">
              L
            </div>
            <div>
              <h1 className="font-black text-slate-800 text-lg leading-none">Learning Hub</h1>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">AI-Powered Career Learning</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              {['manual', 'auto'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 transition-colors capitalize ${mode === m ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {m === 'auto' ? '🔍 Auto Detect' : '✏️ Manual'}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchRecommendations()}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">

            {/* Detected Domains */}
            {domainList.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Detected Domains</p>
                <div className="flex flex-wrap gap-2">
                  {domainList.map(([key, info]) => (
                    <span
                      key={key}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border ${DOMAIN_COLORS[info.color] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                    >
                      {info.label}
                      {info.matched && (
                        <span className="ml-1 opacity-60">· {info.matched.slice(0, 2).join(', ')}{info.matched.length > 2 ? '…' : ''}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── AUTO DETECT PANEL ── */}
            {mode === 'auto' && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
                  <h2 className="text-base font-bold text-white">🔍 Smart Skill Detection</h2>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    Upload a résumé, enter your job role, or describe projects — AI will extract your skills
                  </p>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Resume */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">📄 Résumé (PDF / TXT / DOCX)</label>
                      <div
                        onClick={() => fileRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
                          ${resumeFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'}`}
                      >
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".pdf,.txt,.docx"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files[0];
                            if (f) { setResumeFile(f); uploadResume(f); }
                          }}
                        />
                        {loading.resume ? (
                          <div className="flex justify-center"><Spinner size={6} color="indigo" /></div>
                        ) : (
                          <>
                            <p className="text-2xl mb-1">📎</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {resumeFile ? resumeFile.name : 'Click to upload'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Job Role */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">💼 Job Role</label>
                      <input
                        type="text"
                        value={jobRole}
                        onChange={e => setJobRole(e.target.value)}
                        placeholder="e.g. ML Engineer"
                        list="job-roles-dl"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                      />
                      <datalist id="job-roles-dl">
                        {jobRoles.map(r => <option key={r} value={r} />)}
                      </datalist>
                    </div>

                    {/* Project */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">🏗️ Project</label>
                      <input
                        type="text"
                        value={newProject.name}
                        onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                        placeholder="Project name"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 mb-1.5"
                      />
                      <input
                        type="text"
                        value={newProject.technologies}
                        onChange={e => setNewProject(p => ({ ...p, technologies: e.target.value }))}
                        placeholder="Technologies (comma-separated)"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 mb-1.5"
                      />
                      <button
                        onClick={() => {
                          if (!newProject.name.trim()) return;
                          setProjects(p => [...p, newProject]);
                          setNewProject({ name: '', technologies: '' });
                        }}
                        className="w-full py-1.5 bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        + Add Project
                      </button>
                    </div>
                  </div>

                  {/* Project pills */}
                  {projects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {projects.map((p, i) => (
                        <span key={i} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">
                          🏗️ {p.name}
                          <button onClick={() => setProjects(ps => ps.filter((_, j) => j !== i))} className="hover:opacity-60 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={detectSkills}
                    disabled={loading.detect}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading.detect ? <><Spinner size={4} color="white" /><span>Detecting…</span></> : '🔍 Detect Skills from All Sources'}
                  </button>

                  {/* Detected skills */}
                  {detectedSkills.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-600">
                          Detected Skills <span className="text-indigo-600">({detectedSkills.length})</span>
                        </p>
                        <button
                          onClick={() => setShowConf(v => !v)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
                        >
                          {showConf ? 'Hide' : 'Show'} confidence
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {detectedSkills.map(s => (
                          <SkillBadge
                            key={s.name}
                            skill={s.name}
                            confidence={s.confidence}
                            showConf={showConf}
                            onRemove={() => setDetectedSkills(p => p.filter(x => x.name !== s.name))}
                          />
                        ))}
                      </div>

                      <button
                        onClick={applyDetectedSkills}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors"
                      >
                        ✓ Apply Skills & Get AI Recommendations
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Daily Task Banner ── */}
            {dailyTask ? (
              <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🎯</span>
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80">Today's AI-Picked Task</span>
                    </div>
                    <h3 className="text-lg font-black leading-snug mb-2">{dailyTask.topic}</h3>
                    <div className="flex flex-wrap gap-3 text-sm opacity-90">
                      <span>⏱ {dailyTask.duration}</span>
                      <span>📖 {dailyTask.format}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${dailyTask.priority === 'High' ? 'bg-red-500/40' : 'bg-yellow-500/40'}`}>
                        {dailyTask.priority} Priority
                      </span>
                      {dailyTask.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20">{dailyTask.category}</span>
                      )}
                    </div>
                    {dailyTask.encouragement && (
                      <p className="text-xs opacity-70 mt-2 italic">{dailyTask.encouragement}</p>
                    )}
                  </div>
                  {dailyTask.resource && (
                    <a
                      href={dailyTask.resource}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold text-sm transition-colors"
                    >
                      Start Learning →
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={fetchDailyTask}
                disabled={loading.daily}
                className="w-full py-3 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-500 text-sm font-semibold hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                {loading.daily ? <Spinner size={5} color="indigo" /> : '🎯 Generate Today\'s Learning Task'}
              </button>
            )}

            {/* ── Tabs ── */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100">
                {[
                  { id: 'courses', label: '📚 Courses' },
                  { id: 'path', label: '🗺️ Learning Path' },
                  { id: 'skills', label: '🎯 Skills' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3.5 text-sm font-semibold transition-colors
                      ${activeTab === tab.id
                        ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* COURSES TAB */}
                {activeTab === 'courses' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800">AI Recommended Courses</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {courses.length > 0
                            ? `${courses.length} courses matched to your skills via RAG`
                            : 'Add skills or detect them to get personalised recommendations'}
                        </p>
                      </div>
                      {courses.length > 0 && (
                        <button
                          onClick={() => fetchRecommendations()}
                          className="text-xs text-indigo-500 font-semibold hover:text-indigo-700"
                        >
                          Refresh
                        </button>
                      )}
                    </div>

                    {loading.courses ? (
                      <div className="flex justify-center py-12"><Spinner size={10} color="indigo" /></div>
                    ) : courses.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map((c, i) => (
                          <CourseCard key={c.id || i} course={c} onEnroll={enrollCourse} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-3xl mb-3">🎓</p>
                        <p className="text-slate-500 font-semibold">No recommendations yet</p>
                        <p className="text-slate-400 text-sm mt-1">
                          {mode === 'auto' ? 'Detect skills and click Apply' : 'Add target skills in the Skills tab'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* LEARNING PATH TAB */}
                {activeTab === 'path' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800">4-Week Structured Learning Path</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Cognitive Foundation → Applied Mechanics → Structured Creation → Professional Synthesis
                        </p>
                      </div>
                      <button
                        onClick={fetchLearningPath}
                        disabled={loading.path}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
                      >
                        {loading.path ? <Spinner size={4} color="white" /> : '⚡ Generate Path'}
                      </button>
                    </div>

                    {loading.path ? (
                      <div className="flex justify-center py-12"><Spinner size={10} color="indigo" /></div>
                    ) : learningPath.length > 0 ? (
                      <div className="space-y-4">
                        {learningPath.map((week, i) => <WeekCard key={week.week} week={week} index={i} />)}
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-3xl mb-3">🗺️</p>
                        <p className="text-slate-500 font-semibold">No path generated yet</p>
                        <p className="text-slate-400 text-sm mt-1">Click "Generate Path" above after adding skills</p>
                      </div>
                    )}
                  </div>
                )}

                {/* SKILLS TAB */}
                {activeTab === 'skills' && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-slate-800">Manage Your Skills</h3>

                    {/* Current skills */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {(profile.current_skills || []).length === 0 ? (
                          <p className="text-sm text-slate-400 italic">No current skills added yet</p>
                        ) : (
                          (profile.current_skills || []).map(sk => (
                            <SkillBadge key={sk} skill={sk} confidence={90} showConf={false} />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Target skills */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Skills</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(profile.target_skills || []).length === 0 ? (
                          <p className="text-sm text-slate-400 italic">No target skills — add them below</p>
                        ) : (
                          (profile.target_skills || []).map(sk => (
                            <SkillBadge key={sk} skill={sk} confidence={75} showConf={false}
                              onRemove={() => removeSkill(sk)} />
                          ))
                        )}
                      </div>

                      {/* Skill input with autocomplete */}
                      <div className="relative">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSkill}
                            onChange={e => setNewSkill(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSkill()}
                            placeholder="Type a skill (e.g. react, machine learning)…"
                            className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                          />
                          <button
                            onClick={() => addSkill()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
                          >
                            Add
                          </button>
                        </div>

                        {skillSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-12 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                            {skillSuggestions.map(s => (
                              <button
                                key={s}
                                onClick={() => addSkill(s)}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {(profile.target_skills || []).length > 0 && (
                        <button
                          onClick={() => fetchRecommendations()}
                          disabled={loading.courses}
                          className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {loading.courses ? <Spinner size={4} color="white" /> : '🚀 Get AI Course Recommendations'}
                        </button>
                      )}
                    </div>

                    {/* Skill progress bars */}
                    {allUserSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Skill Proficiency (estimated)</p>
                        <div className="space-y-3">
                          {allUserSkills.slice(0, 8).map((sk, i) => {
                            const pct = Math.min(95, 40 + i * 7);
                            return (
                              <div key={sk}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-semibold text-slate-700 capitalize">{sk}</span>
                                  <span className="text-slate-400">{pct}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-indigo-400 to-violet-400 h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Quick Resources (shown after courses load) ── */}
            {quickResources.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">
                  🔗 Curated Resources
                  <span className="text-xs font-normal text-slate-400 ml-2">personalised to your skills</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickResources.map((r, i) => <ResourceCard key={i} res={r} />)}
                </div>
              </div>
            )}

            {/* ── Learning Tips (shown after courses load) ── */}
            {learningTips.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">
                  💡 AI Learning Tips
                  <span className="text-xs font-normal text-slate-400 ml-2">for your domain</span>
                </h3>
                <ul className="space-y-3">
                  {learningTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="space-y-5">

            {/* Stats */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">📊 Your Progress</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Hours', value: stats?.total_learning_hours ?? 0, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: '⏱' },
                  { label: 'Completed', value: stats?.courses_completed ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
                  { label: 'Skills', value: stats?.skills_count ?? allUserSkills.length, color: 'text-violet-600', bg: 'bg-violet-50', icon: '🎯' },
                  { label: 'Streak', value: `${stats?.streak_days ?? 0}d`, color: 'text-amber-600', bg: 'bg-amber-50', icon: '🔥' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                    <p className="text-lg mb-0.5">{s.icon}</p>
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Profile Settings */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">⚙️ Profile Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Level</label>
                  <select
                    value={profile.level || 'Beginner'}
                    onChange={e => {
                      const updated = { ...profile, level: e.target.value };
                      setProfile(updated);
                      API.put('/profile', { user_id: userId, level: e.target.value }).catch(() => {});
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Weekly Hours: <span className="text-indigo-600">{profile.weekly_hours}h</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={profile.weekly_hours || 5}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setProfile(p => ({ ...p, weekly_hours: v }));
                    }}
                    onMouseUp={e => {
                      API.put('/profile', { user_id: userId, weekly_hours: Number(e.target.value) }).catch(() => {});
                    }}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>1h</span><span>20h</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Format</label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                    {['Video', 'Article', 'Project'].map(f => (
                      <button
                        key={f}
                        onClick={() => {
                          setProfile(p => ({ ...p, preferred_format: f }));
                          API.put('/profile', { user_id: userId, preferred_format: f }).catch(() => {});
                        }}
                        className={`flex-1 py-1.5 transition-colors ${profile.preferred_format === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Matched Domains mini-card */}
            {domainList.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">🗂 Your Tech Domains</h3>
                <div className="space-y-2">
                  {domainList.slice(0, 5).map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DOMAIN_COLORS[info.color] || 'bg-slate-100 text-slate-600'}`}>
                        {info.label}
                      </span>
                      <span className="text-[11px] text-slate-400">{(info.matched || []).length} skills</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enrolments */}
            {stats?.courses_enrolled > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">📋 Enrolled</h3>
                <div className="text-center py-4">
                  <p className="text-3xl font-black text-indigo-600">{stats.courses_enrolled}</p>
                  <p className="text-xs text-slate-400 mt-0.5">courses in progress</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningHub;

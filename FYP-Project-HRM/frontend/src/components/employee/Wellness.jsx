// Wellness.jsx — AI Wellness Coach with day drill-down and rich recommendations
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = 'http://localhost:5001/api';
const MOODS = ['😢', '😔', '😐', '🙂', '😊', '🤩'];
const MOOD_LABELS = ['Very Sad', 'Sad', 'Neutral', 'Good', 'Happy', 'Excellent'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreColor = (s) =>
  s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-amber-600' : 'text-red-500';

const scoreBg = (s) =>
  s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-blue-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-500';

const riskBadge = (level) => {
  const map = {
    LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[level] || map.LOW;
};

const priorityRing = { high: 'border-l-red-400', medium: 'border-l-amber-400', low: 'border-l-emerald-400' };
const priorityDot  = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-emerald-400' };

// ── Sub-components ────────────────────────────────────────────────────────────
const ScoreRing = ({ score, label, color, size = 'md' }) => {
  const r = size === 'lg' ? 36 : 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const sz = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  const fs = size === 'lg' ? 'text-xl' : 'text-sm';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${sz}`}>
        <svg className={`${sz} -rotate-90`} viewBox={`0 0 ${(r + 6) * 2} ${(r + 6) * 2}`}>
          <circle cx={r + 6} cy={r + 6} r={r} stroke="#e5e7eb" strokeWidth="5" fill="none" />
          <circle cx={r + 6} cy={r + 6} r={r}
            stroke={score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'}
            strokeWidth="5" fill="none"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${fs} ${color}`}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
};

const RecommendationCard = ({ rec, index }) => (
  <div className={`border-l-4 ${priorityRing[rec.priority] || 'border-l-slate-300'} bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all duration-200`}>
    <div className="flex items-start gap-3">
      <span className="text-2xl shrink-0 mt-0.5">{rec.icon || '💡'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="font-semibold text-gray-900 text-sm">{rec.title}</h4>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            rec.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200'
            : rec.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200'
            : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[rec.priority] || 'bg-slate-400'}`} />
            {rec.priority?.toUpperCase()}
          </span>
          {rec.duration && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">⏱ {rec.duration}</span>
          )}
        </div>
        <p className="text-xs text-gray-600 mb-2 leading-relaxed">{rec.description}</p>
        {rec.action && (
          <div className="bg-slate-50 rounded-lg p-2.5 mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Action</p>
            <p className="text-xs text-slate-700 leading-relaxed">{rec.action}</p>
          </div>
        )}
        {rec.impact && (
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-500 text-xs">📈</span>
            <span className="text-[11px] text-emerald-700 font-medium italic">{rec.impact}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// ── Day Drill-Down Modal ───────────────────────────────────────────────────────
const DayModal = ({ day, onClose }) => {
  if (!day) return null;
  const details = day.checkin_details || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{day.full_date}</h2>
            <p className="text-rose-100 text-sm">
              {details.length === 0 ? 'No check-ins recorded'
                : `${details.length} check-in${details.length > 1 ? 's' : ''} · Avg score: ${day.wellness_score}%`}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {details.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-500 font-medium">No check-ins on this day</p>
              <p className="text-sm text-gray-400 mt-1">Complete your daily check-ins to track progress here</p>
            </div>
          ) : details.map((c, i) => (
            <div key={c.id} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {/* Check-in header */}
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                    {c.checkin_number || i + 1}
                  </span>
                  <span className="font-semibold text-gray-800 text-sm">Check-in #{c.checkin_number || i + 1}</span>
                  <span className="text-xs text-gray-400">{c.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${scoreColor(c.wellness_score)}`}>
                    {c.wellness_score}%
                  </span>
                  {c.burnout_risk && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${riskBadge(c.burnout_risk)}`}>
                      {c.burnout_risk}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Metrics grid */}
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: 'Mood',   value: `${c.mood}/5`,         icon: '😊', pct: c.mood * 20 },
                    { label: 'Energy', value: `${c.energy}/10`,      icon: '⚡', pct: c.energy * 10 },
                    { label: 'Stress', value: `${c.stress}/10`,      icon: '😤', pct: c.stress * 10, invert: true },
                    { label: 'Sleep',  value: `${c.sleep}h`,          icon: '😴', pct: Math.min(c.sleep / 9 * 100, 100) },
                    { label: 'Prod.',  value: `${c.productivity}/10`, icon: '🎯', pct: c.productivity * 10 },
                  ].map(m => (
                    <div key={m.label} className="text-center bg-gray-50 rounded-lg p-2">
                      <div className="text-lg mb-0.5">{m.icon}</div>
                      <div className="text-xs font-bold text-gray-800">{m.value}</div>
                      <div className="text-[10px] text-gray-500">{m.label}</div>
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div className={`h-1 rounded-full ${m.invert ? (m.pct > 60 ? 'bg-red-400' : 'bg-emerald-400') : scoreBg(m.pct)}`}
                          style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Emotion & sentiment */}
                {(c.emotion || c.sentiment) && (
                  <div className="flex gap-2 flex-wrap">
                    {c.emotion && c.emotion !== 'neutral' && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                        Emotion: {c.emotion}
                      </span>
                    )}
                    {c.sentiment && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border
                        ${c.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : c.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        Sentiment: {c.sentiment}
                      </span>
                    )}
                  </div>
                )}

                {/* Message */}
                {c.message && (
                  <div className="bg-rose-50 rounded-lg px-3 py-2 border-l-2 border-rose-300">
                    <p className="text-xs text-rose-500 font-semibold mb-0.5">Your note</p>
                    <p className="text-sm text-gray-700 italic">"{c.message}"</p>
                  </div>
                )}

                {/* Recommendations */}
                {c.recommendations && c.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recommendations from this session</p>
                    <div className="space-y-1.5">
                      {c.recommendations.map((r, j) => (
                        <div key={j} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                          <span className="leading-relaxed">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Wellness = () => {
  const { currentUser, getToken, loading: authLoading } = useAuth();

  const [checkinStatus, setCheckinStatus] = useState({
    today_checkins: 0, remaining: 2, can_checkin: true, checkin_number: 1, daily_completed: false
  });
  const [weeklyWellness, setWeeklyWellness] = useState({
    streak: 0, avg_weekly: 0, total_checkins_week: 0, completed_days: 0, weekly_data: []
  });
  const [wellnessScore, setWellnessScore] = useState({ overall: 0, physical: 0, mental: 0, emotional: 0, social: 0 });
  const [dailyCheckIn, setDailyCheckIn] = useState({ mood: 3, energy: 7, stress: 4, sleep: 7, productivity: 8, message: '' });
  const [detailedRecs, setDetailedRecs]   = useState([]);   // rich recommendation objects
  const [stressPatterns, setStressPatterns] = useState([]);
  const [chatHistory, setChatHistory]     = useState([]);
  const [chatInput, setChatInput]         = useState('');
  const [selectedMood, setSelectedMood]   = useState(3);
  const [loading, setLoading]             = useState(false);
  const [dataLoaded, setDataLoaded]       = useState(false);
  const [error, setError]                 = useState(null);
  const [stats, setStats]                 = useState({ streak: 0, total_days: 0, total_checkins: 0, averages: {} });
  const [selectedDay, setSelectedDay]     = useState(null);  // for drill-down modal
  const chatEndRef                        = useRef(null);

  const api = useRef(null);
  if (!api.current) {
    api.current = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 15000 });
  }

  useEffect(() => {
    const id = api.current.interceptors.request.use(config => {
      const token  = getToken();
      const userId = localStorage.getItem('user_id');
      if (token)  config.headers['Authorization'] = `Bearer ${token}`;
      if (userId) config.headers['X-User-Id']     = userId;
      return config;
    });
    return () => api.current.interceptors.request.eject(id);
  }, [getToken]);

  const getUserId = useCallback(() =>
    currentUser?._id || currentUser?.id || localStorage.getItem('user_id'), [currentUser]);

  const fetchCheckinStatus  = useCallback(async (uid) => {
    try { const r = await api.current.get(`/checkin/status?user_id=${uid}`); setCheckinStatus(r.data); } catch {}
  }, []);
  const fetchWeeklyWellness = useCallback(async (uid) => {
    try { const r = await api.current.get(`/weekly-wellness?days=7&user_id=${uid}`); setWeeklyWellness(r.data); } catch {}
  }, []);
  const fetchHistory = useCallback(async (uid) => {
    try {
      const r = await api.current.get(`/history?user_id=${uid}`);
      if (r.data.checkins?.length > 0) {
        setStressPatterns(r.data.checkins.slice(0, 7).map(c => ({
          day:            new Date(c.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
          value:          c.stress * 10,
          wellness:       c.wellness_score,
          mood:           c.mood,
          checkin_number: c.checkin_number
        })));
      }
    } catch {}
  }, []);
  const fetchStats = useCallback(async (uid) => {
    try { const r = await api.current.get(`/stats?user_id=${uid}`); setStats(r.data); } catch {}
  }, []);

  const loadAllData = useCallback(async (uid) => {
    if (!uid) return;
    await Promise.allSettled([fetchCheckinStatus(uid), fetchWeeklyWellness(uid), fetchHistory(uid), fetchStats(uid)]);
    setDataLoaded(true);
  }, [fetchCheckinStatus, fetchWeeklyWellness, fetchHistory, fetchStats]);

  useEffect(() => {
    if (authLoading) return;
    const uid = getUserId();
    if (uid) loadAllData(uid);
  }, [authLoading, getUserId, loadAllData]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  // ── Check-in submit ────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    const uid = getUserId();
    if (!uid)                        { setError('User not found. Please log in again.'); return; }
    if (!checkinStatus.can_checkin)  { setError("You've completed both check-ins for today. Come back tomorrow!"); return; }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        user_id:      uid,
        mood:         selectedMood + 1,
        stress:       dailyCheckIn.stress,
        sleep:        dailyCheckIn.sleep,
        energy:       dailyCheckIn.energy,
        productivity: dailyCheckIn.productivity,
        message:      dailyCheckIn.message.trim() || `Check-in #${checkinStatus.checkin_number}`
      };
      const res  = await api.current.post('/checkin', payload);
      const data = res.data;

      setWellnessScore({
        overall:   data.wellness_score || 0,
        physical:  Math.round((dailyCheckIn.energy * 10 + Math.min(dailyCheckIn.sleep * 10, 100)) / 2),
        mental:    Math.min(Math.round(((dailyCheckIn.productivity * 10) + ((10 - dailyCheckIn.stress) * 10)) / 2), 100),
        emotional: Math.min((selectedMood + 1) * 20, 100),
        social:    Math.min(Math.round(((selectedMood + 1) * 20 + (10 - dailyCheckIn.stress) * 5) / 2), 100)
      });

      // ── Use detailed_recommendations if present, fall back to simple list ──
      const richRecs = data.detailed_recommendations || [];
      setDetailedRecs(richRecs);

      const remaining = checkinStatus.remaining - 1;
      setChatHistory(prev => [...prev,
        { id: Date.now(),     sender: 'user', text: payload.message,                                   time: new Date().toLocaleTimeString() },
        { id: Date.now() + 1, sender: 'ai',   text: remaining <= 0
            ? `🎉 Both check-ins done today! Wellness score: ${data.wellness_score}%. Great consistency!`
            : `Check-in #${checkinStatus.checkin_number} recorded! Score: ${data.wellness_score}%. ${remaining} check-in remaining today.`,
          time: new Date().toLocaleTimeString() }
      ]);

      setDailyCheckIn(p => ({ ...p, message: '' }));
      await loadAllData(uid);
    } catch (e) {
      console.error('checkin error:', e);
      setError(e.response?.data?.error || 'Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const input = chatInput.trim();
    setChatHistory(p => [...p, { id: Date.now(), sender: 'user', text: input, time: new Date().toLocaleTimeString() }]);
    setChatInput('');
    setTimeout(() => {
      setChatHistory(p => [...p, { id: Date.now() + 1, sender: 'ai', text: getAIReply(input, checkinStatus), time: new Date().toLocaleTimeString() }]);
    }, 700);
  };

  const getAIInsight = (patterns) => {
    if (!patterns?.length) return '';
    const avg   = patterns.reduce((a, p) => a + p.value, 0) / patterns.length;
    const trend = patterns[0]?.value - patterns[patterns.length - 1]?.value;
    if (avg > 70)   return "Stress has been consistently elevated. Prioritise structured recovery — even 10 minutes of deliberate rest has measurable impact.";
    if (trend < -10) return "Excellent progress — your stress trend is moving in the right direction. The habits you've built are working.";
    if (trend > 10)  return "Stress is increasing week-over-week. Consider reviewing workload boundaries and sleep quality as the primary levers.";
    return "Your patterns are holding steady. Consistency is the foundation — keep showing up daily.";
  };

  const getAIReply = (msg, status) => {
    const m = msg.toLowerCase();
    if (m.includes('check-in') || m.includes('checkin'))
      return status.daily_completed ? "Both check-ins complete for today — excellent discipline!" : `You have ${status.remaining} check-in${status.remaining !== 1 ? 's' : ''} remaining today.`;
    if (m.includes('stress') || m.includes('anxious'))
      return "Try box breathing: inhale 4 counts, hold 4, exhale 4, hold 4. Repeat 6 cycles. It activates your parasympathetic nervous system within minutes. 🧘";
    if (m.includes('sad') || m.includes('down'))
      return "I hear you — low periods are valid. A brief walk outside and one genuine human connection today can meaningfully shift your state.";
    if (m.includes('happy') || m.includes('great') || m.includes('good'))
      return "That's great to hear! What's been contributing to your positive state today? Anchoring that helps you recreate it. 😊";
    if (m.includes('tired') || m.includes('exhausted'))
      return "Fatigue at this level usually points to either sleep debt or recovery deficit. How many hours did you sleep last night?";
    if (m.includes('hello') || m.includes('hi'))
      return `Hello! You've completed ${status.today_checkins} check-in${status.today_checkins !== 1 ? 's' : ''} today. How are you feeling right now?`;
    return "I'm here to support your wellbeing. You can ask me about stress management, sleep, energy, or just share how you're feeling.";
  };

  // ── Weekly day card ────────────────────────────────────────────────────────
  const WeeklyCard = ({ day }) => {
    const hasData = day.checkins > 0;
    const strokeColor = !hasData ? '#d1d5db' : day.completed ? (day.wellness_score >= 60 ? '#10b981' : '#ef4444') : '#f59e0b';
    const circ = 2 * Math.PI * 20;
    return (
      <button
        onClick={() => setSelectedDay(day)}
        className="flex flex-col items-center group cursor-pointer focus:outline-none"
        title={`${day.full_date} — click to view details`}
      >
        <div className="text-xs font-semibold text-gray-500 mb-1.5 group-hover:text-rose-500 transition-colors">
          {day.day_name}
        </div>
        <div className="relative w-14 h-14 mb-1">
          <svg className="w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r="20" stroke="#e5e7eb" strokeWidth="4" fill="none" />
            <circle cx="28" cy="28" r="20"
              stroke={strokeColor}
              strokeWidth="4" fill="none"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - (day.wellness_score || 0) / 100)}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-700">
              {hasData ? (day.completed ? '✓' : `${day.checkins}/2`) : '–'}
            </span>
          </div>
          {/* Hover ring */}
          <div className="absolute inset-0 rounded-full ring-2 ring-rose-400 ring-offset-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[11px] text-gray-500">
          {hasData ? `${day.wellness_score}%` : 'No data'}
        </div>
      </button>
    );
  };

  if (authLoading || !dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🧘</div>
          <div className="text-xl text-gray-500">Loading your wellness space...</div>
        </div>
      </div>
    );
  }

  const userName = currentUser?.name || currentUser?.username || currentUser?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50/40">
      {/* Day drill-down modal */}
      {selectedDay && <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600">
                  AI Wellness Coach
                </h1>
                {weeklyWellness.streak > 0 && (
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-sm rounded-full font-semibold shadow-sm">
                    🔥 {weeklyWellness.streak} day streak
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-gray-600">
                Welcome back, <span className="font-semibold text-rose-600">{userName}</span>
                {stats.total_days > 0 && <span className="text-gray-400"> · {stats.total_days} days tracked</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white border border-rose-200 rounded-xl shadow-sm text-sm">
                <span className="text-gray-500">Today </span>
                <span className="font-bold text-rose-600">{checkinStatus.today_checkins}/2</span>
              </div>
              <button onClick={handleCheckIn} disabled={loading || !checkinStatus.can_checkin}
                className={`px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all ${
                  checkinStatus.can_checkin
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {loading ? 'Processing...' : checkinStatus.can_checkin ? `📝 Check-in #${checkinStatus.checkin_number}` : '✅ Done today'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        {/* ── Score Rings ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Wellness Overview</h3>
            {wellnessScore.overall > 0 && (
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                wellnessScore.overall >= 80 ? 'bg-emerald-50 text-emerald-700'
                : wellnessScore.overall >= 60 ? 'bg-blue-50 text-blue-700'
                : wellnessScore.overall >= 40 ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700'}`}>
                {wellnessScore.overall >= 80 ? 'Excellent' : wellnessScore.overall >= 60 ? 'Good' : wellnessScore.overall >= 40 ? 'Moderate' : 'Needs Attention'}
              </span>
            )}
          </div>
          <div className="flex items-center justify-around flex-wrap gap-4">
            <ScoreRing score={wellnessScore.overall}   label="Overall"   color={scoreColor(wellnessScore.overall)}   size="lg" />
            <div className="w-px h-16 bg-gray-100 hidden sm:block" />
            <ScoreRing score={wellnessScore.physical}  label="Physical"  color={scoreColor(wellnessScore.physical)} />
            <ScoreRing score={wellnessScore.mental}    label="Mental"    color={scoreColor(wellnessScore.mental)} />
            <ScoreRing score={wellnessScore.emotional} label="Emotional" color={scoreColor(wellnessScore.emotional)} />
            <ScoreRing score={wellnessScore.social}    label="Social"    color={scoreColor(wellnessScore.social)} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* ── Left: check-in + history ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Daily Check-in */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Daily Check-in</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                    checkinStatus.daily_completed ? 'bg-emerald-100 text-emerald-700'
                    : checkinStatus.today_checkins > 0 ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'}`}>
                    {checkinStatus.daily_completed ? '✓ Complete' : `${checkinStatus.today_checkins}/2`}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                {/* Mood */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    How are you feeling? <span className="font-normal text-gray-400">({MOOD_LABELS[selectedMood]})</span>
                  </label>
                  <div className="flex justify-between gap-1">
                    {MOODS.map((m, i) => (
                      <button key={i} onClick={() => setSelectedMood(i)} disabled={!checkinStatus.can_checkin}
                        className={`text-3xl transition-all duration-150 rounded-xl p-2 flex-1
                          ${!checkinStatus.can_checkin ? 'opacity-30 cursor-not-allowed'
                          : selectedMood === i ? 'scale-110 bg-rose-50 ring-2 ring-rose-300'
                          : 'opacity-50 hover:opacity-90 hover:bg-gray-50'}`}
                        title={MOOD_LABELS[i]}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'energy',       label: 'Energy Level',   emoji: '⚡' },
                    { key: 'stress',       label: 'Stress Level',   emoji: '😤' },
                    { key: 'productivity', label: 'Productivity',   emoji: '🎯' },
                  ].map(({ key, label, emoji }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
                        <span>{emoji}</span> {label}
                      </label>
                      <input type="range" min="1" max="10" step="1" value={dailyCheckIn[key]}
                        onChange={e => setDailyCheckIn(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                        disabled={!checkinStatus.can_checkin}
                        className="w-full accent-rose-500 disabled:opacity-40" />
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>1</span>
                        <span className="font-bold text-rose-500">{dailyCheckIn[key]}/10</span>
                        <span>10</span>
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
                      <span>😴</span> Sleep (hours)
                    </label>
                    <input type="number" min="0" max="24" step="0.5" value={dailyCheckIn.sleep}
                      onChange={e => setDailyCheckIn(p => ({ ...p, sleep: parseFloat(e.target.value) || 0 }))}
                      disabled={!checkinStatus.can_checkin}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none disabled:opacity-40 disabled:bg-gray-50" />
                    <div className="text-[11px] text-gray-400 text-center">Recommended: 7–9h</div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Describe your day <span className="font-normal text-gray-400">(optional — improves AI recommendations)</span>
                  </label>
                  <textarea value={dailyCheckIn.message}
                    onChange={e => setDailyCheckIn(p => ({ ...p, message: e.target.value }))}
                    disabled={!checkinStatus.can_checkin}
                    placeholder={checkinStatus.can_checkin ? "e.g. 'Feeling overwhelmed with deadlines but had a good lunch break...'" : "You've completed both check-ins for today"}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none resize-none disabled:opacity-40 disabled:bg-gray-50 leading-relaxed"
                    rows="3" />
                </div>

                <button onClick={handleCheckIn} disabled={loading || !checkinStatus.can_checkin}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm
                    ${checkinStatus.can_checkin
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white hover:shadow-md'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  {loading ? '⏳ Analysing your wellness...' : checkinStatus.can_checkin ? `Submit Check-in #${checkinStatus.checkin_number} ✨` : '✓ Daily Check-ins Complete'}
                </button>
              </div>
            </div>

            {/* Recent check-ins */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Recent Check-ins</h2>
                {stressPatterns.length > 0 && <span className="text-xs text-gray-400">Last 7 entries</span>}
              </div>
              {stressPatterns.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {stressPatterns.map((day, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className="w-14 shrink-0">
                          <div className="text-xs font-semibold text-gray-600">{day.day}</div>
                          {day.checkin_number && (
                            <div className="text-[10px] text-gray-400">#{day.checkin_number}</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 transition-all duration-500"
                                style={{ width: `${day.value}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 w-8 text-right">{day.value}%</span>
                          </div>
                          <div className="flex gap-3 text-[11px] text-gray-400">
                            <span>Wellness <strong className="text-gray-600">{day.wellness}%</strong></span>
                            <span>Mood <strong className="text-gray-600">{day.mood}/5</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                    <span className="text-lg shrink-0">💡</span>
                    <div>
                      <p className="text-xs font-bold text-blue-800 mb-0.5">AI Pattern Insight</p>
                      <p className="text-xs text-blue-700 leading-relaxed">{getAIInsight(stressPatterns)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-gray-500 font-medium">No check-in history yet</p>
                  <p className="text-sm text-gray-400 mt-1">Complete your first check-in to start tracking</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: recommendations + stats + chat ── */}
          <div className="space-y-6">

            {/* Recommendations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">AI Recommendations</h2>
                {detailedRecs.length > 0 && (
                  <span className="text-[11px] px-2 py-1 bg-rose-50 text-rose-600 rounded-full font-semibold border border-rose-100">
                    {detailedRecs.length} actions
                  </span>
                )}
              </div>
              {detailedRecs.length > 0 ? (
                <div className="space-y-3">
                  {detailedRecs.map((rec, i) => <RecommendationCard key={i} rec={rec} index={i} />)}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">🧘</div>
                  <p className="text-gray-500 font-medium">No recommendations yet</p>
                  <p className="text-sm text-gray-400 mt-1">Submit a check-in to get personalised AI guidance</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Your Stats</h3>
                {stats.total_days > 0 && (
                  <span className="text-[11px] bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-semibold border border-purple-100">
                    {stats.total_days}d tracked
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <span className="text-sm text-gray-700 font-medium">🔥 Current Streak</span>
                  <span className="font-bold text-orange-600">{stats.streak || 0} days</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Avg Sleep',  value: `${(stats.averages?.sleep || 0).toFixed(1)}h`,  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100' },
                    { label: 'Avg Energy', value: `${(stats.averages?.energy || 0).toFixed(1)}/10`, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
                    { label: 'Avg Stress', value: `${(stats.averages?.stress || 0).toFixed(1)}/10`, bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100' },
                    { label: 'Avg Mood',   value: `${(stats.averages?.mood || 0).toFixed(1)}/5`,   bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
                  ].map(s => (
                    <div key={s.label} className={`p-3 ${s.bg} rounded-xl border ${s.border}`}>
                      <div className="text-[11px] text-gray-500 mb-0.5">{s.label}</div>
                      <div className={`font-bold ${s.text} text-sm`}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Wellness Chat</h3>
                {chatHistory.length > 0 && (
                  <button onClick={() => setChatHistory([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                )}
              </div>
              <div className="h-56 overflow-y-auto mb-3 space-y-2 pr-1">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-sm">Ask me about stress, sleep, or how you're feeling</p>
                  </div>
                ) : chatHistory.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                      ${msg.sender === 'user'
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                      {msg.text}
                      <div className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-rose-200' : 'text-gray-400'}`}>{msg.time}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <input type="text" value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                  placeholder="How are you feeling?"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:outline-none" />
                <button onClick={sendChatMessage} disabled={!chatInput.trim()}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Weekly at a Glance ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Your Week at a Glance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Click any day to view detailed performance</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div><span className="text-gray-500">Avg: </span><span className="font-bold text-rose-600">{weeklyWellness.avg_weekly}%</span></div>
              <div><span className="text-gray-500">Done: </span><span className="font-bold text-emerald-600">{weeklyWellness.completed_days}/7</span></div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {weeklyWellness.weekly_data.map((day, i) => <WeeklyCard key={i} day={day} />)}
          </div>

          <div className="flex items-center justify-center gap-5 text-xs text-gray-500 border-t border-gray-50 pt-4">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span>Completed (2/2)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span>Partial (1/2)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-300" /><span>No check-ins</span></div>
          </div>

          {weeklyWellness.streak > 0 && (
            <div className="text-center mt-3 text-sm text-gray-600">
              🔥 You're on a <strong className="text-rose-600">{weeklyWellness.streak}-day streak</strong> — outstanding consistency!
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Wellness;

import React, { useState, useEffect } from 'react';

const AdminReports = () => {
  const [stats, setStats] = useState({
    totalReports: 0,
    generatedThisMonth: 0,
    automatedReports: 0,
    scheduledReports: 0
  });
  
  const [reports, setReports] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [reportType, setReportType] = useState('All');
  const [dateRange, setDateRange] = useState('last30days');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStats({
        totalReports: 156,
        generatedThisMonth: 24,
        automatedReports: 12,
        scheduledReports: 8
      });
      
      setReports([
        { id: 1, name: 'Monthly Payroll Report', type: 'Payroll', date: '2024-03-15', size: '2.4 MB', status: 'Generated', downloads: 45 },
        { id: 2, name: 'Q1 Performance Analytics', type: 'Performance', date: '2024-03-10', size: '3.1 MB', status: 'Generated', downloads: 32 },
        { id: 3, name: 'Employee Attendance Summary', type: 'Attendance', date: '2024-03-08', size: '1.8 MB', status: 'Scheduled', downloads: 28 },
        { id: 4, name: 'Recruitment Pipeline Analysis', type: 'Recruitment', date: '2024-03-05', size: '2.9 MB', status: 'Generated', downloads: 21 },
        { id: 5, name: 'Training Completion Report', type: 'Training', date: '2024-03-01', size: '1.2 MB', status: 'Automated', downloads: 39 },
        { id: 6, name: 'Budget Allocation Analysis', type: 'Finance', date: '2024-02-28', size: '4.2 MB', status: 'Generated', downloads: 18 },
        { id: 7, name: 'System Usage Statistics', type: 'System', date: '2024-02-25', size: '1.5 MB', status: 'Automated', downloads: 27 },
        { id: 8, name: 'Employee Satisfaction Survey', type: 'Survey', date: '2024-02-20', size: '2.1 MB', status: 'Generated', downloads: 56 }
      ]);
    };
    
    loadData();
  }, []);

  const AnimatedCounter = ({ value, duration = 2000, suffix = '' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let start = 0;
      const increment = value / (duration / 20);
      const timer = setInterval(() => {
        start += increment;
        if (start >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 20);
      
      return () => clearInterval(timer);
    }, [value, duration]);

    return (
      <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {count}{suffix}
      </span>
    );
  };

  const StatCard = ({ title, value, change, icon, color, suffix = '' }) => (
    <div className={`rounded-2xl shadow-2xl border p-6 transition-all duration-300 hover:shadow-3xl transform hover:-translate-y-1 group ${
      darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <div className="flex items-baseline space-x-1">
            <AnimatedCounter value={value} suffix={suffix} />
          </div>
          {change && (
            <p className={`text-sm mt-2 flex items-center ${change.startsWith('+') ? 'text-green-500' : 'text-rose-500'}`}>
              <span className={`mr-1 ${change.startsWith('+') ? 'animate-bounce' : ''}`}>
                {change.startsWith('+') ? '↗' : '↘'}
              </span>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} text-white transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const getReportTypeColor = (type) => {
    const colors = {
      Payroll: darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800',
      Performance: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800',
      Attendance: darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800',
      Recruitment: darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800',
      Training: darkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-800',
      Finance: darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-800',
      System: darkMode ? 'bg-gray-900/30 text-gray-400' : 'bg-gray-100 text-gray-800',
      Survey: darkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-100 text-pink-800'
    };
    return colors[type] || (darkMode ? 'bg-gray-900/30 text-gray-400' : 'bg-gray-100 text-gray-800');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Generated': return darkMode ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-green-100 text-green-800';
      case 'Scheduled': return darkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' : 'bg-yellow-100 text-yellow-800';
      case 'Automated': return darkMode ? 'bg-blue-900/30 text-blue-400 border border-blue-700' : 'bg-blue-100 text-blue-800';
      default: return darkMode ? 'bg-gray-900/30 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesType = reportType === 'All' || report.type === reportType;
    return matchesType;
  });

  return (
    <div className={`min-h-screen py-8 transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/30'
    }`}>
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse ${
          darkMode ? 'bg-indigo-500/10' : 'bg-indigo-200/20'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 ${
          darkMode ? 'bg-rose-500/10' : 'bg-rose-200/20'
        }`}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Reports & Analytics
              </h1>
              <p className={`mt-2 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Generate and analyze comprehensive HR reports
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Date Range Selector */}
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={`rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="lastquarter">Last Quarter</option>
                <option value="lastyear">Last Year</option>
              </select>

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 hover:rotate-12 ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 shadow-lg' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-lg border border-gray-200'
                }`}
              >
                <span className="text-xl">{darkMode ? '🌙' : '☀️'}</span>
              </button>

              <button 
                onClick={() => setShowGenerateModal(true)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg"
              >
                <span className="text-lg">📄</span> Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Reports"
            value={stats.totalReports}
            change="+12 this month"
            icon="📊"
            color="bg-gradient-to-br from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Generated This Month"
            value={stats.generatedThisMonth}
            icon="📈"
            color="bg-gradient-to-br from-green-500 to-emerald-500"
          />
          <StatCard
            title="Automated Reports"
            value={stats.automatedReports}
            icon="🤖"
            color="bg-gradient-to-br from-purple-500 to-pink-500"
          />
          <StatCard
            title="Scheduled Reports"
            value={stats.scheduledReports}
            icon="⏰"
            color="bg-gradient-to-br from-amber-500 to-orange-500"
          />
        </div>

        {/* Report Types Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {['Payroll', 'Performance', 'Attendance', 'Recruitment'].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`p-4 rounded-xl border transition-all duration-300 transform hover:-translate-y-1 ${
                reportType === type
                  ? darkMode 
                    ? 'bg-indigo-900/50 border-indigo-500' 
                    : 'bg-indigo-50 border-indigo-300'
                  : darkMode 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-center">
                <div className={`text-lg mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {type === 'Payroll' && '💰'}
                  {type === 'Performance' && '📊'}
                  {type === 'Attendance' && '👥'}
                  {type === 'Recruitment' && '🎯'}
                </div>
                <div className={`text-sm font-medium ${reportType === type ? 'text-indigo-600 dark:text-indigo-400' : darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {type}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className={`rounded-2xl shadow-2xl border p-6 mb-6 ${
          darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                Available Reports
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Filter and manage your reports
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className={`rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="All">All Report Types</option>
                <option value="Payroll">Payroll</option>
                <option value="Performance">Performance</option>
                <option value="Attendance">Attendance</option>
                <option value="Recruitment">Recruitment</option>
                <option value="Training">Training</option>
                <option value="Finance">Finance</option>
                <option value="System">System</option>
                <option value="Survey">Survey</option>
              </select>
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2">
                <span className="text-lg">🔍</span> Search
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className={`rounded-2xl shadow-2xl border overflow-hidden mb-6 ${
          darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <div className="px-6 py-4 border-b">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              Recent Reports
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Report Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Downloads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {filteredReports.map((report) => (
                  <tr key={report.id} className={`hover:${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'} transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {report.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getReportTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {report.date}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {report.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {report.downloads}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className={`p-2 rounded transition-colors mr-2 ${darkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'}`}>
                        👁️ View
                      </button>
                      <button className={`p-2 rounded transition-colors ${darkMode ? 'text-green-400 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'}`}>
                        📥 Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className={`rounded-2xl shadow-2xl border p-6 mb-6 ${
          darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <h3 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            Analytics Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Report Usage Trends
              </h4>
              <div className="h-64 flex items-center justify-center rounded-lg border-2 border-dashed">
                <div className="text-center">
                  <span className="text-4xl mb-3">📈</span>
                  <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Analytics Chart Coming Soon</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Popular Reports
              </h4>
              <div className="space-y-3">
                {reports.slice(0, 4).map((report, index) => (
                  <div 
                    key={report.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      darkMode 
                        ? 'border-gray-700 hover:bg-gray-800/50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`text-lg ${
                        index === 0 ? 'text-amber-500' :
                        index === 1 ? 'text-gray-400' :
                        index === 2 ? 'text-amber-700' :
                        'text-gray-500'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊'}
                      </span>
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {report.name}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                          {report.type} • {report.downloads} downloads
                        </div>
                      </div>
                    </div>
                    <button className={`p-2 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                      📥
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`rounded-2xl shadow-3xl max-w-md w-full ${
            darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-white'
          }`}>
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Generate New Report
                </h3>
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Report Type
                  </label>
                  <select className={`w-full rounded-lg px-4 py-2 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}>
                    <option>Select Report Type</option>
                    <option>Payroll Summary</option>
                    <option>Attendance Report</option>
                    <option>Performance Analytics</option>
                    <option>Recruitment Pipeline</option>
                    <option>Training Progress</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Date Range
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="date" 
                      className={`flex-1 rounded-lg px-4 py-2 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Start Date"
                    />
                    <span className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>to</span>
                    <input 
                      type="date" 
                      className={`flex-1 rounded-lg px-4 py-2 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="End Date"
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Format
                  </label>
                  <div className="flex space-x-2">
                    {['PDF', 'Excel', 'CSV'].map(format => (
                      <button
                        key={format}
                        className={`flex-1 py-2 rounded-lg border ${
                          darkMode 
                            ? 'border-gray-600 hover:bg-gray-700' 
                            : 'border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold mt-4">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .shadow-3xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
      `}</style>
    </div>
  );
};

export default AdminReports;
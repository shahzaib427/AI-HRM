import React from 'react';

const EmployeeStats = ({ stats, darkMode }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Object.entries(stats).map(([key, value], index) => (
        <div key={key} className={`rounded-2xl shadow-2xl border p-6 ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' 
            : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
              </p>
              <div className="flex items-baseline space-x-1">
                <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {value}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmployeeStats;
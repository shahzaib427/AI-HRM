// PlaceholderPage.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';

const PlaceholderPage = () => {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop() || 'Page';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/30 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-2xl rounded-2xl p-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 capitalize">
            {pageName.replace('-', ' ')} Page
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            This page is under construction
          </p>
          <div className="inline-block p-4 bg-blue-50 rounded-xl">
            <span className="text-blue-600">🚧 Coming Soon 🚧</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
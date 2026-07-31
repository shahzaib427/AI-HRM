import React from 'react'
import { Link } from 'react-router-dom'

const Services = () => {
  const services = [
    {
      icon: '👥',
      title: 'Employee Management',
      description: 'Complete employee lifecycle management from onboarding to offboarding with AI-powered workflows.',
      features: ['Employee Profiles', 'Document Management', 'Role-based Access', 'Workflow Automation'],
      gradient: 'from-fuchsia-500 to-pink-600'
    },
    {
      icon: '⏰',
      title: 'Attendance Tracking',
      description: 'Automated time tracking with AI-powered pattern analysis and real-time monitoring.',
      features: ['Real-time Tracking', 'Leave Management', 'Overtime Calculation', 'Pattern Analysis'],
      gradient: 'from-indigo-500 to-blue-600'
    },
    {
      icon: '💰',
      title: 'Payroll Processing',
      description: 'Seamless payroll calculation and disbursement with automated tax compliance.',
      features: ['Auto Calculation', 'Tax Management', 'Salary Slips', 'Compliance Reporting'],
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      icon: '📊',
      title: 'Performance Analytics',
      description: 'AI-driven insights into employee performance and productivity with predictive analytics.',
      features: ['KPI Tracking', 'Performance Reviews', 'Growth Analytics', 'Skill Mapping'],
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      icon: '🤖',
      title: 'AI Predictions',
      description: 'Predict employee turnover, leave patterns, and performance trends with 92% accuracy.',
      features: ['Attrition Prediction', 'Leave Forecasting', 'Performance Trends', 'Risk Analysis'],
      gradient: 'from-purple-500 to-fuchsia-600'
    },
    {
      icon: '📋',
      title: 'Recruitment',
      description: 'Streamlined hiring process with AI-powered candidate matching and tracking.',
      features: ['Job Postings', 'Candidate Management', 'Interview Scheduling', 'AI Matching'],
      gradient: 'from-cyan-500 to-blue-500'
    }
  ]

  const stats = [
    { number: "84%", label: "Process Automation", sublabel: "Average automation rate" },
    { number: "99.9%", label: "Accuracy", sublabel: "AI prediction accuracy" },
    { number: "200+", label: "Companies", sublabel: "Using our services" },
    { number: "45%", label: "Time Saved", sublabel: "Average efficiency gain" }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-900 text-white overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-fuchsia-400/20 to-indigo-400/20 animate-float"
              style={{
                width: Math.random() * 80 + 30,
                height: Math.random() * 80 + 30,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-fuchsia-400 rounded-full animate-pulse shadow-lg shadow-fuchsia-400/25"></div>
        <div className="absolute top-40 right-20 w-6 h-6 bg-indigo-400 rounded-full animate-bounce shadow-lg shadow-indigo-400/25"></div>
        <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-amber-300 rounded-full animate-ping shadow-lg shadow-amber-300/25"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 border border-white/20 mb-8 backdrop-blur-sm shadow-lg">
              <span className="w-2 h-2 bg-fuchsia-400 rounded-full mr-3 animate-pulse shadow-sm shadow-fuchsia-400"></span>
              <span className="text-fuchsia-200 text-sm font-semibold">🚀 AI-POWERED HR SERVICES</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-amber-200 bg-clip-text text-transparent">
                Intelligent
              </span>
              <br />
              <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                HR Services
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-indigo-100 max-w-3xl mx-auto leading-relaxed font-light">
              Transform your HR operations with our comprehensive suite of AI-powered services. 
              From recruitment to retirement, we've got you covered.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto mb-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group cursor-pointer">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform bg-gradient-to-r from-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="text-amber-300 font-semibold">{stat.label}</div>
                  <div className="text-indigo-200 text-sm mt-1">{stat.sublabel}</div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/contact"
                className="group relative bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:from-fuchsia-600 hover:to-indigo-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-fuchsia-500/30 flex items-center"
              >
                <span>Get Started Today</span>
                <svg className="w-5 h-5 ml-3 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              
              <Link
                to="/demo"
                className="group border-2 border-indigo-400/30 text-indigo-100 px-10 py-5 rounded-2xl font-bold text-lg hover:border-amber-300 hover:text-amber-300 hover:bg-amber-300/5 transition-all duration-300 flex items-center backdrop-blur-sm hover:shadow-lg hover:shadow-amber-300/10"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View Service Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-amber-300 rounded-full flex justify-center shadow-lg shadow-amber-300/25">
              <div className="w-1 h-3 bg-amber-300 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        {/* Geometric Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(30deg,_transparent_49%,_#f0f_50%,_transparent_51%),_linear-gradient(-30deg,_transparent_49%,_#f0f_50%,_transparent_51%)] bg-[length:60px_60px]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-fuchsia-100 to-indigo-100 text-fuchsia-800 text-sm font-semibold mb-6 shadow-lg">
              <span>✨ COMPREHENSIVE SOLUTIONS</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Our
              <span className="block bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent mt-2">
                AI-Powered Services
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Each service is enhanced with artificial intelligence to deliver unprecedented efficiency and insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div 
                key={index}
                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-700 hover:-translate-y-4 border border-white/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
                }}
              >
                {/* Animated Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${service.gradient} rounded-3xl opacity-0 group-hover:opacity-10 transition-all duration-700`}></div>
                
                {/* Glow Effect */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${service.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-700 -z-10`}></div>
                
                {/* Icon Container */}
                <div className={`relative inline-flex p-4 rounded-2xl bg-gradient-to-r ${service.gradient} text-white mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-2xl text-3xl`}>
                  {service.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">
                  {service.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed mb-6 relative z-10">
                  {service.description}
                </p>
                
                <ul className="space-y-2 mb-6 relative z-10">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center group/feature">
                      <span className="w-2 h-2 bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full mr-3 group-hover/feature:scale-150 transition-transform duration-300"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div className="flex items-center text-sm font-semibold text-gray-500 group-hover:text-fuchsia-600 transition-colors cursor-pointer relative z-10">
                  Learn more
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1)_0%,_transparent_50%)]"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              How It <span className="bg-gradient-to-r from-fuchsia-300 via-amber-300 to-indigo-300 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
              Simple, streamlined process to transform your HR operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Consultation", description: "We analyze your current HR processes and identify opportunities for AI integration", icon: "💬" },
              { step: "02", title: "Implementation", description: "Seamless integration with your existing systems and comprehensive team training", icon: "⚙️" },
              { step: "03", title: "Optimization", description: "Continuous AI learning and optimization to improve efficiency over time", icon: "📈" }
            ].map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-indigo-100 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-fuchsia-900 via-indigo-900 to-amber-900 text-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80')] opacity-15 bg-cover bg-center"></div>
        </div>
        
        {/* Floating Shapes */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-fuchsia-400/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-indigo-400/10 rounded-full blur-xl animate-ping"></div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl md:text-6xl font-bold mb-8">
            Ready to <span className="bg-gradient-to-r from-fuchsia-300 via-amber-300 to-indigo-300 bg-clip-text text-transparent">Transform</span> Your HR?
          </h2>
          <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of companies that have revolutionized their HR operations with our AI-powered services.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/contact"
              className="group bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white px-12 py-5 rounded-2xl font-bold text-lg hover:from-fuchsia-600 hover:to-indigo-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-fuchsia-500/40 flex items-center relative overflow-hidden"
            >
              <span className="relative z-10">Start Free Trial</span>
              <svg className="w-6 h-6 ml-3 relative z-10 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            
            <Link
              to="/pricing"
              className="group border-2 border-indigo-400/50 text-indigo-100 px-12 py-5 rounded-2xl font-bold text-lg hover:border-amber-300 hover:text-amber-300 hover:bg-amber-300/5 transition-all duration-300 flex items-center backdrop-blur-sm hover:shadow-lg hover:shadow-amber-300/20"
            >
              View Pricing
              <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <p className="text-indigo-200 text-sm mt-8 backdrop-blur-sm bg-white/5 rounded-full py-2 px-4 inline-block">
            ✨ 30-day free trial • No credit card required • Enterprise-grade security
          </p>
        </div>
      </section>
    </div>
  )
}

export default Services
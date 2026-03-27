import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: "Smart Automation",
      description: "Automate payroll, attendance, and leave management with AI-driven workflows that learn from your patterns",
      gradient: "from-fuchsia-500 to-pink-600"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Military-grade Security",
      description: "End-to-end encryption, SOC 2 compliance, and multi-factor authentication to protect sensitive HR data",
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: "Predictive Analytics",
      description: "Forecast employee turnover, performance trends, and workforce needs with 92% accuracy using machine learning",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Talent Management",
      description: "Complete lifecycle management from recruitment to retirement with AI-powered candidate matching",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Performance Intelligence",
      description: "360-degree feedback and real-time performance tracking with automated review cycles and goal setting",
      gradient: "from-rose-500 to-red-500"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Compensation Analytics",
      description: "Smart salary benchmarking, bonus optimization, and equity management with market intelligence",
      gradient: "from-violet-500 to-purple-600"
    }
  ];

  const stats = [
    { number: "84%", label: "Faster HR Operations", sublabel: "Average time savings" },
    { number: "99.9%", label: "Uptime SLA", sublabel: "Enterprise reliability" },
    { number: "200+", label: "Global Companies", sublabel: "Trust our platform" },
    { number: "45%", label: "Cost Reduction", sublabel: "Average savings" }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "CTO, TechNova Inc.",
      content: "HRM Pro reduced our onboarding time from 2 weeks to 2 days. The AI-powered insights helped us reduce employee turnover by 30%.",
      avatar: "SC",
      gradient: "from-fuchsia-500 to-pink-500"
    },
    {
      name: "Marcus Rodriguez",
      role: "HR Director, Global Finance Corp",
      content: "The predictive analytics accurately forecasted our hiring needs for Q4, saving us $2M in recruitment costs.",
      avatar: "MR",
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      name: "Priya Patel",
      role: "VP Operations, StartupScale",
      content: "From 50 to 500 employees, HRM Pro scaled seamlessly with our growth. The automation features are game-changing.",
      avatar: "PP",
      gradient: "from-amber-500 to-orange-500"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Unique Gradient Scheme */}
      <section className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-900 text-white overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-fuchsia-400/20 to-indigo-400/20 animate-float"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
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
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
          <div className="text-center">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 border border-white/20 mb-8 backdrop-blur-sm shadow-lg">
              <span className="w-2 h-2 bg-fuchsia-400 rounded-full mr-3 animate-pulse shadow-sm shadow-fuchsia-400"></span>
              <span className="text-fuchsia-200 text-sm font-semibold">🎯 AI-POWERED HR REINVENTED</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-amber-200 bg-clip-text text-transparent animate-gradient">
                Future-Proof
              </span>
              <br />
              <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                Your HR Strategy
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-indigo-100 max-w-3xl mx-auto leading-relaxed font-light">
              Experience the next evolution in human resources. Our neural network-powered platform adapts to your unique workforce dynamics in real-time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                to="/login"
                className="group relative bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:from-fuchsia-600 hover:to-indigo-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-fuchsia-500/30 flex items-center"
              >
                <span>Start Free Trial</span>
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
                Watch AI in Action
              </Link>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
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

      {/* Features Section - Innovative Design */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        {/* Geometric Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(30deg,_transparent_49%,_#f0f_50%,_transparent_51%),_linear-gradient(-30deg,_transparent_49%,_#f0f_50%,_transparent_51%)] bg-[length:60px_60px]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-fuchsia-100 to-indigo-100 text-fuchsia-800 text-sm font-semibold mb-6 shadow-lg">
              <span>🚀 INNOVATIVE FEATURES</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Powered by
              <span className="block bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent mt-2 animate-gradient">
                Advanced AI
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Our neural network architecture learns and adapts to your organization's unique patterns and needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-700 hover:-translate-y-4 border border-white/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
                }}
              >
                {/* Animated Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-10 transition-all duration-700`}></div>
                
                {/* Glow Effect */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-700 -z-10`}></div>
                
                {/* Icon Container */}
                <div className={`relative inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} text-white mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-2xl`}>
                  {feature.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-4 relative z-10">
                  {feature.title}
                </h3>
                
                <p className="text-slate-600 leading-relaxed mb-6 relative z-10">
                  {feature.description}
                </p>
                
                <div className="flex items-center text-sm font-semibold text-slate-500 group-hover:text-fuchsia-600 transition-colors cursor-pointer relative z-10">
                  Explore capabilities
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Modern Design */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1)_0%,_transparent_50%)]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Loved by <span className="bg-gradient-to-r from-fuchsia-300 via-amber-300 to-indigo-300 bg-clip-text text-transparent">Forward-Thinking Teams</span>
            </h2>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
              See how innovative companies are transforming their HR operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="group relative bg-white/5 backdrop-blur-md rounded-3xl p-8 hover:bg-white/10 transition-all duration-500 border border-white/10 hover:border-white/20">
                <div className="flex items-center mb-6">
                  <div className={`w-12 h-12 bg-gradient-to-r ${testimonial.gradient} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {testimonial.avatar}
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-amber-300 text-sm">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-indigo-100 leading-relaxed group-hover:text-white transition-colors">
                  "{testimonial.content}"
                </p>
                
                {/* Quote Icon */}
                <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section - Unique Gradient */}
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
            Ready to <span className="bg-gradient-to-r from-fuchsia-300 via-amber-300 to-indigo-300 bg-clip-text text-transparent animate-gradient">Revolutionize</span> HR?
          </h2>
          <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the AI revolution in human resources. Experience the future today with our neural network-powered platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/contact"
              className="group bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white px-12 py-5 rounded-2xl font-bold text-lg hover:from-fuchsia-600 hover:to-indigo-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-fuchsia-500/40 flex items-center relative overflow-hidden"
            >
              <span className="relative z-10">Start AI Journey</span>
              <svg className="w-6 h-6 ml-3 relative z-10 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            
            <Link
              to="/pricing"
              className="group border-2 border-indigo-400/50 text-indigo-100 px-12 py-5 rounded-2xl font-bold text-lg hover:border-amber-300 hover:text-amber-300 hover:bg-amber-300/5 transition-all duration-300 flex items-center backdrop-blur-sm hover:shadow-lg hover:shadow-amber-300/20"
            >
              Explore Solutions
              <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <p className="text-indigo-200 text-sm mt-8 backdrop-blur-sm bg-white/5 rounded-full py-2 px-4 inline-block">
            ✨ Zero commitment • AI-powered setup • Enterprise security
          </p>
        </div>
      </section>
    </div>
  )
}

export default Home

// import React from 'react'
// import { Link } from 'react-router-dom'

// const Home = () => {
//   const features = [
//     {
//       icon: (
//         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
//         </svg>
//       ),
//       title: "Smart Automation",
//       description: "Automate payroll, attendance, and leave management with AI-driven workflows that learn from your patterns",
//       gradient: "from-violet-500 to-purple-600"
//     },
//     {
//       icon: (
//         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
//         </svg>
//       ),
//       title: "Military-grade Security",
//       description: "End-to-end encryption, SOC 2 compliance, and multi-factor authentication to protect sensitive HR data",
//       gradient: "from-emerald-500 to-teal-600"
//     },
//     {
//       icon: (
//         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
//         </svg>
//       ),
//       title: "Predictive Analytics",
//       description: "Forecast employee turnover, performance trends, and workforce needs with 92% accuracy using machine learning",
//       gradient: "from-orange-500 to-red-500"
//     },
//     {
//       icon: (
//         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//         </svg>
//       ),
//       title: "Talent Management",
//       description: "Complete lifecycle management from recruitment to retirement with AI-powered candidate matching",
//       gradient: "from-blue-500 to-cyan-500"
//     },
//     {
//       icon: (
//         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//         </svg>
//       ),
//       title: "Performance Intelligence",
//       description: "360-degree feedback and real-time performance tracking with automated review cycles and goal setting",
//       gradient: "from-pink-500 to-rose-500"
//     },
//     {
//       icon: (
//         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//         </svg>
//       ),
//       title: "Compensation Analytics",
//       description: "Smart salary benchmarking, bonus optimization, and equity management with market intelligence",
//       gradient: "from-amber-500 to-yellow-500"
//     }
//   ];

//   const stats = [
//     { number: "84%", label: "Faster HR Operations", sublabel: "Average time savings" },
//     { number: "99.9%", label: "Uptime SLA", sublabel: "Enterprise reliability" },
//     { number: "200+", label: "Global Companies", sublabel: "Trust our platform" },
//     { number: "45%", label: "Cost Reduction", sublabel: "Average savings" }
//   ];

//   const testimonials = [
//     {
//       name: "Sarah Chen",
//       role: "CTO, TechNova Inc.",
//       content: "HRM Pro reduced our onboarding time from 2 weeks to 2 days. The AI-powered insights helped us reduce employee turnover by 30%.",
//       avatar: "SC"
//     },
//     {
//       name: "Marcus Rodriguez",
//       role: "HR Director, Global Finance Corp",
//       content: "The predictive analytics accurately forecasted our hiring needs for Q4, saving us $2M in recruitment costs.",
//       avatar: "MR"
//     },
//     {
//       name: "Priya Patel",
//       role: "VP Operations, StartupScale",
//       content: "From 50 to 500 employees, HRM Pro scaled seamlessly with our growth. The automation features are game-changing.",
//       avatar: "PP"
//     }
//   ];

//   return (
//     <div className="min-h-screen">
//       {/* Hero Section - Completely Different Color Scheme */}
//       <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
//         {/* Animated Background */}
//         <div className="absolute inset-0 opacity-20">
//           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900 via-gray-900 to-gray-900"></div>
//         </div>
        
//         {/* Floating Elements */}
//         <div className="absolute top-20 left-10 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
//         <div className="absolute top-40 right-20 w-6 h-6 bg-cyan-400 rounded-full animate-bounce"></div>
//         <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>
        
//         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
//           <div className="text-center">
//             {/* Enhanced Badge */}
//             <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 mb-8 backdrop-blur-sm">
//               <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3 animate-pulse"></span>
//               <span className="text-cyan-300 text-sm font-semibold">🚀 NEXT-GEN HR PLATFORM LAUNCHED</span>
//             </div>

//             <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
//               <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
//                 Revolutionize
//               </span>
//               <br />
//               <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
//                 Your Workforce
//               </span>
//             </h1>
            
//             <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
//               The world's first AI-native HR platform that transforms how you hire, manage, and grow your talent. 
//               Experience the future of human resources today.
//             </p>

//             <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
//               <Link
//                 to="/login"
//                 className="group relative bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-cyan-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 flex items-center"
//               >
//                 <span>Start Free Trial</span>
//                 <svg className="w-5 h-5 ml-3 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
//                 </svg>
//                 <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
//               </Link>
              
//               <Link
//                 to="/demo"
//                 className="group border-2 border-gray-600 text-gray-300 px-10 py-5 rounded-2xl font-bold text-lg hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all duration-300 flex items-center backdrop-blur-sm"
//               >
//                 <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//                 Watch Product Tour
//               </Link>
//             </div>

//             {/* Enhanced Stats */}
//             <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
//               {stats.map((stat, index) => (
//                 <div key={index} className="text-center group">
//                   <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">{stat.number}</div>
//                   <div className="text-cyan-300 font-semibold">{stat.label}</div>
//                   <div className="text-gray-400 text-sm mt-1">{stat.sublabel}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Enhanced Scroll Indicator */}
//         <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
//           <div className="animate-bounce">
//             <div className="w-6 h-10 border-2 border-cyan-400 rounded-full flex justify-center">
//               <div className="w-1 h-3 bg-cyan-400 rounded-full mt-2 animate-pulse"></div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Features Section - Completely Different Design */}
//       <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
//         {/* Background Pattern */}
//         <div className="absolute inset-0 opacity-[0.02]">
//           <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_#000_1px,_transparent_0)] bg-[length:40px_40px]"></div>
//         </div>
        
//         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="text-center mb-20">
//             <div className="inline-flex items-center px-6 py-3 rounded-full bg-cyan-100 text-cyan-800 text-sm font-semibold mb-6">
//               <span>✨ POWERFUL CAPABILITIES</span>
//             </div>
//             <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
//               Everything You Need to
//               <span className="block bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent mt-2">
//                 Excel
//               </span>
//             </h2>
//             <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
//               Comprehensive suite of tools designed for modern HR teams. From recruitment to analytics, we've got you covered.
//             </p>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {features.map((feature, index) => (
//               <div 
//                 key={index}
//                 className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border border-gray-100"
//               >
//                 {/* Animated Background Gradient */}
//                 <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
//                 {/* Icon Container */}
//                 <div className={`relative inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
//                   {feature.icon}
//                 </div>
                
//                 <h3 className="text-2xl font-bold text-gray-900 mb-4 relative">
//                   {feature.title}
//                 </h3>
                
//                 <p className="text-gray-600 leading-relaxed mb-6">
//                   {feature.description}
//                 </p>
                
//                 <div className="flex items-center text-sm font-semibold text-gray-500 group-hover:text-purple-600 transition-colors cursor-pointer">
//                   Discover feature
//                   <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                   </svg>
//                 </div>

//                 {/* Hover Border Effect */}
//                 <div className={`absolute inset-0 rounded-3xl border-2 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`}></div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Testimonials Section - New Addition */}
//       <section className="py-24 bg-gray-900 text-white">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="text-center mb-16">
//             <h2 className="text-4xl md:text-5xl font-bold mb-6">
//               Trusted by <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Innovative Teams</span>
//             </h2>
//             <p className="text-xl text-gray-400 max-w-2xl mx-auto">
//               Join thousands of companies transforming their HR with our platform
//             </p>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//             {testimonials.map((testimonial, index) => (
//               <div key={index} className="bg-gray-800 rounded-2xl p-8 hover:bg-gray-750 transition-all duration-300 group">
//                 <div className="flex items-center mb-6">
//                   <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
//                     {testimonial.avatar}
//                   </div>
//                   <div className="ml-4">
//                     <div className="font-semibold text-white">{testimonial.name}</div>
//                     <div className="text-cyan-300 text-sm">{testimonial.role}</div>
//                   </div>
//                 </div>
//                 <p className="text-gray-300 leading-relaxed group-hover:text-white transition-colors">
//                   "{testimonial.content}"
//                 </p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Final CTA Section - Unique Design */}
//       <section className="relative py-24 bg-gradient-to-br from-purple-900 via-gray-900 to-cyan-900 text-white overflow-hidden">
//         {/* Animated Background */}
//         <div className="absolute inset-0">
//           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80')] opacity-10 bg-cover bg-center"></div>
//         </div>
        
//         <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
//           <h2 className="text-5xl md:text-6xl font-bold mb-8">
//             Ready to <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Transform</span> Your HR?
//           </h2>
//           <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
//             Join the revolution of AI-powered human resources. Start your journey today and see the difference.
//           </p>
          
//           <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
//             <Link
//               to="/contact"
//               className="group bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-12 py-5 rounded-2xl font-bold text-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25 flex items-center"
//             >
//               <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
//               </svg>
//               Get Started Now
//             </Link>
            
//             <Link
//               to="/pricing"
//               className="group border-2 border-gray-600 text-gray-300 px-12 py-5 rounded-2xl font-bold text-lg hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all duration-300 flex items-center backdrop-blur-sm"
//             >
//               Compare Plans
//               <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//               </svg>
//             </Link>
//           </div>
          
//           <p className="text-gray-400 text-sm mt-8">
//             🚀 No setup fees • 30-day money-back guarantee • Enterprise-grade security
//           </p>
//         </div>
//       </section>
//     </div>
//   )
// }

// export default Home 
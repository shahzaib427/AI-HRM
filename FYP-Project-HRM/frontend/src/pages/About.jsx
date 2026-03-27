import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  const [animatedStats, setAnimatedStats] = useState([0, 0, 0, 0]);
  const [isVisible, setIsVisible] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          teamStats.forEach((stat, index) => {
            const target = parseInt(stat.number);
            animateCount(index, target, 2000);
          });
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const animateCount = (index, target, duration) => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setAnimatedStats(prev => {
          const newStats = [...prev];
          newStats[index] = target;
          return newStats;
        });
        clearInterval(timer);
      } else {
        setAnimatedStats(prev => {
          const newStats = [...prev];
          newStats[index] = Math.floor(start);
          return newStats;
        });
      }
    }, 16);
  };

  const values = [
    {
      icon: "🚀",
      title: "Innovation First",
      description: "We constantly push boundaries with cutting-edge AI and machine learning technologies",
      gradient: "from-fuchsia-500 to-pink-600"
    },
    {
      icon: "🛡️",
      title: "Security & Trust",
      description: "Enterprise-grade security with end-to-end encryption and compliance certifications",
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      icon: "⭐",
      title: "Excellence",
      description: "We deliver exceptional user experiences with intuitive design and powerful features",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      icon: "🤝",
      title: "Partnership",
      description: "We work closely with our clients to understand and solve their unique challenges",
      gradient: "from-green-500 to-emerald-600"
    }
  ];

  const milestones = [
    { 
      year: "2020", 
      event: "Visionary Foundation", 
      description: "Started with a bold vision to transform HR tech with AI-first approach",
      icon: "🌱",
      color: "from-fuchsia-500 to-pink-500"
    },
    { 
      year: "2021", 
      event: "AI Breakthrough", 
      description: "Launched industry-first predictive analytics engine with NLP capabilities",
      icon: "🤖",
      color: "from-indigo-500 to-blue-500"
    },
    { 
      year: "2022", 
      event: "Enterprise Ascension", 
      description: "Scaled to serve Fortune 500 with enterprise-grade AI solutions",
      icon: "🏢",
      color: "from-amber-500 to-orange-500"
    },
    { 
      year: "2023", 
      event: "Global Expansion", 
      description: "Established presence across 3 continents with localized solutions",
      icon: "🌍",
      color: "from-green-500 to-emerald-500"
    },
    { 
      year: "2024", 
      event: "Future Platform", 
      description: "Unveiled next-gen neural network architecture with quantum-inspired computing",
      icon: "⚡",
      color: "from-purple-500 to-fuchsia-500"
    }
  ];

  const teamStats = [
    { number: "300", label: "Innovators", sublabel: "Global Talent Collective", icon: "👥" },
    { number: "50", label: "Countries", sublabel: "Worldwide Impact", icon: "🌎" },
    { number: "45", label: "PhD Experts", sublabel: "Research Excellence", icon: "🎓" },
    { number: "2500", label: "Years Experience", sublabel: "Collective Wisdom", icon: "💼" }
  ];

  const technologyStack = [
    { 
      name: "AI & Machine Learning", 
      description: "Advanced neural networks for predictive analytics", 
      icon: "🧠",
      technologies: ["TensorFlow", "PyTorch", "Scikit-learn"],
      gradient: "from-fuchsia-500 to-pink-500"
    },
    { 
      name: "Cloud Infrastructure", 
      description: "Scalable microservices on AWS & Azure", 
      icon: "☁️",
      technologies: ["Kubernetes", "Docker", "AWS Lambda"],
      gradient: "from-indigo-500 to-blue-500"
    },
    { 
      name: "Real-time Processing", 
      description: "Millisecond response times with event-driven architecture", 
      icon: "⚡",
      technologies: ["Apache Kafka", "Redis", "WebSockets"],
      gradient: "from-amber-500 to-orange-500"
    },
    { 
      name: "Security & Compliance", 
      description: "Enterprise-grade protection and certifications", 
      icon: "🔒",
      technologies: ["SOC 2", "GDPR", "End-to-End Encryption"],
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  const leadershipTeam = [
    {
      name: "Dr. Sarah Chen",
      role: "CEO & Founder",
      bio: "Former Google AI Research Lead with 15+ years in machine learning and HR tech",
      avatar: "SC",
      gradient: "from-fuchsia-500 to-pink-500",
      expertise: ["AI/ML", "Product Strategy", "Scaling Startups"]
    },
    {
      name: "Marcus Rodriguez",
      role: "CTO",
      bio: "Ex-Microsoft Principal Engineer specializing in cloud architecture and distributed systems",
      avatar: "MR",
      gradient: "from-indigo-500 to-blue-500",
      expertise: ["Cloud Infrastructure", "DevOps", "System Architecture"]
    },
    {
      name: "Priya Patel",
      role: "CPO",
      bio: "Former Head of Product at Salesforce with deep expertise in enterprise SaaS",
      avatar: "PP",
      gradient: "from-amber-500 to-orange-500",
      expertise: ["Product Management", "UX Research", "Enterprise Sales"]
    },
    {
      name: "James Wilson",
      role: "Chief AI Scientist",
      bio: "PhD in Computer Science from Stanford, focused on neural networks and NLP",
      avatar: "JW",
      gradient: "from-green-500 to-emerald-500",
      expertise: ["Deep Learning", "NLP", "Research & Development"]
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-900 text-white overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
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
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
          <div className="text-center">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 border border-white/20 mb-8 backdrop-blur-sm shadow-lg">
              <span className="w-2 h-2 bg-fuchsia-400 rounded-full mr-3 animate-pulse shadow-sm shadow-fuchsia-400"></span>
              <span className="text-fuchsia-200 text-sm font-semibold">🎯 PIONEERING HR AI SINCE 2020</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-amber-200 bg-clip-text text-transparent">
                Reimagining
              </span>
              <br />
              <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                Workforce
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                Intelligence
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-indigo-100 max-w-3xl mx-auto leading-relaxed font-light">
              We're architecting the future of human resources with neural network-powered AI that transforms how organizations engage, manage, and grow their most valuable asset - people.
            </p>

            {/* Quick Stats */}
            <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto mb-12">
              {teamStats.map((stat, index) => (
                <div key={index} className="text-center group cursor-pointer">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 text-amber-300">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">
                    {isVisible ? animatedStats[index] : 0}+
                  </div>
                  <div className="text-fuchsia-300 font-semibold text-lg">{stat.label}</div>
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
                <span>Start AI Transformation</span>
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

      {/* Mission & Vision */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        {/* Geometric Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(30deg,_transparent_49%,_#f0f_50%,_transparent_51%),_linear-gradient(-30deg,_transparent_49%,_#f0f_50%,_transparent_51%)] bg-[length:60px_60px]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Mission Card */}
            <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-700 hover:-translate-y-2 border border-white/20">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white p-4 rounded-2xl mr-4 text-2xl shadow-2xl">
                  🎯
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
              </div>
              
              <h3 className="text-4xl font-bold text-gray-900 mb-6">
                Empowering Organizations Through <span className="bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent">Intelligent HR AI</span>
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                We're on a mission to democratize enterprise-grade AI-powered HR solutions. 
                We believe every organization should have access to cutting-edge technology that enhances human potential.
              </p>
              
              <div className="bg-gradient-to-r from-fuchsia-50 to-pink-50 p-6 rounded-2xl border-l-4 border-fuchsia-500">
                <p className="text-fuchsia-800 font-semibold italic text-lg">
                  "To create exceptional employee experiences through innovative AI technology that makes HR smarter, faster, and fundamentally more human."
                </p>
              </div>
            </div>

            {/* Vision Card */}
            <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-700 hover:-translate-y-2 border border-white/20">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-4 rounded-2xl mr-4 text-2xl shadow-2xl">
                  🔮
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
              </div>
              
              <h3 className="text-4xl font-bold text-gray-900 mb-6">
                Shaping the Future of <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Digital Work</span>
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                We envision a world where HR technology anticipates needs and creates unprecedented 
                opportunities for growth, connection, and organizational excellence.
              </p>
              
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl border-l-4 border-indigo-500">
                <p className="text-indigo-800 font-semibold italic text-lg">
                  "To be the catalyst for workplace transformation where AI enhances human potential and drives meaningful impact."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1)_0%,_transparent_50%)]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Our Core <span className="bg-gradient-to-r from-fuchsia-300 via-amber-300 to-indigo-300 bg-clip-text text-transparent">Values</span>
            </h2>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
              The principles that guide every innovation and decision we make
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div 
                key={index}
                className="group relative bg-white/5 backdrop-blur-md rounded-3xl p-8 hover:bg-white/10 transition-all duration-500 border border-white/10 hover:border-white/20"
              >
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${value.gradient} text-white mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-2xl text-2xl`}>
                  {value.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  {value.title}
                </h3>
                
                <p className="text-indigo-100 leading-relaxed group-hover:text-white transition-colors">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_#000_1px,_transparent_0)] bg-[length:40px_40px]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Powered by <span className="bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">Cutting-Edge Technology</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our robust technology stack enables unparalleled performance and reliability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {technologyStack.map((tech, index) => (
              <div key={index} className="text-center group">
                <div className={`inline-flex p-6 rounded-3xl bg-gradient-to-r ${tech.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300 text-4xl shadow-2xl`}>
                  {tech.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{tech.name}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{tech.description}</p>
                
                <div className="space-y-2">
                  {tech.technologies.map((technology, techIndex) => (
                    <div key={techIndex} className="text-gray-700 text-sm bg-gray-100 rounded-lg px-3 py-2 hover:bg-gradient-to-r hover:from-gray-200 hover:to-gray-300 hover:text-gray-900 transition-all duration-200">
                      {technology}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 bg-gradient-to-br from-fuchsia-900 via-indigo-900 to-amber-900 text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80')] opacity-10 bg-cover bg-center"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Our <span className="bg-gradient-to-r from-fuchsia-300 via-amber-300 to-indigo-300 bg-clip-text text-transparent">Journey</span>
            </h2>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
              From startup to industry leader - our story of innovation and growth
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-fuchsia-400 via-indigo-400 to-amber-400 h-full rounded-full hidden lg:block" />
            
            <div className="space-y-12 lg:space-y-8">
              {milestones.map((milestone, index) => (
                <div 
                  key={index}
                  className={`relative flex flex-col lg:flex-row items-center ${
                    index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className={`w-full lg:w-1/2 ${index % 2 === 0 ? 'lg:pr-12' : 'lg:pl-12'} mb-8 lg:mb-0`}>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500 group">
                      <div className="flex items-start mb-4">
                        <div className={`text-4xl mr-4 bg-gradient-to-r ${milestone.color} bg-clip-text text-transparent`}>
                          {milestone.icon}
                        </div>
                        <div>
                          <div className="text-amber-300 font-bold text-lg">{milestone.year}</div>
                          <h3 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-fuchsia-300 group-hover:to-amber-300 group-hover:bg-clip-text transition-all duration-500">
                            {milestone.event}
                          </h3>
                        </div>
                      </div>
                      <p className="text-indigo-100 leading-relaxed group-hover:text-white transition-colors">
                        {milestone.description}
                      </p>
                    </div>
                  </div>

                  {/* Timeline dot */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-amber-400 rounded-full border-4 border-gray-900 z-10 hidden lg:block group-hover:scale-150 group-hover:bg-fuchsia-400 transition-all duration-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Meet Our <span className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">Leadership</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The visionary team driving innovation in HR technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {leadershipTeam.map((leader, index) => (
              <div key={index} className="text-center group">
                <div className={`w-24 h-24 bg-gradient-to-r ${leader.gradient} rounded-3xl flex items-center justify-center text-white font-bold text-2xl mb-6 mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                  {leader.avatar}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{leader.name}</h3>
                <div className="text-fuchsia-600 font-semibold mb-4">{leader.role}</div>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{leader.bio}</p>
                <div className="space-y-1">
                  {leader.expertise.map((skill, skillIndex) => (
                    <div key={skillIndex} className="text-gray-500 text-xs bg-gray-100 rounded-full px-3 py-1">
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-900 text-white overflow-hidden">
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
            Ready to <span className="bg-gradient-to-r from-fuchsia-300 via-amber-300 to-indigo-300 bg-clip-text text-transparent">Revolutionize</span> HR?
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
              to="/demo"
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
  );
};

export default About;
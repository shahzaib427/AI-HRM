import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('Form submitted:', formData)
    alert('Thank you for your message! We will get back to you soon.')
    setFormData({ name: '', email: '', company: '', message: '' })
    setIsSubmitting(false)
  }

  const contactMethods = [
    {
      icon: '📧',
      title: 'Email Us',
      details: ['info@hrmpro.com', 'support@hrmpro.com'],
      description: 'Send us an email anytime',
      gradient: 'from-fuchsia-500 to-pink-600'
    },
    {
      icon: '📞',
      title: 'Call Us',
      details: ['+1 (555) 123-4567', '+1 (555) 987-6543'],
      description: 'Mon-Fri from 9am to 6pm',
      gradient: 'from-indigo-500 to-blue-600'
    },
    {
      icon: '💬',
      title: 'Live Chat',
      details: ['Available 24/7', 'Instant support'],
      description: 'Get immediate assistance',
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      icon: '🏢',
      title: 'Visit Us',
      details: ['123 Business Street', 'City, State 12345'],
      description: 'Schedule an office visit',
      gradient: 'from-green-500 to-emerald-600'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-900 text-white overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-fuchsia-400/20 to-indigo-400/20 animate-float"
              style={{
                width: Math.random() * 60 + 20,
                height: Math.random() * 60 + 20,
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
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 border border-white/20 mb-8 backdrop-blur-sm shadow-lg">
              <span className="w-2 h-2 bg-fuchsia-400 rounded-full mr-3 animate-pulse shadow-sm shadow-fuchsia-400"></span>
              <span className="text-fuchsia-200 text-sm font-semibold">💬 LET'S TALK AI HR SOLUTIONS</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-amber-200 bg-clip-text text-transparent">
                Get In
              </span>
              <br />
              <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                Touch
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-indigo-100 max-w-3xl mx-auto leading-relaxed font-light">
              Ready to transform your HR operations? Let's discuss how our AI-powered solutions can drive your business forward.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        {/* Geometric Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(30deg,_transparent_49%,_#f0f_50%,_transparent_51%),_linear-gradient(-30deg,_transparent_49%,_#f0f_50%,_transparent_51%)] bg-[length:60px_60px]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Multiple Ways to
              <span className="block bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent mt-2">
                Connect
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Choose the most convenient way to reach out to our team
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {contactMethods.map((method, index) => (
              <div 
                key={index}
                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 border border-white/20 text-center"
              >
                {/* Animated Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${method.gradient} rounded-3xl opacity-0 group-hover:opacity-10 transition-all duration-500`}></div>
                
                {/* Icon Container */}
                <div className={`relative inline-flex p-4 rounded-2xl bg-gradient-to-r ${method.gradient} text-white mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-2xl text-2xl`}>
                  {method.icon}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">
                  {method.title}
                </h3>
                
                <div className="space-y-1 mb-3 relative z-10">
                  {method.details.map((detail, idx) => (
                    <p key={idx} className="text-gray-600 text-sm">{detail}</p>
                  ))}
                </div>
                
                <p className="text-gray-500 text-sm relative z-10">{method.description}</p>
              </div>
            ))}
          </div>

          {/* Contact Form & Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Let's Start a Conversation</h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  Whether you're looking to implement AI-powered HR solutions or have questions about our platform, 
                  we're here to help you every step of the way.
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-fuchsia-50 to-pink-50 rounded-2xl p-6 border border-fuchsia-100">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg">📍 Headquarters</h3>
                  <p className="text-gray-600 leading-relaxed">
                    123 Innovation Drive<br />
                    Suite 500<br />
                    San Francisco, CA 94105<br />
                    United States
                  </p>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg">🕒 Business Hours</h3>
                  <div className="space-y-2 text-gray-600">
                    <p>Monday - Friday: 9:00 AM - 6:00 PM PST</p>
                    <p>Saturday: 10:00 AM - 2:00 PM PST</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg">⚡ Quick Response</h3>
                  <p className="text-gray-600">
                    We typically respond to all inquiries within 2 business hours during our working days.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="relative">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Send us a Message</h2>
                <p className="text-gray-600 mb-8">Fill out the form below and we'll get back to you promptly</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                      placeholder="Enter your company name"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows="5"
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-300 bg-white/50 backdrop-blur-sm resize-none"
                      placeholder="Tell us about your HR challenges and how we can help..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white py-4 px-6 rounded-xl font-bold hover:from-fuchsia-600 hover:to-indigo-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-fuchsia-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-br from-fuchsia-900 via-indigo-900 to-amber-900 text-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80')] opacity-10 bg-cover bg-center"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to <span className="bg-gradient-to-r from-fuchsia-300 via-amber-300 to-indigo-300 bg-clip-text text-transparent">Transform</span> Your HR?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Schedule a personalized demo and see how our AI-powered platform can revolutionize your HR operations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/demo"
              className="group bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-fuchsia-600 hover:to-indigo-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-fuchsia-500/40 flex items-center relative overflow-hidden"
            >
              <span className="relative z-10">Schedule Demo</span>
              <svg className="w-5 h-5 ml-2 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            
            <a
              href="tel:+15551234567"
              className="group border-2 border-indigo-400/50 text-indigo-100 px-8 py-4 rounded-2xl font-bold text-lg hover:border-amber-300 hover:text-amber-300 hover:bg-amber-300/5 transition-all duration-300 flex items-center backdrop-blur-sm hover:shadow-lg hover:shadow-amber-300/20"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call Now
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Contact
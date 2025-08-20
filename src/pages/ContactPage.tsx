import React, { useState } from 'react'
import { Layout } from '../components/Layout'
import { Mail, MessageSquare, Send, CheckCircle } from 'lucide-react'

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you'd send this to your backend
    console.log('Contact form submitted:', formData)
    setSubmitted(true)
    setFormData({ name: '', email: '', subject: '', message: '' })
    
    // Reset success message after 5 seconds
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <Layout>
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Get In Touch
            </h1>
            <p className="text-xl text-gray-300">
              Have questions about CryptoJournal? We're here to help you succeed in your trading journey.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-emerald-500/20 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Email Support</h3>
                    <p className="text-gray-300">
                      Get help with your account, technical issues, or general questions.
                    </p>
                    <a 
                      href="mailto:support@cryptojournal.com"
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      aliahanch70@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-500/20 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Live Chat</h3>
                    <p className="text-gray-300">
                      Chat with our support team in real-time for immediate assistance.
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Available 9 AM - 6 PM EST</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-3">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-white font-medium">Is my trading data secure?</h4>
                    <p className="text-gray-400 text-sm">Yes, we use bank-level encryption to protect all your data.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Can I export my trading data?</h4>
                    <p className="text-gray-400 text-sm">Yes, you can export your data anytime in CSV format.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Is there a mobile app?</h4>
                    <p className="text-gray-400 text-sm">Our web app is fully responsive and works great on mobile devices.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-8 border border-gray-700/50">
                <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>

                {submitted && (
                  <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4 mb-6 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <span className="text-emerald-300 text-sm">
                      Thank you! We'll get back to you within 24 hours.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    >
                      <option value="">Select a topic</option>
                      <option value="general">General Question</option>
                      <option value="technical">Technical Support</option>
                      <option value="account">Account Issues</option>
                      <option value="feature">Feature Request</option>
                      <option value="billing">Billing Question</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Send className="h-5 w-5" />
                    <span>Send Message</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
/**
 * Landing Page Component
 * Marketing homepage with hero, features, and CTA
 */

import React, { useState } from 'react';
import {
  Box,
  Sparkles,
  Cpu,
  Download,
  Image,
  Code,
  Eye,
  ArrowRight,
  Check,
  Play,
  Star,
  Zap
} from 'lucide-react';
import AuthModal from './AuthModal';
import { useAuth } from './AuthContext';
import FAQ from './FAQ';

interface LandingPageProps {
  onStartApp: () => void;
  onShowPricing: () => void;
  onShowPrivacy?: () => void;
  onShowTerms?: () => void;
}

const FEATURES = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Natural Language Input',
    description: 'Describe your 3D model in plain English. No CAD experience required.'
  },
  {
    icon: <Image className="w-6 h-6" />,
    title: 'Image to 3D',
    description: 'Upload a photo and recreate it as a printable 3D model.'
  },
  {
    icon: <Cpu className="w-6 h-6" />,
    title: 'Multi-Agent AI',
    description: 'Powered by Gemini + Claude working together for better results.'
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: '3D Preview',
    description: 'View and rotate your model directly in the browser.'
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: 'OpenSCAD Export',
    description: 'Get parametric code you can edit and customize further.'
  },
  {
    icon: <Download className="w-6 h-6" />,
    title: 'STL Export',
    description: 'Download print-ready STL files for your 3D printer.'
  }
];

const TESTIMONIALS = [
  {
    name: 'Alex Chen',
    role: '3D Printing Hobbyist',
    content: 'PolyGen AI saved me hours of CAD work. I just describe what I need and get printable code.',
    avatar: 'AC'
  },
  {
    name: 'Sarah Miller',
    role: 'Product Designer',
    content: 'The image-to-3D feature is incredible. I can prototype physical products from sketches.',
    avatar: 'SM'
  },
  {
    name: 'James Park',
    role: 'Maker Space Owner',
    content: 'We use PolyGen AI to help beginners create their first 3D prints. Game changer.',
    avatar: 'JP'
  }
];

export default function LandingPage({ onStartApp, onShowPricing, onShowPrivacy, onShowTerms }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      onStartApp();
    } else {
      setAuthMode('signup');
      setShowAuth(true);
    }
  };

  const handleTryDemo = () => {
    // Allow users to try the app without signing in
    onStartApp();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-lg border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold">
              PolyGen <span className="text-violet-400">AI</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">
              Features
            </a>
            <button
              onClick={onShowPricing}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Pricing
            </button>
            <a href="#testimonials" className="text-gray-400 hover:text-white text-sm transition-colors">
              Testimonials
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={onStartApp}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Open App
              </button>
            ) : (
              <>
                <button
                  onClick={handleTryDemo}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Try Demo
                </button>
                <button
                  onClick={handleTryDemo}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            Powered by Multi-Agent AI
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Turn words into
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              {' '}3D models
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Describe what you want to create in plain English. PolyGen AI generates
            printable OpenSCAD code using advanced AI agents.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleTryDemo}
              className="group flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all"
            >
              Try Demo Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onShowPricing}
              className="flex items-center gap-2 px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-xl border border-white/[0.1] transition-colors"
            >
              View Pricing
            </button>
          </div>

          {/* Demo Preview - Example Output */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="aspect-video bg-white/[0.03] border border-white/[0.1] rounded-2xl overflow-hidden p-8">
              <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-2">Example prompt:</p>
                  <p className="text-white text-lg">"A desk organizer with 3 pen slots and a phone stand"</p>
                </div>
                <div className="flex items-center gap-2 text-violet-400">
                  <Sparkles className="w-5 h-5" />
                  <span>AI generates OpenSCAD code in seconds</span>
                </div>
                <button
                  onClick={handleTryDemo}
                  className="group flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all"
                >
                  Try It Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to create</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              From natural language to 3D-printable models in seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Three simple steps from idea to printable model.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Describe', desc: 'Tell the AI what you want to create in plain English or upload an image.' },
              { step: '2', title: 'Generate', desc: 'Our multi-agent AI creates optimized OpenSCAD code for your design.' },
              { step: '3', title: 'Export', desc: 'Preview in 3D, download the code, or export directly to STL for printing.' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Loved by makers</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              See what our users are saying about PolyGen AI.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 font-medium text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{testimonial.name}</div>
                    <div className="text-gray-500 text-xs">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to start creating?
          </h2>
          <p className="text-gray-400 mb-8">
            Join thousands of makers using PolyGen AI to bring their ideas to life.
          </p>
          <button
            onClick={handleTryDemo}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all text-lg"
          >
            Try Demo Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-4 text-gray-500 text-sm">
            No account required. Try it now.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-400">
              PolyGen AI - Text to 3D Models
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <button onClick={onShowPrivacy} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={onShowTerms} className="hover:text-white transition-colors">Terms</button>
            <a href="mailto:support@polygenai.com" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        defaultMode={authMode}
      />
    </div>
  );
}

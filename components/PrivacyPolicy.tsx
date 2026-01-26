/**
 * Privacy Policy Page
 * Required for SaaS legal compliance
 */

import React from 'react';
import { ArrowLeft, Shield, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#09090b]/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-violet-400" />
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>

        <p className="text-gray-400 mb-8">Last updated: January 24, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              PolyGen AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered 3D model generation service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-white mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Account information (email address, name)</li>
              <li>Payment information (processed securely by Stripe)</li>
              <li>Text prompts and descriptions you submit for 3D generation</li>
              <li>Images you upload for image-to-3D conversion</li>
              <li>Communication with our support team</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Device information (browser type, operating system)</li>
              <li>Usage data (features used, generation counts)</li>
              <li>Log data (IP address, access times, pages viewed)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your 3D model generation requests</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Analyze usage patterns to improve our AI models</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Data Processing and AI</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Your prompts and images are processed by our AI system (using Gemini and Claude) to generate 3D models. We may use anonymized and aggregated data to improve our AI models. Your personal prompts and designs are never shared publicly or used to train AI models without your explicit consent.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Generated OpenSCAD code is processed in your browser using WebAssembly (WASM), meaning your designs stay on your device during preview rendering.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Data Sharing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Service Providers:</strong> Stripe (payments), Supabase (database), Vercel (hosting), Google/Anthropic (AI processing)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your account information for as long as your account is active. Generated model history is retained for 90 days by default. You can request deletion of your data at any time. Payment records are retained as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              To exercise these rights, contact us at privacy@polygenai.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Security</h2>
            <p className="text-gray-300 leading-relaxed">
              We implement industry-standard security measures including encryption in transit (TLS), encryption at rest, secure authentication, and regular security audits. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              We use essential cookies for authentication and session management. We use analytics cookies (Google Analytics) to understand usage patterns. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. International Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Your data may be transferred to and processed in the United States and other countries. We ensure appropriate safeguards are in place for international transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by email or through our service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <div className="flex items-center gap-2 text-violet-400">
              <Mail className="w-4 h-4" />
              <a href="mailto:privacy@polygenai.com" className="hover:underline">privacy@polygenai.com</a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

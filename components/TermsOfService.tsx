/**
 * Terms of Service Page
 * Required for SaaS legal compliance
 */

import React from 'react';
import { ArrowLeft, FileText, Mail } from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
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
          <FileText className="w-8 h-8 text-violet-400" />
          <h1 className="text-3xl font-bold">Terms of Service</h1>
        </div>

        <p className="text-gray-400 mb-8">Last updated: January 24, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using PolyGen AI ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. We may modify these Terms at any time, and your continued use constitutes acceptance of modifications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-300 leading-relaxed">
              PolyGen AI is an AI-powered platform that converts text descriptions and images into 3D models. The Service generates OpenSCAD code and allows export to STL format for 3D printing. The Service is provided "as is" and "as available."
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You are responsible for all activities under your account</li>
              <li>You must notify us immediately of any unauthorized use</li>
              <li>You must be at least 13 years old to use the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Subscription and Payments</h2>
            <h3 className="text-lg font-medium text-white mt-4 mb-2">4.1 Plans</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Free:</strong> 5 generations per month, basic features</li>
              <li><strong>Pro ($19/month):</strong> 100 generations per month, all features</li>
              <li><strong>Enterprise ($99/month):</strong> Unlimited generations, API access, team features</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">4.2 Billing</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Subscriptions are billed monthly or annually in advance</li>
              <li>Payments are processed securely by Stripe</li>
              <li>Prices may change with 30 days notice</li>
              <li>Unused generations do not roll over to the next month</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">4.3 Cancellation and Refunds</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>You may cancel your subscription at any time</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>No refunds for partial months or unused generations</li>
              <li>Annual subscriptions may be eligible for prorated refunds</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Acceptable Use</h2>
            <p className="text-gray-300 leading-relaxed mb-4">You agree NOT to use the Service to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Generate content that is illegal, harmful, or violates third-party rights</li>
              <li>Create weapons, weapon components, or dangerous items</li>
              <li>Generate content that infringes copyrights, trademarks, or patents</li>
              <li>Attempt to reverse engineer or bypass usage limits</li>
              <li>Share account credentials or resell access</li>
              <li>Use automated scripts to abuse the Service</li>
              <li>Interfere with the Service's operation or security</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Intellectual Property</h2>
            <h3 className="text-lg font-medium text-white mt-4 mb-2">6.1 Your Content</h3>
            <p className="text-gray-300 leading-relaxed">
              You retain ownership of your prompts, uploaded images, and the 3D models generated for you. You grant us a limited license to process your content to provide the Service.
            </p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">6.2 Our Content</h3>
            <p className="text-gray-300 leading-relaxed">
              The Service, including its design, code, AI models, and documentation, is owned by PolyGen AI and protected by intellectual property laws. The OpenSCAD code generated is licensed to you for personal and commercial use.
            </p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">6.3 Commercial Use</h3>
            <p className="text-gray-300 leading-relaxed">
              Pro and Enterprise users may use generated models for commercial purposes. Free tier users may use models for personal, non-commercial purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. AI-Generated Content</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>AI-generated models may not be perfect or suitable for all purposes</li>
              <li>You are responsible for reviewing and testing generated models before use</li>
              <li>We do not guarantee structural integrity or safety of printed models</li>
              <li>Generated code uses the BOSL2 library under its respective license</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-gray-300 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, POLYGEN AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Indemnification</h2>
            <p className="text-gray-300 leading-relaxed">
              You agree to indemnify and hold harmless PolyGen AI, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service, violation of these Terms, or infringement of third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Termination</h2>
            <p className="text-gray-300 leading-relaxed">
              We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason with or without notice. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination shall survive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Delaware.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. Dispute Resolution</h2>
            <p className="text-gray-300 leading-relaxed">
              Before filing a claim, you agree to contact us to attempt informal resolution. Any disputes that cannot be resolved informally shall be resolved through binding arbitration under the rules of the American Arbitration Association.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">14. Severability</h2>
            <p className="text-gray-300 leading-relaxed">
              If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">15. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="flex items-center gap-2 text-violet-400">
              <Mail className="w-4 h-4" />
              <a href="mailto:legal@polygenai.com" className="hover:underline">legal@polygenai.com</a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

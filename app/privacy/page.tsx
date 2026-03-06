"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, ChevronRight, ArrowUp, ExternalLink, Lock } from "lucide-react";

const LAST_UPDATED = "March 1, 2026";

const SECTIONS = [
  { id: "overview",       title: "Overview" },
  { id: "information",    title: "Information We Collect" },
  { id: "how-we-use",     title: "How We Use Your Information" },
  { id: "sharing",        title: "Information Sharing" },
  { id: "storage",        title: "Data Storage & Security" },
  { id: "cookies",        title: "Cookies & Tracking" },
  { id: "retention",      title: "Data Retention" },
  { id: "rights",         title: "Your Rights" },
  { id: "children",       title: "Children's Privacy" },
  { id: "third-party",    title: "Third-Party Services" },
  { id: "transfers",      title: "International Transfers" },
  { id: "changes",        title: "Changes to This Policy" },
  { id: "contact",        title: "Contact Us" },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      const sections = SECTIONS.map(s => document.getElementById(s.id));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i];
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#0c4a6e] font-bold text-base">
            <div className="w-7 h-7 bg-[#0284c7] rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            SkillBridge
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/terms" className="text-gray-500 hover:text-[#0284c7] transition font-medium">Terms of Service</Link>
            <Link href="/contact" className="text-gray-500 hover:text-[#0284c7] transition font-medium">Contact</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0c4a6e] to-[#0369a1] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 text-blue-200 text-sm font-medium mb-4">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white">Privacy Policy</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Privacy Policy</h1>
            </div>
            <p className="text-blue-100 text-base max-w-xl leading-relaxed">
              Your privacy matters to us. This policy explains what data we collect, how we use it, and the rights you have over your personal information.
            </p>
            <p className="text-blue-200 text-sm mt-4">Last updated: {LAST_UPDATED}</p>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex gap-10">

          {/* Sticky sidebar */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-24">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Contents</p>
              <nav className="space-y-0.5">
                {SECTIONS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                      activeSection === s.id
                        ? "bg-[#e0f2fe] text-[#0284c7] font-semibold"
                        : "text-gray-500 hover:text-[#0c4a6e] hover:bg-gray-50"
                    }`}
                  >
                    <span className={`text-[10px] font-bold w-4 shrink-0 ${activeSection === s.id ? "text-[#0284c7]" : "text-gray-300"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate">{s.title}</span>
                  </button>
                ))}
              </nav>

              {/* Trust badge */}
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">Data Protected</span>
                </div>
                <p className="text-[11px] text-emerald-600 leading-relaxed">We never sell your personal data to third parties.</p>
              </div>
            </div>
          </aside>

          {/* Content */}
          <article className="flex-1 min-w-0">
            <div className="space-y-10">

              <Section id="overview" title="1. Overview">
                <p>SkillBridge Technologies Ltd. ("SkillBridge", "we", "our", "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at skillbridge.ng and our related mobile applications (collectively, the "Platform").</p>
                <p>This Policy applies to all users of the Platform — clients who book services and workers who provide them. By using our Platform, you consent to the data practices described in this Policy. If you do not agree with these practices, please do not use the Platform.</p>
                <p>We are registered with the Nigeria Data Protection Commission (NDPC) and comply with the Nigeria Data Protection Act 2023 (NDPA) and all applicable data protection legislation.</p>
              </Section>

              <Section id="information" title="2. Information We Collect">
                <p>We collect several categories of information to provide and improve our services:</p>

                <h3>2.1 Information You Provide Directly</h3>
                <ul>
                  <li><strong>Account Information:</strong> Name, email address, phone number, password, and profile photo when you register</li>
                  <li><strong>Profile Data:</strong> Skills, experience, location, bio, and service rates (for Workers); address and service preferences (for Clients)</li>
                  <li><strong>Identity Verification:</strong> Government-issued ID (NIN, Driver's Licence, International Passport) and a selfie photo for Worker verification</li>
                  <li><strong>Financial Information:</strong> Bank account name, number, and bank name for withdrawal processing. We do not store full card details</li>
                  <li><strong>Job Information:</strong> Service requests, job descriptions, addresses, and scheduling preferences</li>
                  <li><strong>Communications:</strong> Messages sent through the Platform chat system, dispute descriptions, and support tickets</li>
                  <li><strong>Reviews and Ratings:</strong> Feedback you submit about Workers or jobs</li>
                </ul>

                <h3>2.2 Information Collected Automatically</h3>
                <ul>
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent, and actions taken on the Platform</li>
                  <li><strong>Device Information:</strong> Device type, operating system, browser type, and unique device identifiers</li>
                  <li><strong>Location Data:</strong> Approximate location (city/region) based on IP address; precise location only if you grant permission</li>
                  <li><strong>Log Data:</strong> IP address, access timestamps, error logs, and referring URLs</li>
                </ul>

                <h3>2.3 Information from Third Parties</h3>
                <ul>
                  <li>Payment processors (transaction status and references — not full card data)</li>
                  <li>Identity verification services (verification status only)</li>
                  <li>Social sign-in providers if you choose to register via Google or similar</li>
                </ul>
              </Section>

              <Section id="how-we-use" title="3. How We Use Your Information">
                <p>We use your information for the following purposes, always with a lawful basis under the NDPA:</p>
                <ul>
                  <li><strong>Platform Operation:</strong> To create and manage your account, process bookings, and facilitate service delivery</li>
                  <li><strong>Payments:</strong> To process transactions, hold escrow funds, release payments, and process withdrawals</li>
                  <li><strong>Identity Verification:</strong> To verify Worker identities and ensure platform safety</li>
                  <li><strong>Communication:</strong> To send booking confirmations, notifications, receipts, and platform updates</li>
                  <li><strong>Safety & Trust:</strong> To detect fraud, investigate disputes, enforce our Terms of Service, and protect users</li>
                  <li><strong>Customer Support:</strong> To respond to your queries, complaints, and support tickets</li>
                  <li><strong>Platform Improvement:</strong> To analyse usage patterns, fix bugs, and develop new features</li>
                  <li><strong>Legal Compliance:</strong> To comply with applicable Nigerian laws and regulatory requirements</li>
                  <li><strong>Marketing:</strong> To send relevant promotions and updates — only with your consent, and you can opt out at any time</li>
                </ul>
              </Section>

              <Section id="sharing" title="4. Information Sharing">
                <p>We do not sell your personal data. We share information only in the following circumstances:</p>
                <ul>
                  <li><strong>Between Users:</strong> When a job is booked, relevant profile information (name, photo, rating) is shared between the Client and Worker to facilitate the service</li>
                  <li><strong>Payment Processors:</strong> We share necessary transaction data with payment partners (e.g., Paystack, Flutterwave) to process payments securely</li>
                  <li><strong>Identity Verification Partners:</strong> Worker ID documents are shared with our verification service provider solely for the purpose of identity checks</li>
                  <li><strong>Cloud Infrastructure:</strong> Our platform runs on Google Firebase (Google Cloud), which processes data on our behalf under strict data processing agreements</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information to comply with a court order, legal process, or request from a Nigerian law enforcement or regulatory authority</li>
                  <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred — you will be notified in advance</li>
                  <li><strong>Safety:</strong> We may share information where we believe in good faith that disclosure is necessary to prevent imminent harm or illegal activity</li>
                </ul>
                <p>All third-party service providers are contractually required to handle your data securely and only for the purposes we specify.</p>
              </Section>

              <Section id="storage" title="5. Data Storage & Security">
                <p>Your data is stored on Google Firebase servers, which are ISO 27001 certified and comply with international security standards. We implement multiple layers of security including:</p>
                <ul>
                  <li>End-to-end encryption for all data in transit (TLS/SSL)</li>
                  <li>Encryption at rest for sensitive data including payment information and ID documents</li>
                  <li>Role-based access controls — only authorised personnel can access user data</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Firebase Security Rules restricting data access to authorised users only</li>
                  <li>Two-factor authentication for admin accounts</li>
                </ul>
                <p>While we take reasonable measures to protect your data, no system is completely immune to security breaches. In the event of a data breach that poses a risk to your rights, we will notify affected users and the NDPC within 72 hours as required by law.</p>
              </Section>

              <Section id="cookies" title="6. Cookies & Tracking">
                <p>We use cookies and similar tracking technologies to improve your experience on the Platform. Types of cookies we use:</p>
                <ul>
                  <li><strong>Essential Cookies:</strong> Required for the Platform to function — authentication, session management, and security</li>
                  <li><strong>Functional Cookies:</strong> Remember your preferences such as language and notification settings</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the Platform (via Google Analytics or similar). Data is anonymised where possible</li>
                  <li><strong>Marketing Cookies:</strong> Only used with your consent to show relevant promotions</li>
                </ul>
                <p>You can control cookies through your browser settings. Disabling essential cookies may affect Platform functionality. We honour "Do Not Track" browser signals where technically feasible.</p>
              </Section>

              <Section id="retention" title="7. Data Retention">
                <p>We retain your personal information for as long as necessary to provide our services and comply with legal obligations:</p>
                <ul>
                  <li><strong>Active Accounts:</strong> Data is retained for the duration of your account</li>
                  <li><strong>Closed Accounts:</strong> Core account data is retained for 5 years after closure for legal and dispute purposes</li>
                  <li><strong>Transaction Records:</strong> Payment and booking records are kept for 7 years to comply with Nigerian financial regulations</li>
                  <li><strong>Identity Documents:</strong> Worker ID documents are retained for 2 years after account closure</li>
                  <li><strong>Chat Messages:</strong> Platform messages are retained for 2 years</li>
                  <li><strong>Analytics Data:</strong> Anonymised usage data may be retained indefinitely</li>
                </ul>
                <p>When data is no longer required, it is securely deleted or anonymised.</p>
              </Section>

              <Section id="rights" title="8. Your Rights">
                <p>Under the Nigeria Data Protection Act 2023, you have the following rights regarding your personal data:</p>
                <ul>
                  <li><strong>Right of Access:</strong> Request a copy of the personal data we hold about you</li>
                  <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                  <li><strong>Right to Erasure:</strong> Request deletion of your data (subject to legal retention obligations)</li>
                  <li><strong>Right to Restriction:</strong> Request that we limit how we process your data in certain circumstances</li>
                  <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                  <li><strong>Right to Object:</strong> Object to processing based on legitimate interests, including direct marketing</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for processing activities that rely on consent</li>
                </ul>
                <p>To exercise any of these rights, contact us at <a href="mailto:privacy@skillbridge.ng">privacy@skillbridge.ng</a>. We will respond within 30 days. You may also lodge a complaint with the Nigeria Data Protection Commission (NDPC) at <a href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer">ndpc.gov.ng</a>.</p>
              </Section>

              <Section id="children" title="9. Children's Privacy">
                <p>SkillBridge is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected information from a child, please contact us immediately at <a href="mailto:privacy@skillbridge.ng">privacy@skillbridge.ng</a> and we will delete that information promptly.</p>
                <p>Parents or guardians who believe their child's data has been collected should contact us without delay.</p>
              </Section>

              <Section id="third-party" title="10. Third-Party Services">
                <p>Our Platform integrates with the following third-party services, each with their own privacy policies:</p>
                <ul>
                  <li><strong>Google Firebase:</strong> Database, authentication, and cloud infrastructure — <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Firebase Privacy</a></li>
                  <li><strong>Paystack / Flutterwave:</strong> Payment processing — subject to their respective privacy policies</li>
                  <li><strong>Google Analytics:</strong> Platform usage analytics (anonymised)</li>
                </ul>
                <p>We are not responsible for the privacy practices of third-party services. We encourage you to review their privacy policies. Links to external websites from our Platform do not constitute endorsement of their privacy practices.</p>
              </Section>

              <Section id="transfers" title="11. International Data Transfers">
                <p>Your data is primarily stored and processed in data centres within or accessible from Nigeria via Google Cloud's infrastructure. Some of our third-party service providers may process data outside Nigeria.</p>
                <p>When we transfer data internationally, we ensure appropriate safeguards are in place, including standard contractual clauses and data processing agreements that meet the standards of the Nigeria Data Protection Act 2023.</p>
              </Section>

              <Section id="changes" title="12. Changes to This Policy">
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other operational reasons. When we make material changes, we will:</p>
                <ul>
                  <li>Update the "Last Updated" date at the top of this page</li>
                  <li>Notify registered users via email or in-app notification at least 14 days before changes take effect</li>
                  <li>For significant changes, request renewed consent where required by law</li>
                </ul>
                <p>We encourage you to review this Policy periodically. Your continued use of the Platform after changes are posted constitutes acceptance of the updated Policy.</p>
              </Section>

              <Section id="contact" title="13. Contact Us">
                <p>If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please reach out to our Data Protection Officer:</p>
                <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-4 mt-3 space-y-2 not-prose">
                  <p className="text-sm font-bold text-[#0c4a6e]">Data Protection Officer — SkillBridge Technologies Ltd.</p>
                  <p className="text-sm text-gray-600">📧 <a href="mailto:privacy@skillbridge.ng" className="text-[#0284c7] hover:underline">privacy@skillbridge.ng</a></p>
                  <p className="text-sm text-gray-600">📞 <a href="tel:+2348000000000" className="text-[#0284c7] hover:underline">+234 800 000 0000</a></p>
                  <p className="text-sm text-gray-600">🏢 Lagos, Nigeria</p>
                  <div className="pt-2 border-t border-blue-100 mt-2">
                    <p className="text-xs text-gray-500">To file a complaint with the regulator:</p>
                    <a href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer"
                      className="text-sm text-[#0284c7] hover:underline font-medium inline-flex items-center gap-1 mt-1">
                      Nigeria Data Protection Commission (NDPC) <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </Section>

              {/* Footer note */}
              <div className="border-t border-gray-100 pt-8 pb-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  This Privacy Policy was last updated on <strong>{LAST_UPDATED}</strong>. SkillBridge Technologies Ltd. is committed to protecting your privacy and complying with the Nigeria Data Protection Act 2023.
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <Link href="/terms" className="text-sm text-[#0284c7] hover:underline font-medium inline-flex items-center gap-1">
                    Terms of Service <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/contact" className="text-sm text-[#0284c7] hover:underline font-medium inline-flex items-center gap-1">
                    Contact Support <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </article>
        </div>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 w-10 h-10 bg-[#0284c7] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#0369a1] transition z-50"
        >
          <ArrowUp className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}

// ─── Section component ─────────────────────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="scroll-mt-24"
    >
      <h2 className="text-lg font-bold text-[#0c4a6e] mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:list-disc [&_li]:text-gray-600 [&_strong]:text-[#0c4a6e] [&_strong]:font-semibold [&_a]:text-[#0284c7] [&_a]:hover:underline [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-[#0c4a6e] [&_h3]:mt-4 [&_h3]:mb-2">
        {children}
      </div>
    </motion.section>
  );
}
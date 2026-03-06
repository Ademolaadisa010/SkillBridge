"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, ChevronRight, ArrowUp, ExternalLink } from "lucide-react";

const LAST_UPDATED = "March 1, 2026";

const SECTIONS = [
  { id: "acceptance",     title: "Acceptance of Terms" },
  { id: "description",    title: "Description of Service" },
  { id: "eligibility",    title: "Eligibility" },
  { id: "accounts",       title: "User Accounts" },
  { id: "clients",        title: "Client Responsibilities" },
  { id: "workers",        title: "Worker Responsibilities" },
  { id: "payments",       title: "Payments & Escrow" },
  { id: "disputes",       title: "Disputes & Refunds" },
  { id: "prohibited",     title: "Prohibited Conduct" },
  { id: "intellectual",   title: "Intellectual Property" },
  { id: "liability",      title: "Limitation of Liability" },
  { id: "termination",    title: "Termination" },
  { id: "governing",      title: "Governing Law" },
  { id: "changes",        title: "Changes to Terms" },
  { id: "contact",        title: "Contact Us" },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState("acceptance");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);

      // Highlight active section based on scroll
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
            <Link href="/privacy" className="text-gray-500 hover:text-[#0284c7] transition font-medium">Privacy Policy</Link>
            <Link href="/contact" className="text-gray-500 hover:text-[#0284c7] transition font-medium">Contact</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0c4a6e] to-[#0284c7] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 text-blue-200 text-sm font-medium mb-4">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white">Terms of Service</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">Terms of Service</h1>
            <p className="text-blue-100 text-base max-w-xl leading-relaxed">
              Please read these terms carefully before using SkillBridge. By accessing our platform, you agree to be bound by these terms.
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
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition group ${
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
            </div>
          </aside>

          {/* Content */}
          <article ref={contentRef} className="flex-1 min-w-0 prose-custom">
            <div className="space-y-10">

              <Section id="acceptance" title="1. Acceptance of Terms">
                <p>By accessing or using the SkillBridge platform ("Platform", "we", "us", or "our"), available at skillbridge.ng and related mobile applications, you ("User", "you") agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the Platform.</p>
                <p>These Terms constitute a legally binding agreement between you and SkillBridge Technologies Ltd., a company incorporated under the laws of the Federal Republic of Nigeria. Your continued use of the Platform following any changes to these Terms constitutes your acceptance of those changes.</p>
              </Section>

              <Section id="description" title="2. Description of Service">
                <p>SkillBridge is an online marketplace that connects clients seeking home services with skilled independent workers ("Workers"). Our platform facilitates the discovery, booking, payment, and review of home services including but not limited to:</p>
                <ul>
                  <li>Plumbing, electrical work, and general repairs</li>
                  <li>Cleaning, laundry, and home maintenance</li>
                  <li>Carpentry, painting, and renovation</li>
                  <li>Appliance repair and installation</li>
                  <li>Landscaping and outdoor services</li>
                </ul>
                <p>SkillBridge acts solely as an intermediary marketplace. We do not employ Workers and are not responsible for the quality, safety, legality, or delivery of services. Workers are independent contractors responsible for their own work.</p>
              </Section>

              <Section id="eligibility" title="3. Eligibility">
                <p>To use SkillBridge, you must:</p>
                <ul>
                  <li>Be at least 18 years of age</li>
                  <li>Be a resident of Nigeria or have a valid Nigerian address for service delivery</li>
                  <li>Have the legal capacity to enter into a binding contract</li>
                  <li>Not be barred from using our services under applicable law</li>
                  <li>Provide accurate and truthful information during registration</li>
                </ul>
                <p>We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion, particularly where we reasonably believe a user is in violation of these Terms.</p>
              </Section>

              <Section id="accounts" title="4. User Accounts">
                <p>To access most features of SkillBridge, you must create an account. When registering, you agree to:</p>
                <ul>
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorised use of your account</li>
                </ul>
                <p>You may not create more than one account per person. Account sharing is prohibited. SkillBridge reserves the right to suspend or terminate accounts that violate these Terms.</p>
              </Section>

              <Section id="clients" title="5. Client Responsibilities">
                <p>As a client using SkillBridge to hire Workers, you agree to:</p>
                <ul>
                  <li>Provide accurate descriptions of the work required when posting jobs</li>
                  <li>Ensure a safe working environment for Workers on your property</li>
                  <li>Be present or arrange access for the Worker at the agreed time</li>
                  <li>Pay for all services rendered in good faith through the Platform</li>
                  <li>Communicate through the Platform for all service-related matters</li>
                  <li>Leave honest and fair reviews following job completion</li>
                  <li>Not attempt to hire Workers directly outside the Platform to circumvent fees</li>
                </ul>
                <p>Clients are responsible for obtaining any permits or approvals required for work on their property. SkillBridge is not liable for issues arising from work done without proper authorisation.</p>
              </Section>

              <Section id="workers" title="6. Worker Responsibilities">
                <p>As a Worker on SkillBridge, you agree to:</p>
                <ul>
                  <li>Provide services with reasonable care, skill, and diligence</li>
                  <li>Maintain all licences, certifications, and insurance required for your trade</li>
                  <li>Arrive on time and communicate promptly with clients</li>
                  <li>Complete jobs to the standard agreed with the client</li>
                  <li>Only accept jobs you are qualified and equipped to complete</li>
                  <li>Submit valid identity documents for verification</li>
                  <li>Not solicit clients to pay outside the Platform</li>
                  <li>Report any safety hazards or unsafe working conditions before starting</li>
                </ul>
                <p>Workers acknowledge they are independent contractors and not employees of SkillBridge. Workers are responsible for their own taxes, insurance, and compliance with applicable employment and trade laws.</p>
              </Section>

              <Section id="payments" title="7. Payments & Escrow">
                <p>SkillBridge operates an escrow-based payment system to protect both clients and workers:</p>
                <ul>
                  <li><strong>Payment on Booking:</strong> Clients must pay in full when accepting a Worker's offer. Funds are held in escrow by SkillBridge.</li>
                  <li><strong>Escrow Hold:</strong> Payment is held securely until the job is marked complete and the dispute window has passed.</li>
                  <li><strong>Release:</strong> Funds are released to the Worker's SkillBridge wallet upon successful job completion, or automatically after {7} days if no dispute is raised.</li>
                  <li><strong>Platform Fee:</strong> SkillBridge deducts a service fee from each transaction. Current fees are displayed at the time of booking.</li>
                  <li><strong>Withdrawals:</strong> Workers may withdraw earned funds to their Nigerian bank account. Processing takes 1–3 business days. Minimum withdrawal amount applies.</li>
                </ul>
                <p>All transactions are processed in Nigerian Naira (₦). SkillBridge uses secure third-party payment processors. We do not store card details on our servers.</p>
              </Section>

              <Section id="disputes" title="8. Disputes & Refunds">
                <p>If a client is unsatisfied with completed work, the following process applies:</p>
                <ul>
                  <li>Disputes must be raised within 7 days of the job being marked complete</li>
                  <li>Clients should first attempt to resolve the issue directly with the Worker via the Platform chat</li>
                  <li>If unresolved, a formal dispute can be filed through the Disputes section with supporting evidence</li>
                  <li>SkillBridge's admin team will review the dispute and make a final decision within 5–10 business days</li>
                  <li>Decisions may result in a full refund to the client, partial refund, or release of payment to the Worker</li>
                </ul>
                <p>SkillBridge's dispute resolution decision is final. Refunds, where approved, will be processed within 5–10 business days. SkillBridge reserves the right to suspend accounts found to be abusing the dispute system.</p>
              </Section>

              <Section id="prohibited" title="9. Prohibited Conduct">
                <p>You agree not to use SkillBridge to:</p>
                <ul>
                  <li>Post false, misleading, or fraudulent information</li>
                  <li>Harass, threaten, or discriminate against any user</li>
                  <li>Solicit or accept payments outside the Platform</li>
                  <li>Create fake reviews or manipulate the rating system</li>
                  <li>Use automated bots, scrapers, or data harvesting tools</li>
                  <li>Attempt to hack, disable, or interfere with Platform security</li>
                  <li>Engage in money laundering or any illegal financial activity</li>
                  <li>Use the Platform for any purpose other than legitimate service bookings</li>
                  <li>Impersonate another user, Worker, or SkillBridge staff member</li>
                </ul>
                <p>Violations may result in immediate account suspension, forfeiture of wallet balance, and referral to relevant authorities where required by law.</p>
              </Section>

              <Section id="intellectual" title="10. Intellectual Property">
                <p>All content on the SkillBridge Platform — including but not limited to logos, design, text, graphics, software, and data compilations — is the exclusive property of SkillBridge Technologies Ltd. and is protected by Nigerian and international intellectual property laws.</p>
                <p>You are granted a limited, non-exclusive, non-transferable licence to access and use the Platform solely for its intended purpose. You may not copy, reproduce, distribute, or create derivative works from any Platform content without our prior written consent.</p>
                <p>By submitting content to the Platform (including reviews, profile information, and job descriptions), you grant SkillBridge a worldwide, royalty-free licence to use, display, and distribute that content in connection with our services.</p>
              </Section>

              <Section id="liability" title="11. Limitation of Liability">
                <p>To the fullest extent permitted by Nigerian law, SkillBridge shall not be liable for:</p>
                <ul>
                  <li>Any indirect, incidental, special, or consequential damages</li>
                  <li>Loss of profits, data, goodwill, or business opportunities</li>
                  <li>Damages arising from the conduct of Workers or Clients</li>
                  <li>Property damage or personal injury resulting from services rendered</li>
                  <li>Platform downtime, data loss, or technical failures</li>
                </ul>
                <p>Our total liability to you for any claim arising from use of the Platform shall not exceed the total amount paid by you to SkillBridge in the 3 months preceding the claim.</p>
                <p>Nothing in these Terms excludes liability for fraud, death, or personal injury caused by gross negligence, where such exclusion is prohibited by law.</p>
              </Section>

              <Section id="termination" title="12. Termination">
                <p>Either party may terminate the relationship under these Terms at any time:</p>
                <ul>
                  <li><strong>By You:</strong> You may close your account at any time from your account settings. Pending transactions must be resolved before closure.</li>
                  <li><strong>By SkillBridge:</strong> We may suspend or terminate your account immediately if we determine, in our sole discretion, that you have violated these Terms, engaged in fraudulent activity, or pose a risk to other users or the Platform.</li>
                </ul>
                <p>Upon termination, your right to use the Platform ceases immediately. Any outstanding wallet balance will be paid out to your registered bank account within 14 business days, less any amounts owed to SkillBridge or subject to dispute.</p>
              </Section>

              <Section id="governing" title="13. Governing Law">
                <p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.</p>
                <p>Before initiating formal legal proceedings, both parties agree to attempt good-faith resolution through negotiation or mediation for a period of 30 days.</p>
              </Section>

              <Section id="changes" title="14. Changes to Terms">
                <p>SkillBridge reserves the right to modify these Terms at any time. We will notify registered users of material changes via email or an in-app notification at least 14 days before the changes take effect.</p>
                <p>Your continued use of the Platform after changes become effective constitutes your acceptance of the updated Terms. If you do not agree to the revised Terms, you must stop using the Platform and close your account.</p>
              </Section>

              <Section id="contact" title="15. Contact Us">
                <p>If you have any questions about these Terms of Service, please contact us:</p>
                <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-4 mt-3 space-y-1.5 not-prose">
                  <p className="text-sm font-bold text-[#0c4a6e]">SkillBridge Technologies Ltd.</p>
                  <p className="text-sm text-gray-600">📧 <a href="mailto:legal@skillbridge.ng" className="text-[#0284c7] hover:underline">legal@skillbridge.ng</a></p>
                  <p className="text-sm text-gray-600">📞 <a href="tel:+2348000000000" className="text-[#0284c7] hover:underline">+234 800 000 0000</a></p>
                  <p className="text-sm text-gray-600">🏢 Lagos, Nigeria</p>
                  <p className="text-sm text-gray-600 mt-2">
                    <Link href="/contact" className="text-[#0284c7] hover:underline inline-flex items-center gap-1 font-medium">
                      Visit our Help Centre <ExternalLink className="w-3 h-3" />
                    </Link>
                  </p>
                </div>
              </Section>

              {/* Footer note */}
              <div className="border-t border-gray-100 pt-8 pb-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  These Terms of Service were last updated on <strong>{LAST_UPDATED}</strong>. By using SkillBridge, you confirm that you have read, understood, and agree to be bound by these Terms.
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <Link href="/privacy" className="text-sm text-[#0284c7] hover:underline font-medium inline-flex items-center gap-1">
                    Privacy Policy <ChevronRight className="w-3.5 h-3.5" />
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
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:list-disc [&_li]:text-gray-600 [&_strong]:text-[#0c4a6e] [&_strong]:font-semibold [&_a]:text-[#0284c7] [&_a]:hover:underline">
        {children}
      </div>
    </motion.section>
  );
}
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronRight, CreditCard, Shield, Lock,
  HelpCircle, Send, CheckCircle, Upload, X, Zap,
  Clock, Users, AlertTriangle, MessageSquare, FileText
} from "lucide-react";

type FormType = "payment" | "fraud" | "access" | "general" | null;
type TicketStatus = { id: string; level: 1 | 2 | 3 } | null;

const formConfigs: Record<NonNullable<FormType>, {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  level: 1 | 2 | 3;
  levelLabel: string;
}> = {
  payment: {
    title: "Report a Payment Issue",
    description: "Stuck payment, escrow query, or refund request",
    icon: <CreditCard className="w-5 h-5" />,
    color: "text-[#0284c7]", bg: "bg-[#e0f2fe]", border: "border-[#bae6fd]",
    level: 2, levelLabel: "Admin review within 24-48 hours"
  },
  fraud: {
    title: "Report Fraud or Scam",
    description: "Suspicious activity, fake profiles, or unsafe behavior",
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "text-red-500", bg: "bg-red-50", border: "border-red-200",
    level: 3, levelLabel: "Escalated — security team responds within 4 hours"
  },
  access: {
    title: "Account Access Problem",
    description: "Cannot log in, suspended account, or verification issue",
    icon: <Lock className="w-5 h-5" />,
    color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200",
    level: 2, levelLabel: "Admin review within 24-48 hours"
  },
  general: {
    title: "General Inquiry",
    description: "Anything else not covered above",
    icon: <HelpCircle className="w-5 h-5" />,
    color: "text-[#10b981]", bg: "bg-[#dcfce7]", border: "border-[#bbf7d0]",
    level: 1, levelLabel: "AI auto-response + admin review if needed"
  }
};

const levelInfo = {
  1: { label: "Level 1 — AI Auto Response", desc: "Instant reply via our AI assistant. Most common questions resolved immediately.", color: "text-[#10b981]", bg: "bg-[#dcfce7]", dot: "bg-[#10b981]" },
  2: { label: "Level 2 — Admin Review", desc: "Your ticket is queued for human review. Response within 24-48 hours.", color: "text-[#0284c7]", bg: "bg-[#e0f2fe]", dot: "bg-[#0284c7]" },
  3: { label: "Level 3 — Escalation", desc: "High-priority case. Our security or legal team responds within 4 hours.", color: "text-red-500", bg: "bg-red-50", dot: "bg-red-500" }
};

function ContactForm({ type, onSuccess }: { type: NonNullable<FormType>; onSuccess: (ticket: TicketStatus) => void }) {
  const config = formConfigs[type];
  const [form, setForm] = useState({
    name: "", email: "", userType: "client", subject: "", bookingId: "", message: ""
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const id = "SB" + Math.floor(10000 + Math.random() * 90000);
      onSuccess({ id, level: config.level });
    }, 1800);
  };

  const lv = levelInfo[config.level];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Form header */}
      <div className={"flex items-start gap-4 p-5 rounded-2xl border mb-6 " + config.bg + " " + config.border}>
        <div className={"w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white shadow-sm " + config.color}>
          {config.icon}
        </div>
        <div>
          <h3 className="font-bold text-[#0c4a6e] mb-0.5">{config.title}</h3>
          <p className="text-gray-500 text-sm">{config.description}</p>
        </div>
      </div>

      {/* Support level badge */}
      <div className={"flex items-center gap-3 p-3.5 rounded-xl border mb-6 " + lv.bg}>
        <div className={"w-2.5 h-2.5 rounded-full shrink-0 " + lv.dot} />
        <div>
          <div className={"text-xs font-bold " + lv.color}>{lv.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{lv.desc}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
            <input
              type="text" required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address *</label>
            <input
              type="email" required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">I am a *</label>
            <select
              value={form.userType}
              onChange={(e) => setForm({ ...form, userType: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition bg-white"
            >
              <option value="client">Client</option>
              <option value="worker">Worker</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Booking ID <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input
              type="text"
              value={form.bookingId}
              onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
              placeholder="e.g. BK-0012345"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject *</label>
          <input
            type="text" required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Brief summary of your issue"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message *</label>
          <textarea
            required rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Describe your issue in detail. The more information you provide, the faster we can help."
            className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition resize-none"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Upload Evidence <span className="text-gray-400 font-normal">(Optional — screenshots, photos, receipts)</span></label>
          <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#0284c7]/50 hover:bg-[#f0f9ff] transition">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">
              {files.length > 0 ? files.map(f => f.name).join(", ") : "Click to upload files (PNG, JPG, PDF up to 10MB)"}
            </span>
            <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" onChange={handleFile} className="hidden" />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-[#e0f2fe] text-[#0284c7] text-xs px-3 py-1.5 rounded-full">
                  <FileText className="w-3 h-3" />
                  {f.name}
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-0.5 hover:text-red-500 transition">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#0284c7] text-white font-bold rounded-xl hover:bg-[#0369a1] transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting your ticket...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit Support Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function SuccessView({ ticket, onReset }: { ticket: TicketStatus; onReset: () => void }) {
  if (!ticket) return null;
  const lv = levelInfo[ticket.level];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
      className="text-center py-6"
    >
      <div className="w-16 h-16 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle className="w-8 h-8 text-[#10b981]" />
      </div>
      <h3 className="text-2xl font-bold text-[#0c4a6e] mb-2">Ticket Created!</h3>
      <p className="text-gray-500 mb-5">Your support ticket has been submitted successfully.</p>

      <div className="inline-block bg-[#0c4a6e] text-white px-6 py-3 rounded-2xl mb-6">
        <div className="text-xs text-blue-300 mb-0.5">Your Ticket ID</div>
        <div className="text-2xl font-bold tracking-wider">#{ticket.id}</div>
      </div>

      <div className={"flex items-center gap-3 p-4 rounded-xl border text-left mb-6 max-w-sm mx-auto " + lv.bg}>
        <div className={"w-3 h-3 rounded-full shrink-0 " + lv.dot} />
        <div>
          <div className={"text-xs font-bold " + lv.color}>{lv.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{lv.desc}</div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-8">
        <p>A confirmation has been sent to your email.</p>
        <p>You can track your ticket status in your dashboard under <strong className="text-[#0c4a6e]">Notifications</strong>.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/" className="bg-[#0284c7] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#0369a1] transition">
          Back to Home
        </Link>
        <button onClick={onReset} className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
          Submit Another Ticket
        </button>
      </div>
    </motion.div>
  );
}

export default function ContactPage() {
  const [selectedForm, setSelectedForm] = useState<FormType>(null);
  const [ticket, setTicket] = useState<TicketStatus>(null);

  const quickHelp: Array<{ type: NonNullable<FormType>; label: string; desc: string; icon: React.ReactNode; color: string; bg: string; border: string }> = [
    {
      type: "payment", label: "Report a Payment Issue",
      desc: "Stuck payment, escrow query, refund",
      icon: <CreditCard className="w-6 h-6" />,
      color: "text-[#0284c7]", bg: "bg-[#e0f2fe]", border: "border-[#bae6fd] hover:border-[#0284c7]/50"
    },
    {
      type: "fraud", label: "Report Fraud",
      desc: "Suspicious activity or fake profile",
      icon: <AlertTriangle className="w-6 h-6" />,
      color: "text-red-500", bg: "bg-red-50", border: "border-red-100 hover:border-red-300"
    },
    {
      type: "access", label: "Account Access Problem",
      desc: "Cannot log in or account suspended",
      icon: <Lock className="w-6 h-6" />,
      color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-100 hover:border-purple-300"
    },
    {
      type: "general", label: "General Inquiry",
      desc: "Any other question or feedback",
      icon: <HelpCircle className="w-6 h-6" />,
      color: "text-[#10b981]", bg: "bg-[#dcfce7]", border: "border-[#bbf7d0] hover:border-[#10b981]/50"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0c4a6e] via-[#075985] to-[#0369a1] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12 sm:pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/" className="text-blue-300 hover:text-white text-sm transition flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Home
            </Link>
            <ChevronRight className="w-3 h-3 text-blue-400" />
            <Link href="/help" className="text-blue-300 hover:text-white text-sm transition">Help Center</Link>
            <ChevronRight className="w-3 h-3 text-blue-400" />
            <span className="text-blue-200 text-sm">Contact</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Contact Support</h1>
            <p className="text-blue-200 text-sm sm:text-base max-w-xl">
              Choose a category below to open a structured support ticket. Our 3-level support system ensures every issue gets the right level of attention.
            </p>
          </motion.div>
        </div>

        {/* 3-Level Support Model */}
        <div className="border-t border-white/10 bg-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-4 sm:gap-8">
            {[
              { icon: <Zap className="w-3.5 h-3.5" />, label: "Level 1: AI Auto Response", desc: "Instant" },
              { icon: <Clock className="w-3.5 h-3.5" />, label: "Level 2: Ticket Queue", desc: "24-48 hrs" },
              { icon: <Shield className="w-3.5 h-3.5" />, label: "Level 3: Escalation", desc: "4 hrs for critical" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-blue-200 text-xs">
                {s.icon}
                <span className="font-medium">{s.label}</span>
                <span className="text-blue-400">· {s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left: Form Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {ticket ? (
                <motion.div key="success"><SuccessView ticket={ticket} onReset={() => { setTicket(null); setSelectedForm(null); }} /></motion.div>
              ) : selectedForm ? (
                <motion.div key={"form-" + selectedForm}>
                  <button
                    onClick={() => setSelectedForm(null)}
                    className="flex items-center gap-2 text-[#0284c7] text-sm font-medium mb-6 hover:text-[#0369a1] transition"
                  >
                    <ArrowLeft className="w-4 h-4" /> Choose a different category
                  </button>
                  <ContactForm type={selectedForm} onSuccess={(t) => setTicket(t)} />
                </motion.div>
              ) : (
                <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-lg font-bold text-[#0c4a6e] mb-2">What do you need help with?</h2>
                  <p className="text-sm text-gray-500 mb-6">Select a category to open the right support form.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quickHelp.map((item) => (
                      <motion.button
                        key={item.type}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedForm(item.type)}
                        className={"flex items-start gap-4 p-5 rounded-2xl border-2 transition text-left " + item.border + " bg-white hover:shadow-md"}
                      >
                        <div className={"w-11 h-11 rounded-xl flex items-center justify-center shrink-0 " + item.bg + " " + item.color}>
                          {item.icon}
                        </div>
                        <div>
                          <div className="font-bold text-[#0c4a6e] text-sm mb-0.5">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.desc}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto shrink-0 mt-1" />
                      </motion.button>
                    ))}
                  </div>

                  {/* AI Chat shortcut */}
                  <div className="mt-6 bg-gradient-to-r from-[#0c4a6e] to-[#0369a1] rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">Need a faster answer?</div>
                      <div className="text-blue-200 text-xs mt-0.5">Our AI support resolves 70% of questions instantly.</div>
                    </div>
                    <Link href="/help" className="bg-[#10b981] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#059669] transition shrink-0">
                      Chat Now
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Info Sidebar */}
          <div className="lg:col-span-2 space-y-5">
            {/* Support Levels */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-[#0c4a6e] mb-4 text-sm">Our 3-Level Support Model</h3>
              <div className="space-y-4">
                {([1, 2, 3] as const).map((level) => {
                  const lv = levelInfo[level];
                  return (
                    <div key={level} className="flex gap-3">
                      <div className={"w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 " + lv.dot}>
                        {level}
                      </div>
                      <div>
                        <div className={"text-xs font-bold mb-0.5 " + lv.color}>{lv.label.split("— ")[1]}</div>
                        <div className="text-xs text-gray-500 leading-relaxed">{lv.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* What AI cannot do */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-amber-700 text-sm">Important Note</h3>
              </div>
              <ul className="space-y-2 text-xs text-amber-700">
                {[
                  "AI cannot make refund decisions",
                  "AI cannot release payments",
                  "AI cannot resolve disputes",
                  "Only admin has financial control"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <X className="w-3 h-3 text-amber-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact info */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-[#0c4a6e] mb-3 text-sm">Response Times</h3>
              <div className="space-y-3 text-xs text-gray-600">
                {[
                  { label: "AI Support", value: "Instant", dot: "bg-[#10b981]" },
                  { label: "General tickets", value: "24-48 hours", dot: "bg-[#0284c7]" },
                  { label: "Payment issues", value: "12-24 hours", dot: "bg-[#0284c7]" },
                  { label: "Fraud reports", value: "Under 4 hours", dot: "bg-red-500" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={"w-2 h-2 rounded-full " + r.dot} />
                      {r.label}
                    </div>
                    <span className="font-semibold text-[#0c4a6e]">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Help center link */}
            <Link href="/help"
              className="flex items-center gap-3 bg-[#e0f2fe] border border-[#bae6fd] rounded-2xl p-4 hover:bg-[#bae6fd]/50 transition">
              <Users className="w-5 h-5 text-[#0284c7]" />
              <div>
                <div className="font-semibold text-[#0c4a6e] text-sm">Visit Help Center</div>
                <div className="text-xs text-gray-500">Browse articles and FAQs</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#0284c7] ml-auto" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
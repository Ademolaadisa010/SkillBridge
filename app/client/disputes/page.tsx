"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert, Plus, X, Upload, Clock, CheckCircle2,
  AlertTriangle, ChevronRight, Menu, ArrowLeft, FileText,
  Image as ImageIcon, Eye, MessageCircle, Scale,
  Loader2, Calendar, User, CreditCard, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, doc, getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";
type DisputeReason = "work_not_done" | "poor_quality" | "no_show" | "overcharge" | "damage" | "other";

interface Dispute {
  id: string;
  jobId: string;
  clientId: string;
  workerId?: string;
  workerName?: string;
  service?: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  amount?: number;
  resolution?: string;
  createdAt?: { seconds: number };
  resolvedAt?: { seconds: number };
  evidenceCount?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const REASON_LABELS: Record<DisputeReason, string> = {
  work_not_done: "Work Not Done",
  poor_quality:  "Poor Quality",
  no_show:       "Worker No-Show",
  overcharge:    "Overcharge",
  damage:        "Property Damage",
  other:         "Other",
};

function formatDate(seconds?: number) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DisputeStatus }) {
  const map: Record<DisputeStatus, { cls: string; icon: React.ReactNode; label: string }> = {
    open:         { cls: "bg-yellow-100 text-yellow-700 border-yellow-200",  icon: <Clock className="w-3 h-3" />,         label: "Open" },
    under_review: { cls: "bg-blue-100 text-[#0284c7] border-blue-200",       icon: <Eye className="w-3 h-3" />,           label: "Under Review" },
    resolved:     { cls: "bg-green-100 text-[#10b981] border-green-200",     icon: <CheckCircle2 className="w-3 h-3" />,  label: "Resolved" },
    rejected:     { cls: "bg-red-100 text-red-600 border-red-200",           icon: <X className="w-3 h-3" />,             label: "Rejected" },
  };
  const { cls, icon, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {icon}{label}
    </span>
  );
}

// ─── Open Dispute Modal ─────────────────────────────────────────────────────────
function OpenDisputeModal({
  onClose,
  onSubmit,
  prefillJobId,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<Dispute>, files: File[]) => Promise<void>;
  prefillJobId?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    jobId: prefillJobId || "",
    reason: "" as DisputeReason | "",
    description: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const canSubmit = form.jobId && form.reason && form.description.length >= 30;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await onSubmit({ ...form, reason: form.reason as DisputeReason, evidenceCount: files.length }, files);
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 p-5 text-white shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Open a Dispute</h3>
                <p className="text-red-100 text-xs mt-0.5">Our team reviews all disputes within 48 hours</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Info notice */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Funds in escrow are <strong>frozen</strong> the moment you open a dispute. They will not be released until our team makes a decision.
            </p>
          </div>

          {/* Job ID */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#0c4a6e]">Booking / Job ID *</label>
            <input
              type="text"
              value={form.jobId}
              onChange={e => set("jobId", e.target.value)}
              placeholder="e.g. abc123xyz"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition"
            />
            <p className="text-xs text-gray-400">Find this in My Bookings → Booking Details</p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#0c4a6e]">Reason *</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(REASON_LABELS) as [DisputeReason, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => set("reason", key)}
                  className={`p-3 rounded-xl border-2 text-left text-xs font-semibold transition ${
                    form.reason === key
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#0c4a6e]">Describe what happened *</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={4}
              placeholder="Explain in detail what went wrong. The more specific you are, the faster our team can resolve this..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none transition"
            />
            <p className={`text-xs text-right ${form.description.length >= 30 ? "text-[#10b981]" : "text-gray-400"}`}>
              {form.description.length} / 30 min
            </p>
          </div>

          {/* Evidence upload */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#0c4a6e]">
              Evidence <span className="text-gray-400 font-normal">(photos, videos — optional)</span>
            </label>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-red-300 hover:bg-red-50 transition"
            >
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-400">Click to upload evidence files</span>
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
              onChange={e => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 text-xs text-red-700">
                    <ImageIcon className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{f.name}</span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-50 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full bg-red-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><ShieldAlert className="w-4 h-4" /> Submit Dispute</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Dispute Detail Modal ───────────────────────────────────────────────────────
function DisputeDetailModal({ dispute, onClose }: { dispute: Dispute; onClose: () => void }) {
  const steps = [
    { label: "Dispute Opened",      done: true },
    { label: "Under Review",        done: ["under_review", "resolved", "rejected"].includes(dispute.status) },
    { label: "Decision Made",       done: ["resolved", "rejected"].includes(dispute.status) },
    { label: dispute.status === "resolved" ? "Refund Processed" : "Case Closed", done: ["resolved", "rejected"].includes(dispute.status) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] p-5 text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-blue-300 mb-0.5">Dispute #{dispute.id.slice(-6).toUpperCase()}</p>
              <h3 className="font-bold text-base">{REASON_LABELS[dispute.reason]}</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <StatusBadge status={dispute.status} />
        </div>

        <div className="p-5 space-y-5">
          {/* Progress timeline */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Progress</p>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    step.done ? "bg-[#10b981]" : "bg-gray-100"
                  }`}>
                    {step.done
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      : <div className="w-2 h-2 rounded-full bg-gray-300" />
                    }
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute ml-3 mt-6 w-0.5 h-3 bg-gray-100" />
                  )}
                  <span className={`text-xs font-medium ${step.done ? "text-[#0c4a6e]" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            {[
              { icon: <FileText className="w-3.5 h-3.5" />, label: "Reason",      value: REASON_LABELS[dispute.reason] },
              { icon: <User className="w-3.5 h-3.5" />,     label: "Worker",      value: dispute.workerName || "—" },
              { icon: <Calendar className="w-3.5 h-3.5" />, label: "Opened",      value: formatDate(dispute.createdAt?.seconds) },
              { icon: <ImageIcon className="w-3.5 h-3.5" />,label: "Evidence",    value: `${dispute.evidenceCount || 0} file(s) attached` },
              ...(dispute.amount ? [{ icon: <CreditCard className="w-3.5 h-3.5" />, label: "Amount", value: `₦${dispute.amount.toLocaleString()}` }] : []),
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 text-gray-400 text-xs">{icon}{label}</div>
                <span className="text-sm font-semibold text-[#0c4a6e]">{value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Statement</p>
            <p className="text-sm text-gray-600 leading-relaxed">{dispute.description}</p>
          </div>

          {/* Resolution if done */}
          {dispute.resolution && (
            <div className={`rounded-xl p-4 ${dispute.status === "resolved" ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${dispute.status === "resolved" ? "text-[#10b981]" : "text-red-600"}`}>
                Admin Decision
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">{dispute.resolution}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
function DisputesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [activeTab, setActiveTab] = useState<DisputeStatus | "all">("all");

  const prefillJobId = searchParams.get("booking") || "";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }
      const q = query(collection(db, "disputes"), where("clientId", "==", user.uid));
      const unsubSnap = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Dispute));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setDisputes(data);
        setLoading(false);
      });
      return () => unsubSnap();
    });

    // Auto-open modal if coming from bookings with ?booking=id
    if (prefillJobId) setShowOpenModal(true);

    return () => unsub();
  }, [router, prefillJobId]);

  const handleSubmitDispute = async (data: Partial<Dispute>) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Try to get worker details from the job
      let workerName = "";
      let amount = 0;
      if (data.jobId) {
        const jobSnap = await getDoc(doc(db, "jobs", data.jobId));
        if (jobSnap.exists()) {
          workerName = jobSnap.data().workerName || "";
          amount = jobSnap.data().amount || 0;
        }
      }

      await addDoc(collection(db, "disputes"), {
        ...data,
        clientId: user.uid,
        workerName,
        amount,
        status: "open",
        createdAt: serverTimestamp(),
      });

      toast.success("Dispute submitted. Escrow is now frozen. Our team will review within 48 hours.", {
        duration: 5000,
        style: { border: "1px solid #fecaca", background: "#fff", color: "#7f1d1d" },
      });
      setShowOpenModal(false);
    } catch {
      toast.error("Failed to submit dispute. Please try again.");
    }
  };

  const TABS: { id: DisputeStatus | "all"; label: string }[] = [
    { id: "all",          label: "All" },
    { id: "open",         label: "Open" },
    { id: "under_review", label: "Under Review" },
    { id: "resolved",     label: "Resolved" },
    { id: "rejected",     label: "Rejected" },
  ];

  const filtered = activeTab === "all" ? disputes : disputes.filter(d => d.status === activeTab);
  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = t.id === "all" ? disputes.length : disputes.filter(d => d.status === t.id).length;
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <ClientSidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex"><ClientSidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <Menu className="w-5 h-5 text-[#0c4a6e]" />
          </button>
          <span className="text-base font-bold text-[#0c4a6e]">Disputes</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[#0c4a6e]">Disputes</h1>
                <p className="text-xs text-gray-400 mt-0.5">Raise and track issues with your bookings</p>
              </div>
              <button
                onClick={() => setShowOpenModal(true)}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition shadow-md self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Open Dispute
              </button>
            </div>

            {/* How it works banner */}
            <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] rounded-2xl p-5 text-white grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: <ShieldAlert className="w-5 h-5 text-red-300" />,     title: "1. You Open Dispute",  desc: "Escrow is immediately frozen. Funds safe." },
                { icon: <Eye className="w-5 h-5 text-yellow-300" />,          title: "2. Admin Reviews",     desc: "Our team reviews evidence within 48 hours." },
                { icon: <Scale className="w-5 h-5 text-[#34d399]" />,         title: "3. Fair Decision",     desc: "Refund or release based on findings." },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <p className="text-sm font-bold">{s.title}</p>
                    <p className="text-blue-200 text-xs mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id ? "bg-[#0284c7] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                  {counts[tab.id] > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    }`}>{counts[tab.id]}</span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {filtered.map(dispute => (
                    <motion.div
                      key={dispute.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group"
                      onClick={() => setSelectedDispute(dispute)}
                    >
                      <div className="flex items-center gap-4 p-5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          dispute.status === "open"         ? "bg-yellow-50" :
                          dispute.status === "under_review" ? "bg-blue-50" :
                          dispute.status === "resolved"     ? "bg-green-50" : "bg-red-50"
                        }`}>
                          <ShieldAlert className={`w-5 h-5 ${
                            dispute.status === "open"         ? "text-yellow-500" :
                            dispute.status === "under_review" ? "text-[#0284c7]" :
                            dispute.status === "resolved"     ? "text-[#10b981]" : "text-red-500"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div>
                              <p className="text-sm font-bold text-[#0c4a6e]">{REASON_LABELS[dispute.reason]}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {dispute.workerName ? `vs ${dispute.workerName}` : "—"} · {formatDate(dispute.createdAt?.seconds)}
                              </p>
                            </div>
                            <StatusBadge status={dispute.status} />
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">{dispute.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition shrink-0" />
                      </div>
                      <div className={`h-0.5 ${
                        dispute.status === "open" ? "bg-yellow-300" :
                        dispute.status === "under_review" ? "bg-[#0284c7]" :
                        dispute.status === "resolved" ? "bg-[#10b981]" : "bg-red-400"
                      }`} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <Scale className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-400 mb-1">No disputes found</h3>
                <p className="text-sm text-gray-300 mb-5">If something goes wrong with a booking, you can raise a dispute here and our team will review it fairly.</p>
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-700 transition"
                >
                  <Plus className="w-4 h-4" /> Open a Dispute
                </button>
              </div>
            )}

          </div>
        </main>
      </div>

      <AnimatePresence>
        {showOpenModal && (
          <OpenDisputeModal
            onClose={() => setShowOpenModal(false)}
            onSubmit={handleSubmitDispute}
            prefillJobId={prefillJobId}
          />
        )}
        {selectedDispute && (
          <DisputeDetailModal dispute={selectedDispute} onClose={() => setSelectedDispute(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
// ─── Suspense wrapper (required for useSearchParams in Next.js) ───────────────
export default function DisputesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading…</p>
        </div>
      </div>
    }>
      <DisputesPageInner />
    </Suspense>
  );
}
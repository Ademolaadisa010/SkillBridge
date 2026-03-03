"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, Plus, X, Upload, Clock, CheckCircle2, Eye, Scale, Loader2, Menu, Image as ImageIcon, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import toast, { Toaster } from "react-hot-toast";

type DisputeStatus = "open"|"under_review"|"resolved"|"rejected";
type DisputeReason = "payment_not_released"|"false_claim"|"unsafe_conditions"|"client_no_show"|"scope_change"|"other";
interface Dispute { id: string; jobId: string; workerId: string; clientName?: string; service?: string; reason: DisputeReason; description: string; status: DisputeStatus; resolution?: string; createdAt?: { seconds: number }; evidenceCount?: number; }

const REASONS: Record<DisputeReason, string> = { payment_not_released: "Payment Not Released", false_claim: "False Client Claim", unsafe_conditions: "Unsafe Conditions", client_no_show: "Client No-Show", scope_change: "Unreasonable Scope Change", other: "Other" };
function fmt(s?: number) { return s ? new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"; }

function StatusBadge({ status }: { status: DisputeStatus }) {
  const map: Record<DisputeStatus, string> = { open: "bg-yellow-100 text-yellow-700 border-yellow-200", under_review: "bg-blue-100 text-[#0284c7] border-blue-200", resolved: "bg-green-100 text-[#10b981] border-green-200", rejected: "bg-red-100 text-red-600 border-red-200" };
  const labels: Record<DisputeStatus, string> = { open: "Open", under_review: "Under Review", resolved: "Resolved", rejected: "Rejected" };
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${map[status]}`}>{labels[status]}</span>;
}

function OpenModal({ onClose, onSubmit, prefillJobId }: { onClose: () => void; onSubmit: (d: Partial<Dispute>, files: File[]) => Promise<void>; prefillJobId?: string; }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ jobId: prefillJobId || "", reason: "" as DisputeReason | "", description: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const ok = form.jobId && form.reason && form.description.length >= 30;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-red-600 to-red-500 p-5 text-white shrink-0 flex items-start justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><ShieldAlert className="w-5 h-5" /></div><div><h3 className="font-bold text-base">Open a Dispute</h3><p className="text-red-100 text-xs mt-0.5">Reviewed by our team within 48 hours</p></div></div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5"><Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><p className="text-xs text-amber-700 leading-relaxed">Opening a dispute <strong>freezes the escrow</strong> for this job. Funds won't move until resolved.</p></div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Job ID *</label><input type="text" value={form.jobId} onChange={e => setForm(p => ({ ...p, jobId: e.target.value }))} placeholder="e.g. abc123xyz" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" /></div>
          <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reason *</label><div className="grid grid-cols-2 gap-2">{(Object.entries(REASONS) as [DisputeReason, string][]).map(([k, l]) => <button key={k} onClick={() => setForm(p => ({ ...p, reason: k }))} className={`p-3 rounded-xl border-2 text-left text-xs font-semibold transition ${form.reason === k ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{l}</button>)}</div></div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description *</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} placeholder="Explain in detail what happened..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" /><p className={`text-xs text-right ${form.description.length >= 30 ? "text-[#10b981]" : "text-gray-400"}`}>{form.description.length}/30 min</p></div>
          <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Evidence <span className="font-normal text-gray-400">(optional)</span></label>
            <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-red-300 hover:bg-red-50 transition"><Upload className="w-5 h-5 text-gray-400" /><span className="text-xs text-gray-400">Click to upload photos or files</span></button>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && <div className="flex flex-wrap gap-2">{files.map((f, i) => <div key={i} className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 text-xs text-red-700"><ImageIcon className="w-3 h-3" /><span className="truncate max-w-[100px]">{f.name}</span><button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button></div>)}</div>}
          </div>
        </div>
        <div className="p-5 border-t border-gray-50 shrink-0">
          <button onClick={async () => { setSubmitting(true); await onSubmit({ ...form, reason: form.reason as DisputeReason, evidenceCount: files.length }, files); setSubmitting(false); }} disabled={!ok || submitting}
            className="w-full bg-red-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><ShieldAlert className="w-4 h-4" /> Submit Dispute</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailModal({ dispute, onClose }: { dispute: Dispute; onClose: () => void }) {
  const steps = [{ label: "Dispute Opened", done: true }, { label: "Under Review", done: ["under_review","resolved","rejected"].includes(dispute.status) }, { label: "Decision Made", done: ["resolved","rejected"].includes(dispute.status) }, { label: "Case Closed", done: ["resolved","rejected"].includes(dispute.status) }];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] p-5 text-white">
          <div className="flex items-start justify-between mb-3"><div><p className="text-xs text-blue-300 mb-0.5">#{dispute.id.slice(-6).toUpperCase()}</p><h3 className="font-bold text-base">{REASONS[dispute.reason]}</h3></div><button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition"><X className="w-4 h-4" /></button></div>
          <StatusBadge status={dispute.status} />
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-3">{steps.map((s, i) => <div key={i} className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.done ? "bg-[#10b981]" : "bg-gray-100"}`}>{s.done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}</div><span className={`text-xs font-medium ${s.done ? "text-[#0c4a6e]" : "text-gray-400"}`}>{s.label}</span></div>)}</div>
          <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1 font-semibold">Your Statement</p><p className="text-sm text-gray-600 leading-relaxed">{dispute.description}</p></div>
          {dispute.resolution && <div className={`rounded-xl p-4 ${dispute.status === "resolved" ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}><p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${dispute.status === "resolved" ? "text-[#10b981]" : "text-red-600"}`}>Admin Decision</p><p className="text-sm text-gray-600">{dispute.resolution}</p></div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function WorkerDisputesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [tab, setTab] = useState<DisputeStatus | "all">("all");
  const prefillJobId = searchParams.get("job") || "";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }
      const q = query(collection(db, "disputes"), where("workerId", "==", user.uid));
      const unsubSnap = onSnapshot(q, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Dispute)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setDisputes(data); setLoading(false);
      });
      if (prefillJobId) setShowOpen(true);
      return () => unsubSnap();
    });
    return () => unsub();
  }, [router, prefillJobId]);

  const handleSubmit = async (data: Partial<Dispute>) => {
    try {
      const user = auth.currentUser!;
      let clientName = ""; let service = "";
      if (data.jobId) { const j = await getDoc(doc(db, "jobs", data.jobId)); if (j.exists()) { clientName = j.data().clientName || ""; service = j.data().service || ""; } }
      await addDoc(collection(db, "disputes"), { ...data, workerId: user.uid, clientName, service, status: "open", createdAt: serverTimestamp() });
      toast.success("Dispute submitted. Escrow frozen. Team will review within 48 hours.", { duration: 5000 });
      setShowOpen(false);
    } catch { toast.error("Failed to submit dispute."); }
  };

  const TABS: { id: DisputeStatus | "all"; label: string }[] = [{ id: "all", label: "All" }, { id: "open", label: "Open" }, { id: "under_review", label: "Under Review" }, { id: "resolved", label: "Resolved" }, { id: "rejected", label: "Rejected" }];
  const counts = TABS.reduce<Record<string, number>>((acc, t) => { acc[t.id] = t.id === "all" ? disputes.length : disputes.filter(d => d.status === t.id).length; return acc; }, {});
  const filtered = tab === "all" ? disputes : disputes.filter(d => d.status === tab);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <WorkerSidebar />
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div></div>}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><Menu className="w-5 h-5 text-[#0c4a6e]" /></button>
          <span className="text-base font-bold text-[#0c4a6e]">Disputes</span>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-[#0c4a6e]">Disputes</h1><p className="text-xs text-gray-400 mt-0.5">Raise and track disputes on your jobs</p></div><button onClick={() => setShowOpen(true)} className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition shadow-md self-start"><Plus className="w-4 h-4" /> Open Dispute</button></div>

            <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] rounded-2xl p-5 text-white grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[{ icon: <ShieldAlert className="w-5 h-5 text-red-300" />, title: "1. You Open", desc: "Escrow frozen immediately" }, { icon: <Eye className="w-5 h-5 text-yellow-300" />, title: "2. Admin Reviews", desc: "Evidence checked within 48h" }, { icon: <Scale className="w-5 h-5 text-[#34d399]" />, title: "3. Fair Decision", desc: "Payment or refund processed" }].map(s => (
                <div key={s.title} className="flex items-start gap-3"><div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">{s.icon}</div><div><p className="text-sm font-bold">{s.title}</p><p className="text-blue-200 text-xs mt-0.5">{s.desc}</p></div></div>
              ))}
            </div>

            <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto">
              {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${tab === t.id ? "bg-[#0284c7] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>{t.label}{counts[t.id] > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{counts[t.id]}</span>}</button>)}
            </div>

            {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4"><div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3" /><div className="h-2.5 bg-gray-100 rounded w-2/3" /></div></div>)}</div>
            : filtered.length > 0 ? (
              <div className="space-y-3"><AnimatePresence>{filtered.map(d => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => setSelectedDispute(d)} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group overflow-hidden">
                  <div className="flex items-center gap-4 p-5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${d.status === "open" ? "bg-yellow-50" : d.status === "under_review" ? "bg-blue-50" : d.status === "resolved" ? "bg-green-50" : "bg-red-50"}`}><ShieldAlert className={`w-5 h-5 ${d.status === "open" ? "text-yellow-500" : d.status === "under_review" ? "text-[#0284c7]" : d.status === "resolved" ? "text-[#10b981]" : "text-red-500"}`} /></div>
                    <div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-3 mb-1"><div><p className="text-sm font-bold text-[#0c4a6e]">{REASONS[d.reason]}</p><p className="text-xs text-gray-400 mt-0.5">{d.clientName ? `vs ${d.clientName}` : "—"} · {fmt(d.createdAt?.seconds)}</p></div><StatusBadge status={d.status} /></div><p className="text-xs text-gray-500 line-clamp-1">{d.description}</p></div>
                  </div>
                  <div className={`h-0.5 ${d.status === "open" ? "bg-yellow-300" : d.status === "under_review" ? "bg-[#0284c7]" : d.status === "resolved" ? "bg-[#10b981]" : "bg-red-400"}`} />
                </motion.div>
              ))}</AnimatePresence></div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center"><Scale className="w-12 h-12 text-gray-200 mx-auto mb-4" /><h3 className="text-base font-bold text-gray-400 mb-1">No disputes found</h3><p className="text-sm text-gray-300 mb-5">Issues with jobs can be raised here for fair resolution</p><button onClick={() => setShowOpen(true)} className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-700 transition"><Plus className="w-4 h-4" /> Open a Dispute</button></div>
            )}
          </div>
        </main>
      </div>
      <AnimatePresence>
        {showOpen && <OpenModal onClose={() => setShowOpen(false)} onSubmit={handleSubmit} prefillJobId={prefillJobId} />}
        {selectedDispute && <DetailModal dispute={selectedDispute} onClose={() => setSelectedDispute(null)} />}
      </AnimatePresence>
    </div>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Upload, X, CheckCircle2, Clock, AlertCircle, Menu, ShieldCheck, FileText, Camera, Loader2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import toast, { Toaster } from "react-hot-toast";

type VerifStatus = "unsubmitted" | "pending" | "approved" | "rejected";
interface VerifState { status: VerifStatus; idUploaded: boolean; selfieUploaded: boolean; certUploaded: boolean; rejectionReason?: string; submittedAt?: { seconds: number }; }

function Step({ label, desc, status, icon, onUpload }: { label: string; desc: string; status: "done" | "pending" | "idle" | "rejected"; icon: React.ReactNode; onUpload: () => void; }) {
  const styles = { done: "border-green-200 bg-green-50", pending: "border-blue-200 bg-blue-50", rejected: "border-red-200 bg-red-50", idle: "border-gray-200 bg-white" };
  return (
    <div className={`rounded-2xl border-2 p-5 transition ${styles[status]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${status === "done" ? "bg-[#dcfce7] text-[#10b981]" : status === "pending" ? "bg-[#e0f2fe] text-[#0284c7]" : status === "rejected" ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400"}`}>{icon}</div>
          <div><p className="text-sm font-bold text-[#0c4a6e]">{label}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
        </div>
        <div className="shrink-0">
          {status === "done" ? <CheckCircle2 className="w-6 h-6 text-[#10b981]" /> :
           status === "pending" ? <Clock className="w-6 h-6 text-[#0284c7]" /> :
           status === "rejected" ? <button onClick={onUpload} className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-xl hover:bg-red-200 transition"><Upload className="w-3.5 h-3.5" /> Re-upload</button> :
           <button onClick={onUpload} className="flex items-center gap-1.5 text-xs font-bold text-[#10b981] bg-[#dcfce7] px-3 py-1.5 rounded-xl hover:bg-[#bbf7d0] transition"><Upload className="w-3.5 h-3.5" /> Upload</button>}
        </div>
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [verifState, setVerifState] = useState<VerifState>({ status: "unsubmitted", idUploaded: false, selfieUploaded: false, certUploaded: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState({ id: false, selfie: false, cert: false });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.push("/login"); return; }
      const snap = await getDoc(doc(db, "workers", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setVerifState({
          status: d.verificationStatus || "unsubmitted",
          idUploaded: d.idUploaded || false,
          selfieUploaded: d.selfieUploaded || false,
          certUploaded: d.certUploaded || false,
          rejectionReason: d.rejectionReason || "",
          submittedAt: d.verificationSubmittedAt,
        });
        setUploads({ id: d.idUploaded || false, selfie: d.selfieUploaded || false, cert: d.certUploaded || false });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleFileUpload = async (field: "id" | "selfie" | "cert") => {
    const input = field === "id" ? idRef.current : field === "selfie" ? selfieRef.current : certRef.current;
    input?.click();
  };

  const handleFileChange = async (field: "id" | "selfie" | "cert", file: File | null) => {
    if (!file) return;
    const user = auth.currentUser; if (!user) return;
    try {
      // In production: upload to Firebase Storage first, get URL, save URL to Firestore
      const fieldMap = { id: "idUploaded", selfie: "selfieUploaded", cert: "certUploaded" };
      await updateDoc(doc(db, "workers", user.uid), { [fieldMap[field]]: true });
      setUploads(p => ({ ...p, [field]: true }));
      toast.success(`${field === "id" ? "ID" : field === "selfie" ? "Selfie" : "Certificate"} uploaded successfully!`);
    } catch { toast.error("Upload failed. Please try again."); }
  };

  const handleSubmit = async () => {
    if (!uploads.id || !uploads.selfie) { toast.error("Please upload your ID and selfie first."); return; }
    setSubmitting(true);
    try {
      const user = auth.currentUser!;
      await updateDoc(doc(db, "workers", user.uid), { verificationStatus: "pending", verificationSubmittedAt: serverTimestamp() });
      setVerifState(p => ({ ...p, status: "pending" }));
      toast.success("Verification submitted! We'll review within 24–48 hours.", { duration: 5000 });
    } catch { toast.error("Submission failed. Please try again."); } finally { setSubmitting(false); }
  };

  const getStepStatus = (uploaded: boolean): "done" | "pending" | "idle" | "rejected" => {
    if (verifState.status === "approved") return "done";
    if (verifState.status === "rejected") return uploaded ? "rejected" : "idle";
    if (verifState.status === "pending" && uploaded) return "pending";
    return uploaded ? "done" : "idle";
  };

  const canSubmit = uploads.id && uploads.selfie && verifState.status === "unsubmitted";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <WorkerSidebar />
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div></div>}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><Menu className="w-5 h-5 text-[#0c4a6e]" /></button>
          <span className="text-base font-bold text-[#0c4a6e]">Verification</span>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div><h1 className="text-xl font-bold text-[#0c4a6e]">Get Verified</h1><p className="text-xs text-gray-400 mt-0.5">Verified workers earn 3× more and get priority placement</p></div>

            {/* Status banner */}
            {verifState.status === "approved" && (
              <div className="bg-[#dcfce7] border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <BadgeCheck className="w-6 h-6 text-[#10b981] shrink-0" />
                <div><p className="text-sm font-bold text-[#065f46]">You're Verified! ✓</p><p className="text-xs text-[#047857] mt-0.5">Your profile shows the verified badge to clients</p></div>
              </div>
            )}
            {verifState.status === "pending" && (
              <div className="bg-[#e0f2fe] border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                <Clock className="w-6 h-6 text-[#0284c7] shrink-0" />
                <div><p className="text-sm font-bold text-[#0c4a6e]">Under Review</p><p className="text-xs text-[#0369a1] mt-0.5">Submitted {verifState.submittedAt ? new Date(verifState.submittedAt.seconds * 1000).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "recently"}. We'll notify you within 24–48 hours.</p></div>
              </div>
            )}
            {verifState.status === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div><p className="text-sm font-bold text-red-800">Verification Rejected</p><p className="text-xs text-red-600 mt-0.5">{verifState.rejectionReason || "Documents were unclear or invalid. Please re-upload and try again."}</p></div>
              </div>
            )}

            {/* Why verify */}
            {verifState.status === "unsubmitted" && (
              <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] rounded-2xl p-5 text-white grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <BadgeCheck className="w-5 h-5 text-[#34d399]" />, title: "Verified Badge", desc: "Blue badge shown to all clients" },
                  { icon: <TrendingUp className="w-5 h-5 text-yellow-300" />, title: "3× More Jobs", desc: "Priority in search results" },
                  { icon: <ShieldCheck className="w-5 h-5 text-blue-300" />, title: "Trusted Status", desc: "Clients prefer verified workers" },
                ].map(s => (
                  <div key={s.title} className="flex items-start gap-3"><div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">{s.icon}</div><div><p className="text-sm font-bold">{s.title}</p><p className="text-blue-200 text-xs mt-0.5">{s.desc}</p></div></div>
                ))}
              </div>
            )}

            {/* Upload steps */}
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4"><div className="w-10 h-10 bg-gray-100 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3" /><div className="h-2.5 bg-gray-100 rounded w-2/3" /></div></div>)}</div>
            ) : (
              <div className="space-y-4">
                <Step label="Government-Issued ID" desc="Passport, National ID, or Driver's License — front and back" status={getStepStatus(uploads.id)} icon={<FileText className="w-5 h-5" />} onUpload={() => handleFileUpload("id")} />
                <Step label="Selfie with ID" desc="Take a clear photo holding your ID next to your face" status={getStepStatus(uploads.selfie)} icon={<Camera className="w-5 h-5" />} onUpload={() => handleFileUpload("selfie")} />
                <Step label="Professional Certificate" desc="Optional — trade certifications, diplomas, or training docs" status={getStepStatus(uploads.cert)} icon={<BadgeCheck className="w-5 h-5" />} onUpload={() => handleFileUpload("cert")} />
              </div>
            )}

            {/* Hidden file inputs */}
            <input ref={idRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange("id", e.target.files?.[0] || null)} />
            <input ref={selfieRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange("selfie", e.target.files?.[0] || null)} />
            <input ref={certRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange("cert", e.target.files?.[0] || null)} />

            {(verifState.status === "unsubmitted" || verifState.status === "rejected") && (
              <button onClick={handleSubmit} disabled={!canSubmit || submitting}
                className="w-full bg-[#10b981] text-white py-4 rounded-2xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><ShieldCheck className="w-5 h-5" /> Submit for Verification</>}
              </button>
            )}

            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Important Notes</p>
              <ul className="text-xs text-gray-500 space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-[#10b981] shrink-0">•</span> All documents are stored securely and never shared publicly</li>
                <li className="flex items-start gap-2"><span className="text-[#10b981] shrink-0">•</span> Review takes 24–48 hours on business days</li>
                <li className="flex items-start gap-2"><span className="text-[#10b981] shrink-0">•</span> False documents will result in permanent ban</li>
                <li className="flex items-start gap-2"><span className="text-[#10b981] shrink-0">•</span> Verification may expire after 1 year and require renewal</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function TrendingUp({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>; }
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Upload, CheckCircle2, Clock, AlertCircle,
  Menu, ShieldCheck, FileText, Camera, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  doc, getDoc, updateDoc, serverTimestamp, addDoc, collection,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import toast, { Toaster } from "react-hot-toast";

type VerifStatus = "unsubmitted" | "pending" | "approved" | "rejected";

interface VerifState {
  status: VerifStatus;
  idUploaded: boolean;
  selfieUploaded: boolean;
  certUploaded: boolean;
  idName?: string;
  selfieName?: string;
  certName?: string;
  rejectionReason?: string;
  submittedAt?: { seconds: number };
}

// Convert file to base64 string
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Step({
  label, desc, status, icon, onUpload, uploading, fileName,
}: {
  label: string; desc: string;
  status: "done" | "pending" | "idle" | "rejected";
  icon: React.ReactNode;
  onUpload: () => void;
  uploading?: boolean;
  fileName?: string;
}) {
  const bg = {
    done:     "border-green-200 bg-green-50",
    pending:  "border-blue-200 bg-blue-50",
    rejected: "border-red-200 bg-red-50",
    idle:     "border-gray-200 bg-white",
  }[status];

  const iconBg = {
    done:     "bg-[#dcfce7] text-[#10b981]",
    pending:  "bg-[#e0f2fe] text-[#0284c7]",
    rejected: "bg-red-100 text-red-500",
    idle:     "bg-gray-100 text-gray-400",
  }[status];

  return (
    <div className={`rounded-2xl border-2 p-5 transition ${bg}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-[#0c4a6e]">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            {fileName && status !== "idle" && (
              <p className="text-xs text-[#10b981] font-medium mt-1">✓ {fileName}</p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {status === "done" ? (
            <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
          ) : status === "pending" ? (
            <Clock className="w-6 h-6 text-[#0284c7]" />
          ) : (
            <button
              onClick={onUpload}
              disabled={uploading}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition disabled:opacity-50 ${
                status === "rejected"
                  ? "text-red-600 bg-red-100 hover:bg-red-200"
                  : "text-[#10b981] bg-[#dcfce7] hover:bg-[#bbf7d0]"
              }`}
            >
              {uploading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Upload className="w-3.5 h-3.5" />}
              {uploading ? "Saving…" : status === "rejected" ? "Re-upload" : "Upload"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userId, setUserId]         = useState("");
  const [workerName, setWorkerName] = useState("");
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifState, setVerifState] = useState<VerifState>({
    status: "unsubmitted",
    idUploaded: false, selfieUploaded: false, certUploaded: false,
  });
  const [uploadingId, setUploadingId]         = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [uploadingCert, setUploadingCert]     = useState(false);

  const idRef     = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const certRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setWorkerName(d.displayName || d.fullName || "");
        setVerifState({
          status:          d.verificationStatus || "unsubmitted",
          idUploaded:      !!d.idFileName,
          selfieUploaded:  !!d.selfieFileName,
          certUploaded:    !!d.certFileName,
          idName:          d.idFileName || "",
          selfieName:      d.selfieFileName || "",
          certName:        d.certFileName || "",
          rejectionReason: d.rejectionReason || "",
          submittedAt:     d.verificationSubmittedAt,
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleFileChange = async (
    field: "id" | "selfie" | "cert",
    file: File | null,
  ) => {
    if (!file || !userId) return;

    // Max 1 MB — Firestore document limit is 1 MB total
    if (file.size > 1 * 1024 * 1024) {
      toast.error("File too large. Please use an image under 1 MB.", {
        style: { border: "1px solid #fecaca" },
        iconTheme: { primary: "#ef4444", secondary: "#fff" },
      });
      return;
    }

    const setUploading = field === "id" ? setUploadingId : field === "selfie" ? setUploadingSelfie : setUploadingCert;
    const label = field === "id" ? "ID document" : field === "selfie" ? "Selfie" : "Certificate";

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);

      // Save base64 data + filename to Firestore
      const fieldMap: Record<string, string> = {
        id:     "idFile",
        selfie: "selfieFile",
        cert:   "certFile",
      };
      const nameMap: Record<string, string> = {
        id:     "idFileName",
        selfie: "selfieFileName",
        cert:   "certFileName",
      };

      await updateDoc(doc(db, "users", userId), {
        [fieldMap[field]]: base64,
        [nameMap[field]]:  file.name,
      });

      setVerifState(prev => ({
        ...prev,
        [`${field}Uploaded`]: true,
        [`${field}Name`]:     file.name,
      }));

      toast.success(`${label} saved successfully!`, {
        style: { border: "1px solid #a7f3d0" },
        iconTheme: { primary: "#10b981", secondary: "#fff" },
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save file. Please try again.", {
        style: { border: "1px solid #fecaca" },
        iconTheme: { primary: "#ef4444", secondary: "#fff" },
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!verifState.idUploaded || !verifState.selfieUploaded) {
      toast.error("Please upload your ID and selfie before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const now = serverTimestamp();
      await updateDoc(doc(db, "users", userId), {
        verificationStatus:      "pending",
        verified:                false,
        verificationSubmittedAt: now,
      });
      await addDoc(collection(db, "notifications"), {
        userId:     "admin",
        type:       "verification_request",
        title:      "New Verification Request",
        body:       `${workerName || "A worker"} has submitted documents for ID verification.`,
        link:       "/admin/workers",
        workerId:   userId,
        workerName: workerName,
        read:       false,
        createdAt:  now,
      });
      setVerifState(prev => ({ ...prev, status: "pending" }));
      toast.success("Submitted! Our team will review within 24–48 hours.", {
        duration: 6000,
        style: { border: "1px solid #a7f3d0" },
        iconTheme: { primary: "#10b981", secondary: "#fff" },
      });
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStepStatus = (uploaded: boolean): "done" | "pending" | "idle" | "rejected" => {
    if (verifState.status === "approved") return "done";
    if (verifState.status === "rejected") return uploaded ? "rejected" : "idle";
    if (verifState.status === "pending" && uploaded) return "pending";
    return uploaded ? "done" : "idle";
  };

  const canSubmit =
    verifState.idUploaded &&
    verifState.selfieUploaded &&
    (verifState.status === "unsubmitted" || verifState.status === "rejected") &&
    !uploadingId && !uploadingSelfie;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <WorkerSidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <Menu className="w-5 h-5 text-[#0c4a6e]" />
          </button>
          <span className="text-base font-bold text-[#0c4a6e]">Verification</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-6">

            <div>
              <h1 className="text-xl font-bold text-[#0c4a6e]">Get Verified</h1>
              <p className="text-xs text-gray-400 mt-0.5">Verified workers earn 3× more and get priority placement</p>
            </div>

            {/* Status banners */}
            <AnimatePresence mode="wait">
              {verifState.status === "approved" && (
                <motion.div key="approved" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-[#dcfce7] border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <BadgeCheck className="w-6 h-6 text-[#10b981] shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#065f46]">You're Verified! ✓</p>
                    <p className="text-xs text-[#047857] mt-0.5">Your profile shows the verified badge. You can now apply for all jobs.</p>
                  </div>
                </motion.div>
              )}
              {verifState.status === "pending" && (
                <motion.div key="pending" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-[#e0f2fe] border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                  <Clock className="w-6 h-6 text-[#0284c7] shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#0c4a6e]">Documents Under Review</p>
                    <p className="text-xs text-[#0369a1] mt-0.5">
                      Submitted {verifState.submittedAt
                        ? new Date(verifState.submittedAt.seconds * 1000).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })
                        : "recently"}. Admin will review within 24–48 hours.
                    </p>
                  </div>
                </motion.div>
              )}
              {verifState.status === "rejected" && (
                <motion.div key="rejected" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Verification Rejected</p>
                    <p className="text-xs text-red-600 mt-1 leading-relaxed">
                      {verifState.rejectionReason || "Documents were unclear. Please re-upload clear photos and resubmit."}
                    </p>
                    <p className="text-xs text-red-500 mt-1.5 font-medium">Re-upload your documents below and submit again.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Why verify */}
            {verifState.status === "unsubmitted" && (
              <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] rounded-2xl p-5 text-white grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <BadgeCheck className="w-5 h-5 text-[#34d399]" />, title: "Verified Badge", desc: "Blue badge shown to all clients" },
                  { icon: <TrendingUp className="w-5 h-5 text-yellow-300" />, title: "3× More Jobs", desc: "Priority in search results" },
                  { icon: <ShieldCheck className="w-5 h-5 text-blue-300" />, title: "Trusted Status", desc: "Clients prefer verified workers" },
                ].map(s => (
                  <div key={s.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">{s.icon}</div>
                    <div><p className="text-sm font-bold">{s.title}</p><p className="text-blue-200 text-xs mt-0.5">{s.desc}</p></div>
                  </div>
                ))}
              </div>
            )}

            {/* File size notice */}
            {(verifState.status === "unsubmitted" || verifState.status === "rejected") && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <span className="text-base shrink-0">💡</span>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Please upload clear photos under <strong>1 MB</strong> each. If your photo is too large, use a free tool like{" "}
                  <a href="https://squoosh.app" target="_blank" rel="noopener noreferrer" className="underline font-medium">squoosh.app</a>{" "}
                  to compress it before uploading.
                </p>
              </div>
            )}

            {/* Upload steps */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <Step
                  label="Government-Issued ID"
                  desc="Passport, National ID (NIN slip), or Driver's License"
                  status={getStepStatus(verifState.idUploaded)}
                  icon={<FileText className="w-5 h-5" />}
                  onUpload={() => idRef.current?.click()}
                  uploading={uploadingId}
                  fileName={verifState.idName}
                />
                <Step
                  label="Selfie with ID"
                  desc="A clear photo of you holding your ID next to your face"
                  status={getStepStatus(verifState.selfieUploaded)}
                  icon={<Camera className="w-5 h-5" />}
                  onUpload={() => selfieRef.current?.click()}
                  uploading={uploadingSelfie}
                  fileName={verifState.selfieName}
                />
                <Step
                  label="Professional Certificate"
                  desc="Optional — trade certifications, diplomas, or training documents"
                  status={getStepStatus(verifState.certUploaded)}
                  icon={<BadgeCheck className="w-5 h-5" />}
                  onUpload={() => certRef.current?.click()}
                  uploading={uploadingCert}
                  fileName={verifState.certName}
                />
              </div>
            )}

            {/* Hidden inputs */}
            <input ref={idRef}     type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => { handleFileChange("id",     e.target.files?.[0] || null); e.target.value = ""; }} />
            <input ref={selfieRef} type="file" accept="image/*"      className="hidden"
              onChange={e => { handleFileChange("selfie", e.target.files?.[0] || null); e.target.value = ""; }} />
            <input ref={certRef}   type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => { handleFileChange("cert",   e.target.files?.[0] || null); e.target.value = ""; }} />

            {/* Submit */}
            {(verifState.status === "unsubmitted" || verifState.status === "rejected") && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full bg-[#10b981] text-white py-4 rounded-2xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
              >
                {submitting
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting to Admin…</>
                  : <><ShieldCheck className="w-5 h-5" /> Submit for Verification</>}
              </motion.button>
            )}

            {(verifState.status === "unsubmitted" || verifState.status === "rejected") && !canSubmit && !submitting && (
              <p className="text-center text-xs text-gray-400">
                {!verifState.idUploaded && !verifState.selfieUploaded
                  ? "Upload your ID and selfie to continue"
                  : !verifState.idUploaded ? "Upload your ID document to continue"
                  : !verifState.selfieUploaded ? "Upload your selfie photo to continue"
                  : "Uploading files, please wait…"}
              </p>
            )}

            {/* Notes */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Important Notes</p>
              <ul className="text-xs text-gray-500 space-y-1.5 leading-relaxed">
                {[
                  "All documents are stored securely and never shared publicly",
                  "Admin review takes 24–48 hours on business days",
                  "You will be notified when your verification is approved or rejected",
                  "False or edited documents will result in a permanent ban",
                ].map((note, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#10b981] shrink-0">•</span>{note}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
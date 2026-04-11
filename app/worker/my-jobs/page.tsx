"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck, CheckCircle2, MapPin, X, Menu, Search,
  MessageCircle, ShieldAlert, Loader2, Play, Flag,
  ChevronRight, Calendar, CreditCard, User, Clock, Inbox,
  AlertCircle, BadgeCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp, getDocs
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import toast, { Toaster } from "react-hot-toast";

type JobStatus = "pending" | "awaiting_payment" | "in-progress" | "completed" | "disputed";

interface Job {
  id: string;
  clientId?: string;
  clientName?: string;
  service?: string;
  category?: string;
  description?: string;
  address?: string;
  date?: string;
  time?: string;
  amount?: number;
  status: JobStatus;
  paymentStatus?: string; // "pending_verification" | "paid" | "released"
  createdAt?: { seconds: number };
  startedAt?: { seconds: number };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, paymentStatus }: { status: JobStatus; paymentStatus?: string }) {
  // Show payment pending state prominently
  if (paymentStatus === "pending_verification") {
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-100 text-amber-700 border-amber-200">Payment Verifying</span>;
  }
  const map: Record<JobStatus, { cls: string; label: string }> = {
    pending:           { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Pending"        },
    awaiting_payment:  { cls: "bg-amber-100 text-amber-700 border-amber-200",    label: "Awaiting Payment"},
    "in-progress":     { cls: "bg-blue-100 text-[#0284c7] border-blue-200",      label: "In Progress"    },
    completed:         { cls: "bg-green-100 text-[#10b981] border-green-200",    label: "Completed"      },
    disputed:          { cls: "bg-red-100 text-red-600 border-red-200",          label: "Disputed"       },
  };
  const { cls, label } = map[status] || map.pending;
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
}

// ─── Job Detail Modal ─────────────────────────────────────────────────────────
function JobModal({ job, onClose, onAction }: {
  job: Job;
  onClose: () => void;
  onAction: (action: string, job: Job) => Promise<void>;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const act = async (a: string) => { setLoading(a); await onAction(a, job); setLoading(null); };

  const isPendingVerification = job.paymentStatus === "pending_verification";
  const isPaid = job.paymentStatus === "paid" || job.paymentStatus === "escrow";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#075985] p-5 text-white shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-blue-300 mb-0.5">#{job.id.slice(-6).toUpperCase()}</p>
              <h3 className="font-bold text-base">{job.service || job.category || "Service Job"}</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <StatusBadge status={job.status} paymentStatus={job.paymentStatus} />
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="space-y-0.5">
            {[
              { icon: <User className="w-3.5 h-3.5" />,       label: "Client",       value: job.clientName || "—" },
              { icon: <MapPin className="w-3.5 h-3.5" />,     label: "Location",     value: job.address || "—" },
              { icon: <Calendar className="w-3.5 h-3.5" />,   label: "Date",         value: job.date ? `${job.date}${job.time ? ` at ${job.time}` : ""}` : "—" },
              ...(job.amount ? [{ icon: <CreditCard className="w-3.5 h-3.5" />, label: "Your Earnings", value: `₦${job.amount.toLocaleString()}` }] : []),
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 text-gray-400 text-xs">{icon}{label}</div>
                <span className="text-sm font-semibold text-[#0c4a6e]">{value}</span>
              </div>
            ))}
          </div>

          {job.description && (
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-500 leading-relaxed">{job.description}</p>
            </div>
          )}

          {/* Payment status banners */}
          {isPendingVerification && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-amber-800">Payment Being Verified</p>
                <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                  The client has submitted payment. Our admin is verifying the transfer. You'll be notified once confirmed and the job is activated.
                </p>
              </div>
            </div>
          )}

          {isPaid && job.status === "in-progress" && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#065f46]">Payment Confirmed ✓</p>
                <p className="text-xs text-[#047857] mt-1 leading-relaxed">
                  ₦{job.amount?.toLocaleString()} is held in escrow. Complete the job and mark it done to receive your payment.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 space-y-2 shrink-0">

          {/* Only allow start if payment is confirmed (paid/escrow), not just pending_verification */}
          {job.status === "in-progress" && isPaid && (
            <button onClick={() => act("complete")} disabled={loading === "complete"}
              className="w-full bg-[#10b981] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#059669] transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
              {loading === "complete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
              Mark Job Complete
            </button>
          )}

          {/* Payment still being verified — can't start yet */}
          {isPendingVerification && (
            <button disabled
              className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl text-sm font-bold cursor-not-allowed flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Waiting for Payment Confirmation
            </button>
          )}

          {(job.status === "in-progress" || isPendingVerification) && (
            <button onClick={() => act("message")}
              className="w-full bg-[#0284c7] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0369a1] transition flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Message Client
            </button>
          )}

          {job.status === "in-progress" && isPaid && (
            <button onClick={() => act("dispute")}
              className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Open Dispute
            </button>
          )}

          {job.status === "completed" && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#065f46]">Job Complete!</p>
                <p className="text-xs text-[#047857] mt-0.5">Payment of ₦{job.amount?.toLocaleString()} will be released to your wallet within 24 hours.</p>
              </div>
            </div>
          )}

          {job.status === "disputed" && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-xs text-red-700 font-medium">This job is under dispute. Our team is reviewing it.</p>
            </div>
          )}

          <button onClick={onClose} className="w-full py-2.5 bg-gray-50 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-100 transition">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyJobsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [activeTab, setActiveTab]     = useState<JobStatus | "all">("all");
  const [selected, setSelected]       = useState<Job | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/login"); return; }

      const q = query(collection(db, "jobs"), where("workerId", "==", user.uid));
      const unsubSnap = onSnapshot(q, snap => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Job))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setJobs(data);
        setLoading(false);
      });

      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  const handleAction = async (action: string, job: Job) => {
    try {
      if (action === "complete") {
        await updateDoc(doc(db, "jobs", job.id), {
          status:      "completed",
          completedAt: serverTimestamp(),
        });

        // Notify client — job done, please confirm
        await addDoc(collection(db, "notifications"), {
          userId:    job.clientId,
          type:      "job",
          title:     "Job marked complete 🎉",
          body:      `Your worker has marked "${job.service || job.category || "the service"}" as complete. Payment will be released to them shortly.`,
          link:      `/client/bookings?booking=${job.id}`,
          read:      false,
          createdAt: serverTimestamp(),
        });

        // Notify admin — release payment
        await addDoc(collection(db, "notifications"), {
          userId:    "admin",
          type:      "payment_release",
          title:     "💸 Job Complete — Release Payment",
          body:      `Worker has completed "${job.service || job.category || "a service"}". Release ₦${job.amount?.toLocaleString()} from escrow to their wallet.`,
          link:      "/admin/payments",
          jobId:     job.id,
          workerId:  auth.currentUser?.uid,
          amount:    job.amount,
          read:      false,
          createdAt: serverTimestamp(),
        });

        toast.success("Job marked complete! Payment will be released to your wallet.");
        setSelected(null);

      } else if (action === "message") {
        router.push(`/worker/messages?client=${job.clientId}`);
      } else if (action === "dispute") {
        router.push(`/worker/disputes?job=${job.id}`);
      }
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const TABS: { id: JobStatus | "all"; label: string }[] = [
    { id: "all",              label: "All"              },
    { id: "awaiting_payment", label: "Awaiting Payment" },
    { id: "in-progress",      label: "In Progress"      },
    { id: "completed",        label: "Completed"        },
    { id: "disputed",         label: "Disputed"         },
  ];

  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    if (t.id === "all") { acc[t.id] = jobs.length; return acc; }
    if (t.id === "awaiting_payment") {
      // Count jobs where paymentStatus is pending_verification OR status is awaiting_payment
      acc[t.id] = jobs.filter(j => j.paymentStatus === "pending_verification" || j.status === "awaiting_payment").length;
      return acc;
    }
    acc[t.id] = jobs.filter(j => j.status === t.id).length;
    return acc;
  }, {});

  const filtered = jobs.filter(j => {
    let matchTab = false;
    if (activeTab === "all") matchTab = true;
    else if (activeTab === "awaiting_payment") matchTab = j.paymentStatus === "pending_verification" || j.status === "awaiting_payment";
    else matchTab = j.status === activeTab;

    const matchSearch = !search || [j.service, j.category, j.clientName, j.address]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return matchTab && matchSearch;
  });

  const inProgressCount       = jobs.filter(j => j.status === "in-progress").length;
  const awaitingPaymentCount  = jobs.filter(j => j.paymentStatus === "pending_verification").length;

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
          <span className="text-base font-bold text-[#0c4a6e]">My Jobs</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#0c4a6e]">My Jobs</h1>
                <p className="text-xs text-gray-400 mt-0.5">{jobs.length} total job{jobs.length !== 1 ? "s" : ""}</p>
              </div>
              {inProgressCount > 0 && (
                <button onClick={() => setActiveTab("in-progress")}
                  className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0369a1] transition shadow-sm">
                  <Clock className="w-3.5 h-3.5" /> {inProgressCount} active
                </button>
              )}
            </div>

            {/* Awaiting payment alert */}
            {awaitingPaymentCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    {awaitingPaymentCount} payment{awaitingPaymentCount > 1 ? "s" : ""} being verified
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    A client has submitted payment for your offer. Admin is verifying the transfer. You'll be notified once confirmed.
                  </p>
                </div>
              </div>
            )}

            {/* Quick stats */}
            {jobs.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Awaiting Pay",  count: awaitingPaymentCount,                          cls: "bg-amber-50 border-amber-200 text-amber-700"      },
                  { label: "In Progress",   count: inProgressCount,                               cls: "bg-[#e0f2fe] border-blue-200 text-[#0284c7]"      },
                  { label: "Completed",     count: jobs.filter(j => j.status === "completed").length, cls: "bg-[#f0fdf4] border-green-200 text-[#10b981]" },
                  { label: "Disputed",      count: jobs.filter(j => j.status === "disputed").length,  cls: "bg-red-50 border-red-200 text-red-600"         },
                ].map(s => (
                  <div key={s.label} className={`border-2 rounded-2xl p-3 text-center ${s.cls}`}>
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-xs font-semibold mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by service, client, or location..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${activeTab === tab.id ? "bg-[#10b981] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
                  {tab.label}
                  {counts[tab.id] > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {counts[tab.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Job grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filtered.map(job => {
                    const isPendingVerif = job.paymentStatus === "pending_verification";
                    return (
                      <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelected(job)}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden group relative">

                        {/* Awaiting payment pulse badge */}
                        {isPendingVerif && (
                          <div className="absolute top-3 right-3 z-10">
                            <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-pulse">
                              <Clock className="w-2.5 h-2.5" /> Verifying
                            </span>
                          </div>
                        )}

                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3 pr-16">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0c4a6e] truncate">{job.service || job.category || "Service Job"}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{job.clientName || "Client"}</p>
                            </div>
                            <StatusBadge status={job.status} paymentStatus={job.paymentStatus} />
                          </div>

                          <div className="space-y-1.5 mb-4">
                            {job.address && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <MapPin className="w-3 h-3 text-gray-300 shrink-0" /><span className="truncate">{job.address}</span>
                              </div>
                            )}
                            {job.date && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <CalendarCheck className="w-3 h-3 text-gray-300 shrink-0" />{job.date}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            <span className={`text-sm font-bold ${job.amount ? "text-[#0c4a6e]" : "text-gray-300 text-xs"}`}>
                              {job.amount ? `₦${job.amount.toLocaleString()}` : "No amount set"}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-[#10b981] font-semibold group-hover:gap-2 transition-all">
                              View <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>

                        <div className={`h-0.5 ${
                          isPendingVerif          ? "bg-amber-400"   :
                          job.status === "in-progress" ? "bg-[#0284c7]"  :
                          job.status === "completed"   ? "bg-[#10b981]"  :
                          job.status === "disputed"    ? "bg-red-400"    :
                          "bg-yellow-300"
                        }`} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                {search ? (
                  <>
                    <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-gray-400 mb-1">No jobs match "{search}"</h3>
                    <button onClick={() => setSearch("")} className="text-sm text-[#10b981] hover:underline mt-2">Clear search</button>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-gray-400 mb-1">No {activeTab === "all" ? "" : activeTab + " "}jobs yet</h3>
                    <p className="text-sm text-gray-300 mb-5">
                      {activeTab === "all"
                        ? "When a client accepts your offer and pays, the job appears here"
                        : "No jobs in this category right now"}
                    </p>
                    {activeTab === "all" && (
                      <Link href="/worker/jobs"
                        className="inline-flex items-center gap-2 bg-[#10b981] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#059669] transition">
                        <Inbox className="w-4 h-4" /> Browse Job Requests
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {selected && <JobModal job={selected} onClose={() => setSelected(null)} onAction={handleAction} />}
      </AnimatePresence>
    </div>
  );
}
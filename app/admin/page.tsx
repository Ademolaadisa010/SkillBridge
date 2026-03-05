"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Briefcase, CreditCard, ShieldAlert, Wallet,
  TrendingUp, TrendingDown, ArrowRight, Clock,
  CheckCircle2, AlertTriangle, BarChart3, Activity,
  RefreshCcw, Eye
} from "lucide-react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, where, orderBy, limit, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

interface Stats {
  totalUsers: number;
  totalWorkers: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalPayments: number;
  escrowAmount: number;
  openDisputes: number;
  pendingWithdrawals: number;
}

interface RecentItem {
  id: string;
  type: "job" | "payment" | "dispute" | "withdrawal";
  title: string;
  subtitle: string;
  status: string;
  amount?: number;
  createdAt?: { seconds: number };
}

function fmt(s?: number) {
  if (!s) return "—";
  return new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({
  label, value, icon: Icon, color, sub, trend, href
}: {
  label: string; value: string | number; icon: any; color: string;
  sub?: string; trend?: number; href?: string;
}) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[#0f172a]">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0284c7] opacity-0 group-hover:opacity-100 transition">
          View all <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </motion.div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalWorkers: 0, totalJobs: 0, activeJobs: 0,
    completedJobs: 0, totalPayments: 0, escrowAmount: 0,
    openDisputes: 0, pendingWithdrawals: 0,
  });
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/admin/login"); return; }

      // Fetch all stats in parallel
      const [usersSnap, workersSnap, jobsSnap, paymentsSnap, disputesSnap, withdrawalsSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "client"))),
        getDocs(query(collection(db, "users"), where("role", "==", "worker"))),
        getDocs(collection(db, "jobs")),
        getDocs(collection(db, "payments")),
        getDocs(query(collection(db, "disputes"), where("status", "==", "open"))),
        getDocs(query(collection(db, "withdrawals"), where("status", "==", "pending"))),
      ]);

      const jobs = jobsSnap.docs.map(d => d.data());
      const payments = paymentsSnap.docs.map(d => d.data());

      setStats({
        totalUsers: usersSnap.size,
        totalWorkers: workersSnap.size,
        totalJobs: jobsSnap.size,
        activeJobs: jobs.filter(j => j.status === "in-progress").length,
        completedJobs: jobs.filter(j => j.status === "completed").length,
        totalPayments: payments.reduce((s, p) => s + (p.amount || 0), 0),
        escrowAmount: payments.filter(p => p.status === "escrow").reduce((s, p) => s + (p.amount || 0), 0),
        openDisputes: disputesSnap.size,
        pendingWithdrawals: withdrawalsSnap.size,
      });

      // Recent activity: last 10 jobs + payments
      const recentJobsSnap = await getDocs(query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(5)));
      const recentPaymentsSnap = await getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(5)));

      const items: RecentItem[] = [
        ...recentJobsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id, type: "job" as const,
            title: data.service || data.category || "Job",
            subtitle: data.clientName || "Client",
            status: data.status || "pending",
            createdAt: data.createdAt,
          };
        }),
        ...recentPaymentsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id, type: "payment" as const,
            title: data.service || "Payment",
            subtitle: data.workerName || "Worker",
            status: data.status || "pending",
            amount: data.amount,
            createdAt: data.createdAt,
          };
        }),
      ];
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRecent(items.slice(0, 10));
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    "in-progress": "bg-blue-100 text-[#0284c7]",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-600",
    disputed: "bg-orange-100 text-orange-700",
    escrow: "bg-blue-100 text-[#0284c7]",
    released: "bg-emerald-100 text-emerald-700",
    refunded: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0 flex items-center justify-between">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-lg font-bold text-[#0f172a]">Dashboard</h1>
            <p className="text-xs text-gray-400">Welcome back, Admin</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse h-32" />
              ))}
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Clients" value={stats.totalUsers} icon={Users} color="bg-[#0284c7]" href="/admin/users" />
                <StatCard label="Workers" value={stats.totalWorkers} icon={Briefcase} color="bg-[#10b981]" href="/admin/workers" />
                <StatCard label="Total Jobs" value={stats.totalJobs} icon={BarChart3} color="bg-violet-500"
                  sub={`${stats.activeJobs} active · ${stats.completedJobs} done`} href="/admin/jobs" />
                <StatCard label="Open Disputes" value={stats.openDisputes} icon={ShieldAlert}
                  color={stats.openDisputes > 0 ? "bg-red-500" : "bg-gray-400"} href="/admin/disputes" />
                <StatCard label="Total Payments" value={`₦${stats.totalPayments.toLocaleString()}`} icon={CreditCard} color="bg-[#0284c7]" href="/admin/payments" />
                <StatCard label="In Escrow" value={`₦${stats.escrowAmount.toLocaleString()}`} icon={Activity} color="bg-amber-500" />
                <StatCard label="Pending Withdrawals" value={stats.pendingWithdrawals} icon={Wallet}
                  color={stats.pendingWithdrawals > 0 ? "bg-orange-500" : "bg-gray-400"} href="/admin/withdrawals" />
                <StatCard label="Active Jobs" value={stats.activeJobs} icon={Clock} color="bg-indigo-500" />
              </div>

              {/* Recent activity */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-bold text-[#0f172a]">Recent Activity</h2>
                  <RefreshCcw className="w-4 h-4 text-gray-300" />
                </div>
                <div className="divide-y divide-gray-50">
                  {recent.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400">No recent activity</div>
                  ) : recent.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === "job" ? "bg-violet-100" : "bg-blue-100"
                      }`}>
                        {item.type === "job" ? <Briefcase className="w-4 h-4 text-violet-600" /> : <CreditCard className="w-4 h-4 text-[#0284c7]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0f172a] truncate">{item.title}</p>
                        <p className="text-xs text-gray-400">{item.subtitle} · {fmt(item.createdAt?.seconds)}</p>
                      </div>
                      {item.amount && (
                        <span className="text-sm font-bold text-[#0284c7]">₦{item.amount.toLocaleString()}</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColor[item.status] || "bg-gray-100 text-gray-500"}`}>
                        {item.status.replace(/-/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Filter, X, Eye, Ban, CheckCircle2,
  Users, Mail, Phone, Calendar, MoreVertical,
  ChevronLeft, ChevronRight, AlertCircle, Menu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, orderBy, serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface User {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role: string;
  status?: "active" | "suspended";
  createdAt?: { seconds: number };
  totalBookings?: number;
  totalSpent?: number;
}

function fmt(s?: number) {
  if (!s) return "—";
  return new Date(s * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function getInitials(name: string) {
  return (name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
const COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-cyan-500"];
function avatarColor(name: string) { return COLORS[(name || "U").charCodeAt(0) % COLORS.length]; }

function UserDetailModal({ user, onClose, onToggleStatus }: {
  user: User; onClose: () => void; onToggleStatus: (u: User) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#0284c7] to-[#0369a1] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${avatarColor(user.displayName || "")} rounded-2xl flex items-center justify-center text-white text-lg font-bold border-2 border-white/30`}>
              {getInitials(user.displayName || "U")}
            </div>
            <div>
              <h3 className="font-bold text-lg">{user.displayName || "Unknown"}</h3>
              <p className="text-blue-100 text-sm">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Status</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${user.status === "suspended" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                {user.status === "suspended" ? "Suspended" : "Active"}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Joined</p>
              <p className="text-sm font-semibold text-[#0f172a]">{fmt(user.createdAt?.seconds)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Total Bookings</p>
              <p className="text-sm font-semibold text-[#0f172a]">{user.totalBookings || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Total Spent</p>
              <p className="text-sm font-semibold text-[#0f172a]">₦{(user.totalSpent || 0).toLocaleString()}</p>
            </div>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              {user.phone}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { onToggleStatus(user); onClose(); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                user.status === "suspended"
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              {user.status === "suspended" ? "Unsuspend User" : "Suspend User"}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [selected, setSelected] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/admin/login"); return; }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "client"));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUsers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = users;
    if (search) result = result.filter(u =>
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== "all") result = result.filter(u =>
      statusFilter === "suspended" ? u.status === "suspended" : u.status !== "suspended"
    );
    setFiltered(result);
    setPage(0);
  }, [users, search, statusFilter]);

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    await updateDoc(doc(db, "users", user.id), { status: newStatus, updatedAt: serverTimestamp() });
    toast.success(`User ${newStatus === "suspended" ? "suspended" : "unsuspended"}`);
  };

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <Toaster position="top-right" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-lg font-bold text-[#0f172a]">Clients</h1>
            <p className="text-xs text-gray-400">{users.length} registered clients</p>
          </div>
        </header>

        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-3 shrink-0">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>
          <select
            value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <main className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-16 border border-gray-100" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Users className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No users found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <span>Name</span><span>Email</span><span>Joined</span>
                  <span>Bookings</span><span>Status</span><span></span>
                </div>
                <div className="divide-y divide-gray-50">
                  {paginated.map(user => (
                    <div key={user.id} className="flex md:grid md:grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 ${avatarColor(user.displayName || "")} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {getInitials(user.displayName || "U")}
                        </div>
                        <span className="text-sm font-semibold text-[#0f172a] truncate">{user.displayName || "—"}</span>
                      </div>
                      <span className="hidden md:block text-sm text-gray-500 truncate">{user.email || "—"}</span>
                      <span className="hidden md:block text-xs text-gray-400">{fmt(user.createdAt?.seconds)}</span>
                      <span className="hidden md:block text-sm font-semibold text-[#0f172a]">{user.totalBookings || 0}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full w-fit ${user.status === "suspended" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                        {user.status === "suspended" ? "Suspended" : "Active"}
                      </span>
                      <button
                        onClick={() => setSelected(user)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-400">{filtered.length} users · Page {page + 1} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selected && <UserDetailModal user={selected} onClose={() => setSelected(null)} onToggleStatus={toggleStatus} />}
      </AnimatePresence>
    </div>
  );
}
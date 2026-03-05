"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Briefcase, CreditCard,
  ShieldAlert, Wallet, Settings, LogOut, ChevronLeft,
  ChevronRight, Bell, Shield, BarChart3, Menu, X
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

const NAV = [
  { label: "Dashboard",   href: "/admin",               icon: LayoutDashboard },
  { label: "Users",       href: "/admin/users",         icon: Users },
  { label: "Workers",     href: "/admin/workers",       icon: Briefcase },
  { label: "Jobs",        href: "/admin/jobs",          icon: BarChart3 },
  { label: "Payments",    href: "/admin/payments",      icon: CreditCard },
  { label: "Disputes",    href: "/admin/disputes",      icon: ShieldAlert },
  { label: "Withdrawals", href: "/admin/withdrawals",   icon: Wallet },
  { label: "Settings",    href: "/admin/settings",      icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  const SidebarContent = () => (
    <aside className={`flex flex-col h-full bg-[#0f172a] text-white transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 bg-gradient-to-br from-[#0284c7] to-[#0369a1] rounded-lg flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white">SkillBridge</p>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Admin</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto w-6 h-6 bg-white/10 rounded-md flex items-center justify-center hover:bg-white/20 transition hidden lg:flex"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition group
                ${active
                  ? "bg-[#0284c7] text-white shadow-lg shadow-[#0284c7]/25"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
                } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-9 h-9 bg-[#0f172a] text-white rounded-xl flex items-center justify-center shadow-lg"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative flex h-full">
            <SidebarContent />
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
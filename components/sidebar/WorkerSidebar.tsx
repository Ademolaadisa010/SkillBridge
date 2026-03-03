"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  LayoutDashboard, Inbox, CalendarCheck, Wallet,
  Star, BadgeCheck, MessageCircle, ShieldAlert,
  Bell, Settings, HelpCircle, LogOut
} from "lucide-react";

const navItems = [
  { name: "Dashboard",      href: "/worker/dashboard",      icon: <LayoutDashboard className="w-4 h-4" /> },
  { name: "Job Requests",   href: "/worker/jobs",           icon: <Inbox className="w-4 h-4" /> },
  { name: "My Jobs",        href: "/worker/my-jobs",        icon: <CalendarCheck className="w-4 h-4" /> },
  { name: "Earnings",       href: "/worker/earnings",       icon: <Wallet className="w-4 h-4" /> },
  { name: "Messages",       href: "/worker/messages",       icon: <MessageCircle className="w-4 h-4" /> },
  { name: "Reviews",        href: "/worker/reviews",        icon: <Star className="w-4 h-4" /> },
  { name: "Verification",   href: "/worker/verification",   icon: <BadgeCheck className="w-4 h-4" /> },
  { name: "Disputes",       href: "/worker/disputes",       icon: <ShieldAlert className="w-4 h-4" /> },
  { name: "Notifications",  href: "/worker/notifications",  icon: <Bell className="w-4 h-4" /> },
  { name: "Settings",       href: "/worker/settings",       icon: <Settings className="w-4 h-4" /> },
  { name: "Help Center",    href: "/help",                  icon: <HelpCircle className="w-4 h-4" /> },
];

export default function WorkerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 hidden lg:flex flex-col h-screen sticky top-0">

      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-6 border-b border-gray-100">
        <div className="w-9 h-9 bg-[#10b981] rounded-lg flex items-center justify-center shadow-sm shrink-0">
          <i className="fas fa-handshake text-white text-base"></i>
        </div>
        <span className="text-lg font-bold text-[#0c4a6e] tracking-tight">SkillBridge</span>
      </div>

      {/* Label */}
      <div className="px-6 pt-5 pb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Worker Menu</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col px-3 space-y-0.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-[#10b981] text-white shadow-md"
                  : "text-gray-600 hover:bg-[#f0fdf4] hover:text-[#10b981]"
              }`}
            >
              <span className={`transition-colors shrink-0 ${
                isActive ? "text-white" : "text-gray-400 group-hover:text-[#10b981]"
              }`}>
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-80" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors shrink-0" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>

    </aside>
  );
}
"use client";

import Link from "next/link";
import Logo from "@/public/logo.jpg";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Image from "next/image";

export default function ClientSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "Dashboard",      href: "/client/dashboard",   icon: "fa-solid fa-house" },
    { name: "Book Service",   href: "/client/book",        icon: "fa-solid fa-calendar-plus" },
    { name: "My Bookings",    href: "/client/bookings",    icon: "fa-solid fa-calendar-check" },
    { name: "Messages",       href: "/client/messages",    icon: "fa-solid fa-message" },
    { name: "Payments",       href: "/client/payments",    icon: "fa-solid fa-credit-card" },
    { name: "Saved Workers",  href: "/client/saved",       icon: "fa-solid fa-bookmark" },
    { name: "Disputes",       href: "/client/disputes",    icon: "fa-solid fa-scale-balanced" },
    { name: "Notifications",  href: "/client/notifications", icon: "fa-solid fa-bell" },
    { name: "Settings",       href: "/client/settings",    icon: "fa-solid fa-gear" },
    { name: "Help Center",    href: "/help",               icon: "fa-solid fa-circle-question" },
  ];

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
        <Image src={Logo} alt="logo" width={150}/>
      </div>

      {/* Label */}
      <div className="px-6 pt-5 pb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Menu</span>
      </div>

      {/* Nav Links */}
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
                  ? "bg-[#0284c7] text-white shadow-md"
                  : "text-gray-600 hover:bg-[#f0f9ff] hover:text-[#0284c7]"
              }`}
            >
              <i className={`${item.icon} w-5 text-center text-sm transition-colors ${
                isActive ? "text-white" : "text-gray-400 group-hover:text-[#0284c7]"
              }`} />
              <span className="text-sm font-medium">{item.name}</span>

              {/* Active indicator dot */}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-80" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
        >
          <i className="fa-solid fa-right-from-bracket w-5 text-center text-sm text-gray-400 group-hover:text-red-500 transition-colors" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
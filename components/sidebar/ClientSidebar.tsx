"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function ClientSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "Dashboard", href: "/client/dashboard", icon: "fa-solid fa-house" },
    { name: "Book Service", href: "/book", icon: "fas fa-calendar" },
    { name: "Messages", href: "/message", icon: "fa-solid fa-message" },
    { name: "Bookmark", href: "/bookmark", icon: "fa-solid fa-bookmark" },
    { name: "Profile", href: "/client-profile", icon: "fa-solid fa-user" },
  ];

  const handleLogout = () => {
    // Add your logout logic here (e.g., supabase.auth.signOut() or next-auth signOut())
    console.log("Logging out...");
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 hidden lg:flex flex-col h-screen sticky top-0">
      {/* Logo Section */}
      <div className="flex items-center justify-center pt-8 pb-4 space-x-2">
        <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#2A9D8F] rounded-lg flex items-center justify-center shadow-sm">
          <i className="fas fa-handshake text-white text-lg"></i>
        </div>
        <span className="text-xl font-bold text-gray-800 tracking-tight">SkillBridge</span>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex flex-col mt-8 px-4 space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center py-3 px-4 rounded-md transition-all duration-200 group ${
                isActive
                  ? "bg-[#FF6B35] text-white shadow-md"
                  : "text-gray-600 hover:bg-orange-50 hover:text-[#FF6B35]"
              }`}
            >
              <i className={`${item.icon} w-6 transition-colors ${
                isActive ? "text-white" : "text-gray-400 group-hover:text-[#FF6B35]"
              }`}></i>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Section */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center w-full py-3 px-4 rounded-md text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
        >
          <i className="fa-solid fa-right-from-bracket w-6 text-gray-400 group-hover:text-red-600"></i>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
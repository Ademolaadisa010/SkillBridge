
"use client";

import Link from "next/link";
import {
  FaHome,
  FaSearch,
  FaCalendarAlt,
  FaRegCommentDots,
  FaUser,
} from "react-icons/fa";




export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {/* Home */}
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-primary"
        >
          <FaHome className="text-xl" />
          <span className="text-xs font-semibold">Home</span>
        </Link>

        {/* Search */}
        <Link
          href="/search"
          className="flex flex-col items-center gap-1 text-gray-600"
        >
          <FaSearch className="text-xl" />
          <span className="text-xs">Search</span>
        </Link>

        {/* Bookings */}
        <Link
          href="/bookings"
          className="flex flex-col items-center gap-1 text-gray-600"
        >
          <FaCalendarAlt className="text-xl" />
          <span className="text-xs">Bookings</span>
        </Link>

        {/* Messages */}
        <Link
          href="/messages"
          className="flex flex-col items-center gap-1 text-gray-600 relative"
        >
          <FaRegCommentDots className="text-xl" />
          <span className="text-xs">Messages</span>

          {/* Notification dot */}
          <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className="flex flex-col items-center gap-1 text-gray-600"
        >
          <FaUser className="text-xl" />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </nav>
  );
}

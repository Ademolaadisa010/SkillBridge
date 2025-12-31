"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function Register() {
  const router = useRouter();

  // 🔐 Backend state
  const [role, setRole] = useState<"client" | "worker">("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🚀 Register logic (backend only)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Create Auth user
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 2️⃣ Save user profile to Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        fullName,
        email,
        phone,
        role,
        createdAt: new Date(),
      });

      // 3️⃣ Redirect by role
      router.push(
        role === "client"
          ? "/client/dashboard"
          : "/worker/dashboard"
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-[#E9F5F3] to-white p-6 sm:p-8 rounded-2xl shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-[#264653] mb-2">
              Create Account
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Join as a client or skilled worker
            </p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`py-3 rounded-lg font-semibold transition ${
                role === "client"
                  ? "bg-[#FF6B35] text-white"
                  : "bg-white text-[#FF6B35] border-2 border-[#FF6B35]"
              }`}
            >
              <i className="fas fa-user mr-2"></i>Client
            </button>

            <button
              type="button"
              onClick={() => setRole("worker")}
              className={`py-3 rounded-lg font-semibold transition ${
                role === "worker"
                  ? "bg-[#FF6B35] text-white"
                  : "bg-white text-[#FF6B35] border-2 border-[#FF6B35]"
              }`}
            >
              <i className="fas fa-briefcase mr-2"></i>Worker
            </button>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#264653] mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#264653] mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#264653] mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Create a password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B35] text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#FF6B35] font-semibold hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

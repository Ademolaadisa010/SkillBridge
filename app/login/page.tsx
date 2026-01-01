"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function Login() {
  const router = useRouter();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        emailOrPhone,
        password
      );

      const snap = await getDoc(doc(db, "users", cred.user.uid));

      if (!snap.exists()) {
        throw new Error("User profile not found");
      }

      const role = snap.data().role;

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "client") {
        router.push("/client/dashboard");
      } else if (role === "worker") {
        router.push("/worker/dashboard");
      } else {
        throw new Error("Invalid user role");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br h-screen from-[#E9F5F3] to-white p-6 sm:p-8 rounded-2xl shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#2A9D8F] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-handshake text-white text-2xl"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#264653] mb-2">
              Welcome Back
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Login to your account
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Email or Phone
              </label>
              <input
                type="text"
                placeholder="Enter your email or phone"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-[#FF6B35]" />
                <span className="text-gray-600">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-[#FF6B35] font-semibold hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B35] text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-[#FF6B35] font-semibold hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
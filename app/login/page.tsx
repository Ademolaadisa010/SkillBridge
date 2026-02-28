"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import toast, { Toaster } from "react-hot-toast";
import { Mail, Lock, Hammer, ShieldCheck, BadgeCheck, Users, Star, Eye, EyeOff } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFriendlyError(err: any): string {
  const code = err?.code || "";
  const message = err?.message || "";

  if (code === "auth/user-not-found" || code === "auth/invalid-credential")
    return "No account found with these details. Please check and try again.";
  if (code === "auth/wrong-password")
    return "Incorrect password. Please try again or reset your password.";
  if (code === "auth/invalid-email")
    return "Please enter a valid email address.";
  if (code === "auth/too-many-requests")
    return "Too many failed attempts. Please wait a moment before trying again.";
  if (code === "auth/network-request-failed")
    return "Network error. Please check your internet connection.";
  if (code === "auth/user-disabled")
    return "This account has been disabled. Please contact support.";
  if (message === "User profile not found")
    return "Your profile could not be found. Please contact support.";
  if (message === "Invalid user role")
    return "Your account type is not recognized. Please contact support.";

  return "Something went wrong. Please try again.";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Login() {
  const router = useRouter();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading("Logging you in...");

    try {
      const cred = await signInWithEmailAndPassword(auth, emailOrPhone, password);

      const snap = await getDoc(doc(db, "users", cred.user.uid));

      if (!snap.exists()) {
        throw new Error("User profile not found");
      }

      const role = snap.data().role;

      toast.dismiss(loadingToast);
      toast.success("Welcome back! Redirecting...", {
        style: { border: "1px solid #a7f3d0", background: "#fff", color: "#264653" },
        iconTheme: { primary: "#10b981", secondary: "#fff" },
      });

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
      toast.dismiss(loadingToast);
      toast.error(getFriendlyError(err), {
        duration: 5000,
        style: {
          borderRadius: "10px",
          background: "#fff",
          color: "#1e293b",
          border: "1px solid #fecaca",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        },
        iconTheme: { primary: "#ef4444", secondary: "#fff" },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{ style: { fontFamily: "inherit", fontSize: "14px" } }}
      />

      <div className="flex flex-col lg:flex-row min-h-screen w-full">

        <aside className="lg:w-5/12 bg-[#0c4a6e] text-white relative overflow-hidden flex flex-col justify-between p-8 lg:p-12">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c4a6e]/90 to-[#075985]/90" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <div className="bg-[#10b981] p-2 rounded-lg">
                <i className="fas fa-handshake w-6 h-6 text-white text-lg"></i>
              </div>
              <span className="text-2xl font-bold tracking-tight">SkillBridge</span>
            </div>

            <div className="hidden lg:block space-y-8">
              <h2 className="text-4xl font-bold leading-tight">
                Welcome back to Nigeria's most trusted skills platform.
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Thousands of clients and workers trust SkillBridge every day. Log in to manage your jobs, bookings, and earnings.
              </p>

              <div className="space-y-6 mt-10">
                {[
                  {
                    icon: <ShieldCheck className="w-6 h-6 text-[#34d399]" />,
                    title: "Secure & Private",
                    desc: "Your data is encrypted and never shared without consent.",
                  },
                  {
                    icon: <BadgeCheck className="w-6 h-6 text-[#34d399]" />,
                    title: "Verified Professionals",
                    desc: "Every worker is ID-verified before joining the platform.",
                  },
                  {
                    icon: <Users className="w-6 h-6 text-[#34d399]" />,
                    title: "Growing Community",
                    desc: "Over 10,000 jobs completed across Nigeria.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="bg-[#075985] p-3 rounded-full shrink-0">{item.icon}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <p className="text-blue-200 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="relative z-10 hidden lg:block">
            <div className="flex items-center gap-4 bg-[#075985]/60 p-4 rounded-xl backdrop-blur-sm border border-[#0369a1]">
              <img
                src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=100&auto=format&fit=crop"
                alt="User"
                className="w-12 h-12 rounded-full border-2 border-[#10b981] object-cover"
              />
              <div>
                <div className="flex text-yellow-400 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <p className="text-sm italic text-blue-100">
                  &quot;SkillBridge helped me find consistent work as an electrician. Best platform in Nigeria!&quot;
                </p>
                <p className="text-xs font-bold text-white mt-1">— Taiwo A., Abuja</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right Panel: Login Form ── */}
        <main className="lg:w-7/12 bg-white flex flex-col justify-center p-6 sm:p-12 lg:p-16">
          <div className="max-w-md mx-auto w-full">

            {/* Header */}
            <div className="mb-8 text-center lg:text-left">
              {/* Mobile logo */}
              <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
                <div className="bg-[#10b981] p-2 rounded-lg">
                  <Hammer className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-[#0c4a6e]">SkillBridge</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
              <p className="text-gray-500">Log in to your account to continue.</p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter your email"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-[#0284c7] font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-[#0284c7] focus:ring-[#0284c7] border-gray-300 rounded"
                />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 rounded-lg text-sm font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284c7] transition-all active:scale-[0.99] disabled:opacity-50 shadow-md"
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>

                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Your connection is secure and encrypted.</span>
                </div>
              </div>
            </form>

            {/* Divider */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-[#0284c7] hover:underline">
                  Sign up for free
                </Link>
              </p>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
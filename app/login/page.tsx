"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import toast, { Toaster } from "react-hot-toast";
import {
  Mail, Lock, Hammer, ShieldCheck, BadgeCheck,
  Users, Star, Eye, EyeOff
} from "lucide-react";

// ─── Google Provider ──────────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

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
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return ""; // silent — user closed the popup themselves
  if (code === "auth/popup-blocked")
    return "Popup was blocked by your browser. Please allow popups and try again.";
  if (message === "User profile not found")
    return "Your profile could not be found. Please contact support.";
  if (message === "Invalid user role")
    return "Your account type is not recognised. Please contact support.";

  return "Something went wrong. Please try again.";
}

function redirectByRole(role: string, router: ReturnType<typeof useRouter>) {
  if (role === "admin") router.push("/admin");
  else if (role === "client") router.push("/client/dashboard");
  else if (role === "worker") router.push("/worker/dashboard");
  else throw new Error("Invalid user role");
}

// ─── Google SVG icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const router = useRouter();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Email / password login ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const t = toast.loading("Logging you in...");
    try {
      const cred = await signInWithEmailAndPassword(auth, emailOrPhone, password);

      // Block login if email is not verified
      if (!cred.user.emailVerified) {
        // Send verification email BEFORE signing out while we still have the user object
        try {
          await sendEmailVerification(cred.user, {
            url: `${window.location.origin}/login`,
          });
        } catch (verifyErr: any) {
          // Ignore "too many requests" — email was already sent recently
          console.log("sendEmailVerification:", verifyErr?.code);
        }
        await auth.signOut();
        toast.dismiss(t);
        toast.error(
          (to) => (
            <div className="flex flex-col gap-2">
              <span className="font-bold text-sm">📧 Email not verified</span>
              <span className="text-xs text-gray-500 leading-relaxed">
                We just resent the verification email to <strong>{emailOrPhone}</strong>. Check your inbox and spam folder, then click the link to verify.
              </span>
              <button
                onClick={() => toast.dismiss(to.id)}
                className="mt-1 text-xs font-bold text-[#10b981] underline text-left"
              >
                OK, got it
              </button>
            </div>
          ),
          { duration: 15000, style: { borderRadius: "12px", background: "#fff", color: "#1e293b", border: "1px solid #fecaca", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", maxWidth: "360px" } }
        );
        return;
      }

      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) throw new Error("User profile not found");
      toast.dismiss(t);
      toast.success("Welcome back! Redirecting...", {
        style: { border: "1px solid #a7f3d0", background: "#fff", color: "#264653" },
        iconTheme: { primary: "#10b981", secondary: "#fff" },
      });
      redirectByRole(snap.data().role, router);
    } catch (err: any) {
      toast.dismiss(t);
      const msg = getFriendlyError(err);
      if (msg) toast.error(msg, {
        duration: 5000,
        style: { borderRadius: "10px", background: "#fff", color: "#1e293b", border: "1px solid #fecaca", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
        iconTheme: { primary: "#ef4444", secondary: "#fff" },
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Google login ────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const t = toast.loading("Connecting with Google...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { user } = result;

      // Check if profile exists
      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        // Existing user — just redirect
        toast.dismiss(t);
        toast.success("Welcome back!", {
          style: { border: "1px solid #a7f3d0", background: "#fff", color: "#264653" },
          iconTheme: { primary: "#10b981", secondary: "#fff" },
        });
        redirectByRole(snap.data().role, router);
      } else {
        // New Google user — create a client profile and redirect to dashboard
        await setDoc(doc(db, "users", user.uid), {
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
          role: "client",
          status: "active",
          createdAt: serverTimestamp(),
          authProvider: "google",
        });
        toast.dismiss(t);
        toast.success("Account created! Welcome to SkillBridge 🎉", {
          style: { border: "1px solid #a7f3d0", background: "#fff", color: "#264653" },
          iconTheme: { primary: "#10b981", secondary: "#fff" },
          duration: 4000,
        });
        router.push("/client/dashboard");
      }
    } catch (err: any) {
      toast.dismiss(t);
      const msg = getFriendlyError(err);
      if (msg) toast.error(msg, {
        duration: 5000,
        style: { borderRadius: "10px", background: "#fff", color: "#1e293b", border: "1px solid #fecaca" },
        iconTheme: { primary: "#ef4444", secondary: "#fff" },
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{ style: { fontFamily: "inherit", fontSize: "14px" } }}
      />

      <div className="flex flex-col lg:flex-row min-h-screen w-full">

        {/* ── Left Panel ── */}
        <aside className="lg:w-5/12 bg-[#0c4a6e] text-white relative overflow-hidden flex flex-col justify-between p-8 lg:p-12">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c4a6e]/90 to-[#075985]/90" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <div className="bg-[#10b981] p-2 rounded-lg">
                <i className="fas fa-handshake text-white text-lg"></i>
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
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
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

            {/* ── Google Sign-In ── */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284c7] transition-all active:scale-[0.99] disabled:opacity-50 shadow-sm mb-5"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-[#4285F4] rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {googleLoading ? "Connecting…" : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── Email Form ── */}
            <form className="space-y-5" onSubmit={handleLogin}>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter your email"
                    value={emailOrPhone}
                    onChange={e => setEmailOrPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link href="/forgot-password" className="text-sm text-[#0284c7] font-medium hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
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
                  disabled={loading || googleLoading}
                  className="w-full flex justify-center py-3.5 px-4 rounded-lg text-sm font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284c7] transition-all active:scale-[0.99] disabled:opacity-50 shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Logging in...
                    </span>
                  ) : "Log In"}
                </button>

                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Your connection is secure and encrypted.</span>
                </div>
              </div>
            </form>

            {/* Sign up link */}
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
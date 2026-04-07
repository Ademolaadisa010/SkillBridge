"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import toast, { Toaster } from "react-hot-toast";
import {
  User, Phone, Mail, Lock, Briefcase, MapPin,
  ChevronDown, ShieldCheck, BadgeCheck,
  Users, Wrench, Hammer, Star, Eye, EyeOff,
  CheckCircle2, ArrowRight,
} from "lucide-react";

// ─── Google provider ──────────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFriendlyError(err: any): string {
  const code = err?.code || "";
  if (code === "auth/email-already-in-use")
    return "An account with this email already exists. Try logging in instead.";
  if (code === "auth/invalid-email")
    return "Please enter a valid email address.";
  if (code === "auth/weak-password")
    return "Your password is too weak. Use at least 6 characters.";
  if (code === "auth/network-request-failed")
    return "Network error. Please check your internet connection.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return "";
  if (code === "auth/popup-blocked")
    return "Popup was blocked by your browser. Please allow popups and try again.";
  return "Something went wrong. Please try again.";
}

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-yellow-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-green-500" };
}

const SKILL_CATEGORIES = [
  "Plumber", "Electrician", "Carpenter", "Painter",
  "AC Technician", "Mason", "Welder", "Tiler",
  "Generator Technician", "Security Installer",
  "Cleaner", "Appliance Repair", "Other",
];

const errStyle = {
  duration: 6000,
  style: { borderRadius: "10px", background: "#fff", color: "#264653", border: "1px solid #fecaca", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  iconTheme: { primary: "#ef4444", secondary: "#fff" },
};

const okStyle = {
  style: { border: "1px solid #a7f3d0", background: "#fff", color: "#264653" },
  iconTheme: { primary: "#10b981", secondary: "#fff" },
};

// ─── Google SVG ───────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Email Verification Screen ────────────────────────────────────────────────
function VerifyEmailScreen({ email, onResend }: { email: string; onResend: () => void }) {
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    await onResend();
    setResending(false);
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Mail className="w-8 h-8 text-[#0284c7]" />
        </div>
        <h2 className="text-2xl font-bold text-[#0c4a6e] mb-2">Verify your email</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          We sent a verification link to
        </p>
        <p className="font-semibold text-[#0284c7] mb-5 text-sm">{email}</p>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Click the link in the email to activate your account. Check your <strong>inbox</strong> and <strong>spam/junk</strong> folder.
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 bg-[#0284c7] text-white font-bold py-3 rounded-xl hover:bg-[#0369a1] transition text-sm"
          >
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="w-full py-3 text-sm font-semibold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition border border-gray-200"
          >
            {resending ? "Sending…" : countdown > 0 ? `Resend in ${countdown}s` : "Resend verification email"}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-5">
          Wrong email?{" "}
          <Link href="/register" className="text-[#0284c7] hover:underline">
            Go back and register again
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Register() {
  const router = useRouter();

  const [role, setRole] = useState<"client" | "worker">("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [skillCategory, setSkillCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifyScreen, setVerifyScreen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const passwordStrength = getPasswordStrength(password);

  // ── Email/password register ─────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) { toast.error("Please accept the Terms of Service and Privacy Policy.", errStyle); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match.", errStyle); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters.", errStyle); return; }
    if (role === "worker" && !skillCategory) { toast.error("Please select your skill category.", errStyle); return; }

    setLoading(true);
    const t = toast.loading("Creating your account…");
    try {
      // 1. Create auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Update display name
      await updateProfile(cred.user, { displayName: fullName });

      // 3. Save Firestore profile
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        displayName: fullName,
        email,
        phone,
        role,
        status: "active",
        emailVerified: false,
        authProvider: "email",
        ...(role === "worker" && {
          skills: [skillCategory],
          skillCategory,
          experience: Number(experience) || 0,
          location,
          verified: false,
          verificationStatus: "none",
          walletBalance: 0,
          totalJobs: 0,
          rating: 0,
        }),
        createdAt: serverTimestamp(),
      });

      // 4. Send branded verification email via API route (EmailJS → no spam)
      //    Falls back to Firebase default if API route fails
      try {
        const res = await fetch("/api/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid:         cred.user.uid,
            email,
            displayName: fullName,
            continueUrl: `${window.location.origin}/login?verified=true`,
          }),
        });
        if (!res.ok) throw new Error("API route failed");
      } catch {
        // Fallback: use Firebase's own sendEmailVerification
        await sendEmailVerification(cred.user, {
          url: `${window.location.origin}/login?verified=true`,
          handleCodeInApp: false,
        });
      }

      toast.dismiss(t);
      toast.success("Account created! Check your email to verify.", okStyle);
      setRegisteredEmail(email);
      setVerifyScreen(true);
    } catch (err: any) {
      toast.dismiss(t);
      const msg = getFriendlyError(err);
      if (msg) toast.error(msg, errStyle);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend verification email ───────────────────────────────────────────────
  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user) { toast.error("Session expired. Please log in.", errStyle); return; }
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: false,
      });
      toast.success("Verification email resent!", okStyle);
    } catch {
      toast.error("Failed to resend. Please try again.", errStyle);
    }
  };

  // ── Google register ─────────────────────────────────────────────────────────
  const handleGoogleRegister = async () => {
    if (!termsAccepted) { toast.error("Please accept the Terms of Service and Privacy Policy.", errStyle); return; }
    setGoogleLoading(true);
    const t = toast.loading("Connecting with Google…");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { user } = result;

      // Check if already registered
      const { getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        toast.dismiss(t);
        toast.success("Account found! Redirecting…", okStyle);
        const existingRole = snap.data().role;
        router.push(existingRole === "worker" ? "/worker/dashboard" : existingRole === "admin" ? "/admin" : "/client/dashboard");
        return;
      }

      // New user — create profile (Google emails are pre-verified)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        phone: "",
        role, // uses currently selected role toggle
        status: "active",
        emailVerified: true, // Google accounts are pre-verified
        authProvider: "google",
        ...(role === "worker" && {
          skills: skillCategory ? [skillCategory] : [],
          skillCategory: skillCategory || "",
          experience: Number(experience) || 0,
          location: location || "",
          verified: false,
          verificationStatus: "none",
          walletBalance: 0,
          totalJobs: 0,
          rating: 0,
        }),
        createdAt: serverTimestamp(),
      });

      toast.dismiss(t);
      toast.success(`Welcome to SkillBridge, ${user.displayName?.split(" ")[0] || ""}! 🎉`, { ...okStyle, duration: 4000 });
      router.push(role === "worker" ? "/worker/dashboard" : "/client/dashboard");
    } catch (err: any) {
      toast.dismiss(t);
      const msg = getFriendlyError(err);
      if (msg) toast.error(msg, errStyle);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Show verify screen after email registration
  if (verifyScreen) {
    return <VerifyEmailScreen email={registeredEmail} onResend={handleResend} />;
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: "inherit", fontSize: "14px" } }} />

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
                Join Nigeria's most trusted network of skilled professionals.
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Whether you're fixing a leak or building a dream home, we connect you with verified experts you can trust.
              </p>
              <div className="space-y-6 mt-10">
                {[
                  { icon: <ShieldCheck className="w-6 h-6 text-[#34d399]" />, title: "Secure Payments", desc: "Funds are held in escrow until the job is done right." },
                  { icon: <BadgeCheck className="w-6 h-6 text-[#34d399]" />, title: "Verified Workers", desc: "Every professional undergoes strict ID and skill verification." },
                  { icon: <Users className="w-6 h-6 text-[#34d399]" />, title: "Community Focused", desc: "Building trust within local communities, one job at a time." },
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
          <div className="relative z-10 hidden lg:block">
            <div className="flex items-center gap-4 bg-[#075985]/60 p-4 rounded-xl backdrop-blur-sm border border-[#0369a1]">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" alt="User" className="w-12 h-12 rounded-full border-2 border-[#10b981] object-cover" />
              <div>
                <div className="flex text-yellow-400 mb-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}</div>
                <p className="text-sm italic text-blue-100">&quot;Found a reliable plumber in Lagos within minutes. SkillBridge is a lifesaver!&quot;</p>
                <p className="text-xs font-bold text-white mt-1">— Emmanuel O., Lagos</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right Panel ── */}
        <main className="lg:w-7/12 bg-white flex flex-col justify-center p-6 sm:p-12 lg:p-16 overflow-y-auto">
          <div className="max-w-xl mx-auto w-full">

            <div className="mb-8 text-center lg:text-left">
              {/* Mobile logo */}
              <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
                <div className="bg-[#10b981] p-2 rounded-lg"><i className="fas fa-handshake text-white text-lg"></i></div>
                <span className="text-xl font-bold text-[#0c4a6e]">SkillBridge</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
              <p className="text-gray-500">Start connecting with opportunities today.</p>
            </div>

            {/* Role Toggle */}
            <div className="bg-gray-100 p-1.5 rounded-xl flex mb-6">
              {(["client", "worker"] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                    role === r ? "bg-white text-[#0369a1] font-bold shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {r === "client" ? <User className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                  {r === "client" ? "I am a Client" : "I am a Skilled Worker"}
                </button>
              ))}
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284c7] transition-all active:scale-[0.99] disabled:opacity-50 shadow-sm mb-5"
            >
              {googleLoading
                ? <div className="w-5 h-5 border-2 border-gray-300 border-t-[#4285F4] rounded-full animate-spin" />
                : <GoogleIcon />}
              {googleLoading ? "Connecting…" : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or register with email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleRegister}>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="e.g. Chidi Okeke" value={fullName} onChange={e => setFullName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="tel" placeholder="+234 800 000 0000" value={phone} onChange={e => setPhone(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition" />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition" required />
                </div>
              </div>

              {/* Worker-only fields */}
              {role === "worker" && (
                <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 space-y-5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#0369a1]" />
                    <h3 className="text-sm font-semibold text-[#0c4a6e]">Professional Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">Skill Category</label>
                      <div className="relative">
                        <select value={skillCategory} onChange={e => setSkillCategory(e.target.value)}
                          className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] appearance-none transition">
                          <option value="">Select a skill…</option>
                          {SKILL_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                      <input type="number" min="0" placeholder="e.g. 5" value={experience} onChange={e => setExperience(e.target.value)}
                        className="block w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Service Location (City)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input type="text" placeholder="e.g. Ikeja, Lagos" value={location} onChange={e => setLocation(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition" />
                    </div>
                  </div>

                  {/* Info notice: ID verification done after login */}
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <BadgeCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <strong>ID verification</strong> is done after you log in. You'll need to verify your identity before you can apply for jobs.
                    </p>
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition" required />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition" tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
                        confirmPassword && confirmPassword !== password ? "border-red-400 focus:ring-red-400"
                        : confirmPassword && confirmPassword === password ? "border-green-400 focus:ring-green-400"
                        : "border-gray-300 focus:ring-[#0284c7]"
                      }`} required />
                  </div>
                  {confirmPassword && confirmPassword !== password && <p className="text-xs text-red-500">Passwords do not match</p>}
                  {confirmPassword && confirmPassword === password && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>}
                </div>
              </div>

              {/* Password strength */}
              {password && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Password strength</span>
                    <span className={`font-medium ${passwordStrength.score === 4 ? "text-green-600" : passwordStrength.score === 3 ? "text-blue-600" : passwordStrength.score === 2 ? "text-yellow-600" : "text-red-600"}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex-1 rounded-full transition-all ${i <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input id="terms" type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 mt-0.5 text-[#0284c7] focus:ring-[#0284c7] border-gray-300 rounded" />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#0284c7] hover:underline">Terms of Service</Link>{" "}and{" "}
                  <Link href="/privacy" className="text-[#0284c7] hover:underline">Privacy Policy</Link>
                </label>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button type="submit" disabled={loading || googleLoading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-lg text-sm font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284c7] transition-all active:scale-[0.99] disabled:opacity-50 shadow-md">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
                    : "Create Account"}
                </button>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>Your information is secure and protected.</span>
                </div>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-[#0284c7] hover:underline">Log in</Link>
              </p>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
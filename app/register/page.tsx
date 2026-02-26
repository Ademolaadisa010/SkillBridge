"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import toast, { Toaster } from "react-hot-toast";
import {
  User, Phone, Mail, Lock, Briefcase, MapPin,
  UploadCloud, ChevronDown, ShieldCheck, BadgeCheck,
  Users, Wrench, Hammer, Star,
} from "lucide-react";



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
  return "Something went wrong. Please try again.";
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
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
];

const errorToastStyle = {
  duration: 6000,
  style: {
    borderRadius: "10px", background: "#fff", color: "#264653",
    border: "1px solid #fecaca", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  iconTheme: { primary: "#ef4444", secondary: "#fff" },
};

const successToastStyle = {
  style: { border: "1px solid #a7f3d0", background: "#fff", color: "#264653" },
  iconTheme: { primary: "#2A9D8F", secondary: "#fff" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Register() {
  const router = useRouter();

  const [role, setRole] = useState<"client" | "worker">("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error("Please accept the Terms of Service and Privacy Policy.", errorToastStyle);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please check and try again.", errorToastStyle);
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.", errorToastStyle);
      return;
    }
    if (role === "worker" && !skillCategory) {
      toast.error("Please select your skill category.", errorToastStyle);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Creating your account...");

    try {
      // 1️⃣ Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 2️⃣ Save profile to Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        fullName,
        email,
        phone,
        role,
        ...(role === "worker" && {
          skillCategory,
          experience: Number(experience) || 0,
          location,
        }),
        createdAt: new Date(),
      });

      toast.dismiss(loadingToast);
      toast.success(`Welcome, ${fullName.split(" ")[0]}! Your account is ready.`, successToastStyle);

      // 3️⃣ Redirect by role
      setTimeout(() => {
        router.push(role === "client" ? "/client/dashboard" : "/worker/dashboard");
      }, 800);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(getFriendlyError(err), errorToastStyle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: "inherit", fontSize: "14px" } }} />

      <div className="flex flex-col lg:flex-row min-h-screen w-full">

        {/* ── Left Panel ── */}
        <aside className="lg:w-5/12 bg-[#0c4a6e] text-white relative overflow-hidden flex flex-col justify-between p-8 lg:p-12">
          {/* Background overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c4a6e]/90 to-[#075985]/90" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <div className="bg-[#10b981] p-2 rounded-lg">
                <Hammer className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">SkillBridge</span>
            </div>

            {/* Hero text */}
            <div className="hidden lg:block space-y-8">
              <h2 className="text-4xl font-bold leading-tight">
                Join Nigeria's most trusted network of skilled professionals.
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Whether you&apos;re fixing a leak or building a dream home, we connect you with verified experts you can trust.
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

          {/* Testimonial */}
          <div className="relative z-10 hidden lg:block">
            <div className="flex items-center gap-4 bg-[#075985]/60 p-4 rounded-xl backdrop-blur-sm border border-[#0369a1]">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
                alt="User"
                className="w-12 h-12 rounded-full border-2 border-[#10b981] object-cover"
              />
              <div>
                <div className="flex text-yellow-400 mb-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                </div>
                <p className="text-sm italic text-blue-100">
                  &quot;Found a reliable plumber in Lagos within minutes. SkillBridge is a lifesaver!&quot;
                </p>
                <p className="text-xs font-bold text-white mt-1">— Emmanuel O., Lagos</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right Panel: Form ── */}
        <main className="lg:w-7/12 bg-white flex flex-col justify-center p-6 sm:p-12 lg:p-16 overflow-y-auto">
          <div className="max-w-xl mx-auto w-full">

            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
              <p className="text-gray-500">Start connecting with opportunities today.</p>
            </div>

            {/* Role Toggle */}
            <div className="bg-gray-100 p-1.5 rounded-xl flex mb-8">
              <button
                type="button"
                onClick={() => setRole("client")}
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                  role === "client"
                    ? "bg-white text-[#0369a1] font-bold shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <User className="w-4 h-4" />
                I am a Client
              </button>
              <button
                type="button"
                onClick={() => setRole("worker")}
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                  role === "worker"
                    ? "bg-white text-[#0369a1] font-bold shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Wrench className="w-4 h-4" />
                I am a Skilled Worker
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleRegister}>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Chidi Okeke"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                    required
                  />
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
                    {/* Skill Category */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">Skill Category</label>
                      <div className="relative">
                        <select
                          value={skillCategory}
                          onChange={(e) => setSkillCategory(e.target.value)}
                          className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] appearance-none transition"
                        >
                          <option value="">Select a skill...</option>
                          {SKILL_CATEGORIES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Experience */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 5"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="block w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Service Location (City)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g. Ikeja, Lagos"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                      />
                    </div>
                  </div>

                  {/* ID Upload */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Upload ID Verification</label>
                    <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition cursor-pointer group">
                      <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-10 w-10 text-gray-400 group-hover:text-[#0284c7] transition" />
                        {idFile ? (
                          <p className="text-sm font-medium text-[#0284c7]">{idFile.name}</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium text-[#0284c7]">Upload a file</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">NIN, Driver&apos;s License, or Voter&apos;s Card (PNG, JPG, PDF up to 5MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        className="sr-only"
                        onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
                        confirmPassword && confirmPassword !== password
                          ? "border-red-400 focus:ring-red-400"
                          : confirmPassword && confirmPassword === password
                          ? "border-green-400 focus:ring-green-400"
                          : "border-gray-300 focus:ring-[#0284c7]"
                      }`}
                      required
                    />
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                  {confirmPassword && confirmPassword === password && (
                    <p className="text-xs text-green-600">Passwords match ✓</p>
                  )}
                </div>
              </div>

              {/* Password Strength */}
              {password && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Password strength</span>
                    <span className={`font-medium ${
                      passwordStrength.score === 4 ? "text-green-600"
                      : passwordStrength.score === 3 ? "text-blue-600"
                      : passwordStrength.score === 2 ? "text-yellow-600"
                      : "text-red-600"
                    }`}>{passwordStrength.label}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all ${
                          i <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 mt-0.5 text-[#0284c7] focus:ring-[#0284c7] border-gray-300 rounded"
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#0284c7] hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-[#0284c7] hover:underline">Privacy Policy</Link>
                </label>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 rounded-lg text-sm font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284c7] transition-all active:scale-[0.99] disabled:opacity-50 shadow-md"
                >
                  {loading ? "Creating account..." : "Create Account"}
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
                <Link href="/login" className="font-medium text-[#0284c7] hover:underline">
                  Log in
                </Link>
              </p>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
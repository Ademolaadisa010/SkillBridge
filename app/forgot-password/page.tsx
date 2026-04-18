"use client";

import { useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { Mail, Lock, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";

function getFriendlyError(code: string): string {
  if (code === "user-not-found")
    return "We couldn't find an account with that email address.";
  if (code === "invalid-email")
    return "Please enter a valid email address.";
  if (code === "too-many-requests")
    return "Too many attempts. Please wait a few minutes before trying again.";
  if (code === "network-error")
    return "Network error. Please check your internet connection.";
  return "Something went wrong. Please try again.";
}

const errStyle = {
  duration: 5000,
  style: {
    borderRadius: "10px",
    background: "#fff",
    color: "#1e293b",
    border: "1px solid #fecaca",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  iconTheme: { primary: "#ef4444", secondary: "#fff" },
};
const okStyle = {
  style: {
    border: "1px solid #a7f3d0",
    background: "#fff",
    color: "#264653",
  },
  iconTheme: { primary: "#10b981", secondary: "#fff" },
};

type Step = "input" | "sent";

export default function ForgotPassword() {
  const [email, setEmail]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState<Step>("input");
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const sendReset = async (targetEmail: string) => {
    const res = await fetch("/api/send-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: targetEmail,
        continueUrl: `${window.location.origin}/login?reset=true`,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // Map API error strings to friendly codes
      const raw: string = data?.error ?? "";
      if (raw === "user-not-found" || res.status === 404) throw new Error("user-not-found");
      if (raw.includes("invalid-email"))                   throw new Error("invalid-email");
      if (raw.includes("too-many-requests"))               throw new Error("too-many-requests");
      if (res.status === 0 || raw.includes("network"))     throw new Error("network-error");
      throw new Error("unknown");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const t = toast.loading("Sending reset link…");
    try {
      await sendReset(email);
      toast.dismiss(t);
      toast.success("Reset link sent! Check your inbox.", okStyle);
      setStep("sent");
      startCountdown();
    } catch (err: any) {
      toast.dismiss(t);
      toast.error(getFriendlyError(err?.message ?? ""), errStyle);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    const t = toast.loading("Resending reset link…");
    try {
      await sendReset(email);
      toast.dismiss(t);
      toast.success("Reset link resent! Check your inbox.", okStyle);
      startCountdown();
    } catch (err: any) {
      toast.dismiss(t);
      toast.error(getFriendlyError(err?.message ?? ""), errStyle);
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
      <div className="min-h-screen bg-gradient-to-br from-[#f0f9ff] via-white to-[#e0f2fe] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#0284c7] to-[#0c4a6e]" />
            <div className="p-8">

              {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="w-8 h-8 bg-[#0284c7] rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-sm">SB</span>
                </div>
                <span className="text-lg font-bold text-[#0c4a6e]">SkillBridge</span>
              </div>

              {/* ── Step 1: Email input ── */}
              {step === "input" && (
                <>
                  <div className="text-center mb-7">
                    <div className="w-14 h-14 bg-[#e0f2fe] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-7 h-7 text-[#0284c7]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#0c4a6e] mb-2">Forgot password?</h1>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                      Enter your email and we'll send you a link to reset your password.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.99] disabled:opacity-50 shadow-md"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending…
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ── Step 2: Confirmation ── */}
              {step === "sent" && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#0c4a6e] mb-2">Check your email</h1>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                      We sent a password reset link to{" "}
                      <span className="font-semibold text-[#0c4a6e]">{email}</span>
                    </p>
                  </div>

                  <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-4 mb-4">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      What to do next
                    </p>
                    <div className="space-y-2.5">
                      {[
                        { icon: "📬", text: "Open the email from SkillBridge" },
                        { icon: "🔗", text: "Click the reset link inside" },
                        { icon: "🔑", text: "Create a strong new password" },
                        { icon: "✅", text: "Log in with your new password" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-base">{item.icon}</span>
                          <p className="text-sm text-gray-600">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                    <span className="text-base shrink-0">📁</span>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Can't find it? Check your <strong>spam or junk folder</strong>. The email
                      comes from <strong>support@skillbridge.ng</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleResend}
                    disabled={loading || countdown > 0}
                    className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition mb-3"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    {loading
                      ? "Resending…"
                      : countdown > 0
                      ? `Resend in ${countdown}s`
                      : "Resend reset email"}
                  </button>

                  <button
                    onClick={() => { setStep("input"); setCountdown(0); }}
                    className="w-full text-sm text-[#0284c7] font-semibold hover:underline py-2 transition"
                  >
                    Try a different email address
                  </button>
                </>
              )}

              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0c4a6e] font-medium transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </Link>
              </div>

            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Need help?{" "}
            <a href="mailto:support@skillbridge.ng" className="text-[#0284c7] hover:underline">
              support@skillbridge.ng
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
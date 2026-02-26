"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast, { Toaster } from "react-hot-toast";

function getFriendlyError(err: any): string {
  const code = err?.code || "";

  if (code === "auth/user-not-found" || code === "auth/invalid-credential")
    return "We couldn't find an account with that email address.";
  if (code === "auth/invalid-email")
    return "Please enter a valid email address.";
  if (code === "auth/too-many-requests")
    return "Too many attempts. Please wait a moment before trying again.";
  if (code === "auth/network-request-failed")
    return "Network error. Please check your internet connection.";

  return "Something went wrong. Please try again.";
}

type Step = "input" | "sent";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("input");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading("Sending reset link...");

    try {
      await sendPasswordResetEmail(auth, email);
      toast.dismiss(loadingToast);
      toast.success("Reset link sent!", {
        style: {
          border: "1px solid #a7f3d0",
          background: "#fff",
          color: "#264653",
        },
        iconTheme: { primary: "#2A9D8F", secondary: "#fff" },
      });
      setStep("sent");
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(getFriendlyError(err), {
        duration: 5000,
        style: {
          borderRadius: "10px",
          background: "#fff",
          color: "#264653",
          border: "1px solid #fecaca",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        },
        iconTheme: { primary: "#ef4444", secondary: "#fff" },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    const loadingToast = toast.loading("Resending reset link...");
    try {
      await sendPasswordResetEmail(auth, email);
      toast.dismiss(loadingToast);
      toast.success("Reset link resent! Check your inbox.", {
        style: {
          border: "1px solid #a7f3d0",
          background: "#fff",
          color: "#264653",
        },
        iconTheme: { primary: "#2A9D8F", secondary: "#fff" },
      });
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(getFriendlyError(err), {
        duration: 5000,
        style: {
          borderRadius: "10px",
          background: "#fff",
          color: "#264653",
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
        toastOptions={{
          style: { fontFamily: "inherit", fontSize: "14px" },
        }}
      />

      <div>
        <div className="bg-gradient-to-br h-screen from-[#E9F5F3] to-white p-6 sm:p-8 rounded-2xl shadow-lg flex items-center justify-center">
          <div className="max-w-md w-full mx-auto">

            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#2A9D8F] rounded-2xl flex items-center justify-center mx-auto mb-4">
                {step === "sent" ? (
                  <i className="fas fa-envelope-open-text text-white text-2xl"></i>
                ) : (
                  <i className="fas fa-lock text-white text-2xl"></i>
                )}
              </div>

              {step === "input" ? (
                <>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#264653] mb-2">
                    Forgot Password?
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-xs mx-auto">
                    No worries! Enter your email and we'll send you a link to reset your password.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#264653] mb-2">
                    Check Your Email
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-xs mx-auto">
                    We sent a password reset link to{" "}
                    <span className="font-semibold text-[#264653]">{email}</span>.
                    It may take a minute to arrive.
                  </p>
                </>
              )}
            </div>

            {/* Step: Input email */}
            {step === "input" && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-[#264653] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF6B35] text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}

            {/* Step: Email sent confirmation */}
            {step === "sent" && (
              <div className="space-y-4">
                {/* Visual confirmation card */}
                <div className="bg-[#E9F5F3] border border-[#2A9D8F]/30 rounded-xl p-4 flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-[#2A9D8F]/20 flex items-center justify-center shrink-0">
                    <i className="fas fa-check text-[#2A9D8F] text-sm"></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#264653]">Reset link sent successfully</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Check your spam or junk folder if you don't see it within a few minutes.
                    </p>
                  </div>
                </div>

                {/* Steps guide */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">What to do next</p>
                  {[
                    { icon: "fa-envelope", text: "Open the email from us" },
                    { icon: "fa-mouse-pointer", text: "Click the reset link inside" },
                    { icon: "fa-key", text: "Create your new password" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B35]/10 to-[#2A9D8F]/10 flex items-center justify-center shrink-0">
                        <i className={`fas ${item.icon} text-[#FF6B35] text-xs`}></i>
                      </div>
                      <p className="text-sm text-gray-600">{item.text}</p>
                    </div>
                  ))}
                </div>

                {/* Resend */}
                <p className="text-center text-sm text-gray-500">
                  Didn&apos;t receive it?{" "}
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="text-[#FF6B35] font-semibold hover:underline disabled:opacity-50 transition"
                  >
                    {loading ? "Resending..." : "Resend email"}
                  </button>
                </p>

                {/* Try different email */}
                <button
                  onClick={() => setStep("input")}
                  className="w-full border border-gray-300 text-[#264653] py-3 rounded-lg font-semibold hover:bg-gray-50 transition text-sm"
                >
                  Try a different email
                </button>
              </div>
            )}

            {/* Back to login */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#264653] font-medium transition"
              >
                <i className="fas fa-arrow-left text-xs"></i>
                Back to Login
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
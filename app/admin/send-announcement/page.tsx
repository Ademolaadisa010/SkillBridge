"use client";

import { useState } from "react";
import { Send, Users, CheckCircle2, AlertTriangle, Megaphone } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const okStyle = {
  style: { border: "1px solid #a7f3d0", background: "#fff", color: "#264653" },
  iconTheme: { primary: "#10b981", secondary: "#fff" },
};
const errStyle = {
  duration: 6000,
  style: {
    borderRadius: "10px",
    background: "#fff",
    color: "#1e293b",
    border: "1px solid #fecaca",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  iconTheme: { primary: "#ef4444", secondary: "#fff" },
};

type Result = {
  total: number;
  sent: number;
  failed: number;
  errors?: string[];
};

export default function SendAnnouncementPage() {
  const [subject, setSubject]   = useState("");
  const [body, setBody]         = useState("");
  const [secret, setSecret]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<Result | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || !secret.trim()) {
      toast.error("Please fill in all fields.", errStyle);
      return;
    }
    if (!confirmed) {
      toast.error("Please confirm before sending.", errStyle);
      return;
    }

    setLoading(true);
    setResult(null);
    const t = toast.loading("Sending to all users… this may take a moment.");

    try {
      const res = await fetch("/api/send-announcement", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${secret}`,
        },
        body: JSON.stringify({ subject, body }),
      });

      const data = await res.json();
      toast.dismiss(t);

      if (!res.ok) {
        toast.error(data?.error || "Something went wrong.", errStyle);
        return;
      }

      setResult(data);
      toast.success(`Done! Sent to ${data.sent} users.`, okStyle);
      setConfirmed(false);
    } catch (err: any) {
      toast.dismiss(t);
      toast.error("Network error. Please try again.", errStyle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: "inherit", fontSize: "14px" } }} />
      <div className="min-h-screen bg-gradient-to-br from-[#f0f9ff] via-white to-[#e0f2fe] flex items-center justify-center p-4">
        <div className="w-full max-w-xl">

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#0284c7] to-[#0c4a6e]" />

            <div className="p-8">
              {/* Logo + title */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-8 h-8 bg-[#0284c7] rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-sm">SB</span>
                </div>
                <span className="text-lg font-bold text-[#0c4a6e]">SkillBridge</span>
              </div>

              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-[#e0f2fe] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Megaphone className="w-7 h-7 text-[#0284c7]" />
                </div>
                <h1 className="text-2xl font-bold text-[#0c4a6e] mb-1">Send Announcement</h1>
                <p className="text-sm text-gray-500">
                  This will email <strong>all registered users</strong> on your platform.
                </p>
              </div>

              <div className="space-y-4">
                {/* Admin secret */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Admin Secret <span className="text-gray-400 font-normal">(from your .env)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Your ADMIN_SECRET value"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. We just launched something big 🎉"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition"
                  />
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Message Body
                  </label>
                  <textarea
                    rows={7}
                    placeholder={`Write your message here...\n\nYou can use line breaks — they'll be preserved in the email.`}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition resize-none"
                  />
                  <p className="text-xs text-gray-400">
                    Each user will be greeted by name automatically.
                  </p>
                </div>

                {/* Confirmation checkbox */}
                <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 accent-[#0284c7]"
                  />
                  <span className="text-sm text-amber-800 leading-relaxed">
                    I understand this will send an email to <strong>every registered user</strong>. I have reviewed the subject and message.
                  </span>
                </label>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={loading || !confirmed}
                  className="w-full flex justify-center items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.99] disabled:opacity-50 shadow-md"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to All Users
                    </>
                  )}
                </button>
              </div>

              {/* Result card */}
              {result && (
                <div className="mt-6 rounded-xl border overflow-hidden">
                  <div className="bg-green-50 border-b border-green-100 px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="font-semibold text-green-800 text-sm">Blast Complete</span>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-[#0c4a6e]">{result.total}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> Total users
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{result.sent}</p>
                      <p className="text-xs text-gray-500 mt-0.5">✅ Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                      <p className="text-xs text-gray-500 mt-0.5">❌ Failed</p>
                    </div>
                  </div>

                  {result.errors && result.errors.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        Failed addresses
                      </p>
                      <ul className="space-y-1">
                        {result.errors.map((e, i) => (
                          <li key={i} className="text-xs text-red-600 font-mono bg-red-50 rounded px-2 py-1">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Admin panel · SkillBridge Nigeria
          </p>
        </div>
      </div>
    </>
  );
}
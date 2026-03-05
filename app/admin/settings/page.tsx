"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, Shield, Bell, CreditCard, Percent,
  Globe, Mail, Phone, Save, RefreshCcw, Eye,
  EyeOff, AlertCircle, CheckCircle2, ToggleLeft,
  ToggleRight, Lock, Users, Briefcase, ChevronRight,
  Loader2, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  doc, getDoc, setDoc, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import toast, { Toaster } from "react-hot-toast";

interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  platformFeePercent: number;
  workerFeePercent: number;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  withdrawalProcessingDays: number;
  autoReleasePaymentDays: number;
  allowNewRegistrations: boolean;
  allowWorkerRegistrations: boolean;
  maintenanceMode: boolean;
  requireWorkerVerification: boolean;
  escrowEnabled: boolean;
  disputeWindowDays: number;
  maxOffersPerJob: number;
  updatedAt?: { seconds: number };
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "SkillBridge",
  supportEmail: "support@skillbridge.ng",
  supportPhone: "+234 800 000 0000",
  platformFeePercent: 10,
  workerFeePercent: 5,
  minWithdrawalAmount: 500,
  maxWithdrawalAmount: 500000,
  withdrawalProcessingDays: 3,
  autoReleasePaymentDays: 7,
  allowNewRegistrations: true,
  allowWorkerRegistrations: true,
  maintenanceMode: false,
  requireWorkerVerification: true,
  escrowEnabled: true,
  disputeWindowDays: 7,
  maxOffersPerJob: 10,
};

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
        <div className="w-8 h-8 bg-[#0f172a] rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-bold text-[#0f172a]">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Input field ───────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = "text", prefix, suffix, hint, disabled
}: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; prefix?: string; suffix?: string; hint?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-0">
        {prefix && (
          <span className="px-3 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-500 font-medium">{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 text-sm text-[#0f172a] font-medium focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed
            ${prefix ? "rounded-r-xl" : suffix ? "rounded-l-xl" : "rounded-xl"}`}
        />
        {suffix && (
          <span className="px-3 py-2.5 bg-gray-50 border border-l-0 border-gray-200 rounded-r-xl text-sm text-gray-500 font-medium">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({
  label, description, value, onChange, danger
}: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex-1">
        <p className={`text-sm font-semibold ${danger && value ? "text-red-600" : "text-[#0f172a]"}`}>{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          value
            ? danger ? "bg-red-500" : "bg-[#0284c7]"
            : "bg-gray-200"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"platform" | "payments" | "security" | "password">("platform");

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push("/admin/login"); return; }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "platform"), (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as PlatformSettings);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "platform"), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!newPw || !currentPw) { toast.error("Fill in all password fields"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    setChangingPw(true);
    try {
      const user = auth.currentUser!;
      const cred = EmailAuthProvider.credential(user.email!, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      toast.success("Password updated successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: any) {
      const msgs: Record<string, string> = {
        "auth/wrong-password": "Current password is incorrect.",
        "auth/weak-password": "New password is too weak.",
        "auth/requires-recent-login": "Please log out and log back in first.",
      };
      toast.error(msgs[e.code] || "Failed to update password");
    } finally {
      setChangingPw(false);
    }
  };

  const set = (key: keyof PlatformSettings) => (val: string | boolean) => {
    setSettings(s => ({ ...s, [key]: typeof val === "boolean" ? val : (isNaN(Number(val)) ? val : (val === "" ? val : Number(val))) }));
  };

  const TABS = [
    { id: "platform",  label: "Platform",  icon: Globe },
    { id: "payments",  label: "Payments",  icon: CreditCard },
    { id: "security",  label: "Access",    icon: Shield },
    { id: "password",  label: "Password",  icon: Lock },
  ] as const;

  const lastSaved = settings.updatedAt
    ? new Date(settings.updatedAt.seconds * 1000).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <Toaster position="top-right" />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0 flex items-center justify-between">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-lg font-bold text-[#0f172a]">Settings</h1>
            <p className="text-xs text-gray-400">
              {lastSaved ? `Last saved ${lastSaved}` : "Platform configuration"}
            </p>
          </div>
          {activeTab !== "password" && (
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0f172a] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#1e293b] disabled:opacity-60 transition shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </header>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-100 px-6 flex gap-1 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition -mb-px ${
                activeTab === id
                  ? "border-[#0284c7] text-[#0284c7]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-48" />
              ))}
            </div>
          ) : (
            <div className="max-w-2xl space-y-5">

              {/* ── Platform Tab ── */}
              {activeTab === "platform" && (
                <>
                  <Section title="General" icon={Globe}>
                    <Field label="Platform Name" value={settings.platformName} onChange={set("platformName")} />
                    <Field label="Support Email" value={settings.supportEmail} onChange={set("supportEmail")} type="email" />
                    <Field label="Support Phone" value={settings.supportPhone} onChange={set("supportPhone")} />
                  </Section>

                  <Section title="Job Settings" icon={Briefcase}>
                    <Field
                      label="Max Offers Per Job"
                      value={settings.maxOffersPerJob}
                      onChange={set("maxOffersPerJob")}
                      type="number"
                      hint="Maximum number of worker offers allowed per job posting"
                    />
                    <Field
                      label="Dispute Window (days)"
                      value={settings.disputeWindowDays}
                      onChange={set("disputeWindowDays")}
                      type="number"
                      hint="How many days after job completion a client can open a dispute"
                    />
                    <Field
                      label="Auto-Release Payment (days)"
                      value={settings.autoReleasePaymentDays}
                      onChange={set("autoReleasePaymentDays")}
                      type="number"
                      hint="Days before escrow is auto-released to worker if no dispute is raised"
                    />
                  </Section>
                </>
              )}

              {/* ── Payments Tab ── */}
              {activeTab === "payments" && (
                <>
                  <Section title="Fees" icon={Percent}>
                    <Field
                      label="Platform Fee"
                      value={settings.platformFeePercent}
                      onChange={set("platformFeePercent")}
                      type="number"
                      suffix="%"
                      hint="Percentage taken from each completed job payment"
                    />
                    <Field
                      label="Worker Service Fee"
                      value={settings.workerFeePercent}
                      onChange={set("workerFeePercent")}
                      type="number"
                      suffix="%"
                      hint="Additional fee deducted from worker earnings per job"
                    />
                  </Section>

                  <Section title="Withdrawals" icon={CreditCard}>
                    <Field
                      label="Minimum Withdrawal"
                      value={settings.minWithdrawalAmount}
                      onChange={set("minWithdrawalAmount")}
                      type="number"
                      prefix="₦"
                      hint="Minimum amount a worker can withdraw at once"
                    />
                    <Field
                      label="Maximum Withdrawal"
                      value={settings.maxWithdrawalAmount}
                      onChange={set("maxWithdrawalAmount")}
                      type="number"
                      prefix="₦"
                      hint="Maximum amount per single withdrawal request"
                    />
                    <Field
                      label="Processing Time"
                      value={settings.withdrawalProcessingDays}
                      onChange={set("withdrawalProcessingDays")}
                      type="number"
                      suffix="days"
                      hint="Business days to process approved withdrawals"
                    />
                  </Section>

                  <Section title="Escrow" icon={Shield}>
                    <Toggle
                      label="Escrow Enabled"
                      description="Hold client payments in escrow until job is completed"
                      value={settings.escrowEnabled}
                      onChange={set("escrowEnabled")}
                    />
                    {!settings.escrowEnabled && (
                      <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-700 font-medium">Disabling escrow means workers receive payment immediately. This removes dispute protection for clients.</p>
                      </div>
                    )}
                  </Section>
                </>
              )}

              {/* ── Access Tab ── */}
              {activeTab === "security" && (
                <>
                  <Section title="Registration" icon={Users}>
                    <Toggle
                      label="Allow New Client Registrations"
                      description="New clients can sign up to the platform"
                      value={settings.allowNewRegistrations}
                      onChange={set("allowNewRegistrations")}
                    />
                    <div className="border-t border-gray-50 pt-3">
                      <Toggle
                        label="Allow New Worker Registrations"
                        description="New workers can apply to join the platform"
                        value={settings.allowWorkerRegistrations}
                        onChange={set("allowWorkerRegistrations")}
                      />
                    </div>
                    <div className="border-t border-gray-50 pt-3">
                      <Toggle
                        label="Require Worker Verification"
                        description="Workers must submit ID verification before accepting jobs"
                        value={settings.requireWorkerVerification}
                        onChange={set("requireWorkerVerification")}
                      />
                    </div>
                  </Section>

                  <Section title="Platform Status" icon={Settings}>
                    <Toggle
                      label="Maintenance Mode"
                      description="Take the platform offline for maintenance. Only admins can access."
                      value={settings.maintenanceMode}
                      onChange={set("maintenanceMode")}
                      danger
                    />
                    {settings.maintenanceMode && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 font-medium">Maintenance mode is ON. Clients and workers cannot access the platform until this is turned off.</p>
                      </div>
                    )}
                  </Section>
                </>
              )}

              {/* ── Password Tab ── */}
              {activeTab === "password" && (
                <Section title="Change Admin Password" icon={Lock}>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={currentPw}
                          onChange={e => setCurrentPw(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition"
                        />
                        <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                      <input
                        type={showPw ? "text" : "password"}
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition"
                      />
                      {confirmPw && newPw !== confirmPw && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Passwords do not match
                        </p>
                      )}
                      {confirmPw && newPw === confirmPw && newPw.length >= 8 && (
                        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passwords match
                        </p>
                      )}
                    </div>

                    <button
                      onClick={changePassword}
                      disabled={changingPw || !currentPw || !newPw || !confirmPw || newPw !== confirmPw}
                      className="w-full py-2.5 bg-[#0f172a] text-white font-bold rounded-xl hover:bg-[#1e293b] disabled:opacity-40 transition flex items-center justify-center gap-2"
                    >
                      {changingPw ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : <><Lock className="w-4 h-4" /> Update Password</>}
                    </button>
                  </div>
                </Section>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
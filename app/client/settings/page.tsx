"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User, Lock, Bell, Shield, Trash2, ChevronRight,
  Camera, Eye, EyeOff, Check, X, Loader2, Menu,
  LogOut, Phone, Mail, MapPin, AlertTriangle,
  Moon, Sun, Smartphone, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import {
  doc, getDoc, updateDoc, serverTimestamp
} from "firebase/firestore";
import {
  onAuthStateChanged, updateProfile, updateEmail,
  updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  deleteUser, signOut
} from "firebase/auth";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  displayName: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  photoURL: string;
  notifBooking: boolean;
  notifPayment: boolean;
  notifMessages: boolean;
  notifDisputes: boolean;
  notifSystem: boolean;
  twoFactor: boolean;
}

// ─── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="text-sm font-bold text-[#0c4a6e]">{title}</h2>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

// ─── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({
  label, desc, checked, onChange
}: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#0c4a6e]">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
          checked ? "bg-[#0284c7]" : "bg-gray-200"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}

// ─── Input field ────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = "text", icon, placeholder, disabled
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; icon?: React.ReactNode; placeholder?: string; disabled?: boolean;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPw = type === "password";

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
        )}
        <input
          type={isPw ? (showPw ? "text" : "password") : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${icon ? "pl-10" : "pl-4"} ${isPw ? "pr-10" : "pr-4"} py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition disabled:bg-gray-50 disabled:text-gray-400`}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Delete Account Modal ───────────────────────────────────────────────────────
function DeleteModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!pw) return;
    setLoading(true);
    await onConfirm(pw);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-[#0c4a6e] mb-1">Delete Account</h3>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            This action is <strong>permanent</strong>. All your bookings, messages, and data will be deleted.
          </p>
          <Field label="Enter your password to confirm" value={pw} onChange={setPw} type="password" placeholder="Your current password" />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!pw || loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");

  const [profile, setProfile] = useState<UserProfile>({
    displayName: "", email: "", phone: "", address: "", bio: "", photoURL: "",
    notifBooking: true, notifPayment: true, notifMessages: true,
    notifDisputes: true, notifSystem: true, twoFactor: false,
  });

  // Password fields
  const [passwords, setPasswords] = useState({ current: "", newPw: "", confirm: "" });

  const setP = (k: keyof UserProfile, v: unknown) => setProfile(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }

      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data() || {};

      setProfile(prev => ({
        ...prev,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        phone: data.phone || "",
        address: data.address || "",
        bio: data.bio || "",
        notifBooking:  data.notifBooking  ?? true,
        notifPayment:  data.notifPayment  ?? true,
        notifMessages: data.notifMessages ?? true,
        notifDisputes: data.notifDisputes ?? true,
        notifSystem:   data.notifSystem   ?? true,
        twoFactor:     data.twoFactor     ?? false,
      }));
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Save profile
  const saveProfile = async () => {
    setSaving("profile");
    try {
      const user = auth.currentUser!;
      await updateProfile(user, { displayName: profile.displayName });
      await updateDoc(doc(db, "users", user.uid), {
        displayName: profile.displayName,
        phone: profile.phone,
        address: profile.address,
        bio: profile.bio,
        updatedAt: serverTimestamp(),
      });
      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(null);
    }
  };

  // Save notification prefs
  const saveNotifications = async () => {
    setSaving("notifications");
    try {
      const user = auth.currentUser!;
      await updateDoc(doc(db, "users", user.uid), {
        notifBooking:  profile.notifBooking,
        notifPayment:  profile.notifPayment,
        notifMessages: profile.notifMessages,
        notifDisputes: profile.notifDisputes,
        notifSystem:   profile.notifSystem,
        updatedAt: serverTimestamp(),
      });
      toast.success("Notification preferences saved.");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(null);
    }
  };

  // Change password
  const changePassword = async () => {
    if (passwords.newPw !== passwords.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (passwords.newPw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving("password");
    try {
      const user = auth.currentUser!;
      const cred = EmailAuthProvider.credential(user.email!, passwords.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, passwords.newPw);
      setPasswords({ current: "", newPw: "", confirm: "" });
      toast.success("Password changed successfully.");
    } catch (err: unknown) {
      const msg = (err as { code?: string }).code === "auth/wrong-password"
        ? "Current password is incorrect." : "Failed to change password.";
      toast.error(msg);
    } finally {
      setSaving(null);
    }
  };

  // Delete account
  const handleDeleteAccount = async (pw: string) => {
    try {
      const user = auth.currentUser!;
      const cred = EmailAuthProvider.credential(user.email!, pw);
      await reauthenticateWithCredential(user, cred);
      await deleteUser(user);
      router.push("/login");
    } catch (err: unknown) {
      const msg = (err as { code?: string }).code === "auth/wrong-password"
        ? "Incorrect password." : "Failed to delete account.";
      toast.error(msg);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const NAV_ITEMS = [
    { id: "profile",       label: "Profile",       icon: <User className="w-4 h-4" /> },
    { id: "security",      label: "Security",      icon: <Lock className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "danger",        label: "Danger Zone",   icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-[#0284c7]" />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <ClientSidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex"><ClientSidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <Menu className="w-5 h-5 text-[#0c4a6e]" />
          </button>
          <span className="text-base font-bold text-[#0c4a6e]">Settings</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">

            <div className="flex flex-col lg:flex-row gap-6">

              {/* ── Side Nav ── */}
              <div className="lg:w-52 shrink-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Avatar */}
                  <div className="p-5 border-b border-gray-50 flex flex-col items-center text-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#0284c7] to-[#0c4a6e] rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {profile.displayName?.[0]?.toUpperCase() || "U"}
                      </div>
                      <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0284c7] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#0369a1] transition">
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-[#0c4a6e] truncate max-w-full">{profile.displayName || "Client"}</p>
                    <p className="text-xs text-gray-400 truncate max-w-full">{profile.email}</p>
                  </div>

                  {/* Nav */}
                  <nav className="p-2 space-y-0.5">
                    {NAV_ITEMS.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left ${
                          activeSection === item.id
                            ? item.id === "danger"
                              ? "bg-red-50 text-red-600"
                              : "bg-[#e0f2fe] text-[#0284c7]"
                            : item.id === "danger"
                              ? "text-red-500 hover:bg-red-50"
                              : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}

                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </nav>
                </div>
              </div>

              {/* ── Main Content ── */}
              <div className="flex-1 space-y-5">

                {/* Profile Section */}
                {activeSection === "profile" && (
                  <Section title="Personal Information" desc="Update your name, contact details and bio">
                    <Field label="Full Name" value={profile.displayName} onChange={v => setP("displayName", v)} icon={<User className="w-4 h-4" />} placeholder="Your full name" />
                    <Field label="Email Address" value={profile.email} onChange={() => {}} type="email" icon={<Mail className="w-4 h-4" />} disabled />
                    <p className="text-xs text-gray-400 -mt-3">To change your email, contact support.</p>
                    <Field label="Phone Number" value={profile.phone} onChange={v => setP("phone", v)} type="tel" icon={<Phone className="w-4 h-4" />} placeholder="+234 800 000 0000" />
                    <Field label="Address" value={profile.address} onChange={v => setP("address", v)} icon={<MapPin className="w-4 h-4" />} placeholder="Your city or area" />
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bio</label>
                      <textarea
                        value={profile.bio}
                        onChange={e => setP("bio", e.target.value)}
                        rows={3}
                        placeholder="Tell workers a bit about yourself (optional)"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] resize-none transition"
                      />
                    </div>
                    <button
                      onClick={saveProfile}
                      disabled={saving === "profile"}
                      className="flex items-center gap-2 bg-[#0284c7] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0369a1] transition disabled:opacity-50"
                    >
                      {saving === "profile" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </Section>
                )}

                {/* Security Section */}
                {activeSection === "security" && (
                  <>
                    <Section title="Change Password" desc="Use a strong, unique password for your account">
                      <Field label="Current Password" value={passwords.current} onChange={v => setPasswords(p => ({ ...p, current: v }))} type="password" placeholder="Enter current password" />
                      <Field label="New Password" value={passwords.newPw} onChange={v => setPasswords(p => ({ ...p, newPw: v }))} type="password" placeholder="At least 8 characters" />
                      <Field label="Confirm New Password" value={passwords.confirm} onChange={v => setPasswords(p => ({ ...p, confirm: v }))} type="password" placeholder="Repeat new password" />

                      {/* Password strength indicator */}
                      {passwords.newPw && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-400">Password strength</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                                passwords.newPw.length >= i * 3
                                  ? i <= 1 ? "bg-red-400" : i <= 2 ? "bg-yellow-400" : i <= 3 ? "bg-blue-400" : "bg-[#10b981]"
                                  : "bg-gray-100"
                              }`} />
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={changePassword}
                        disabled={saving === "password" || !passwords.current || !passwords.newPw}
                        className="flex items-center gap-2 bg-[#0284c7] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0369a1] transition disabled:opacity-50"
                      >
                        {saving === "password" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Update Password
                      </button>
                    </Section>

                    <Section title="Security Settings" desc="Manage account access and authentication">
                      <ToggleRow
                        label="Two-Factor Authentication"
                        desc="Require a verification code on new device logins"
                        checked={profile.twoFactor}
                        onChange={v => setP("twoFactor", v)}
                      />
                      <div className="flex items-center justify-between py-2 border-t border-gray-50">
                        <div>
                          <p className="text-sm font-semibold text-[#0c4a6e]">Active Sessions</p>
                          <p className="text-xs text-gray-400 mt-0.5">Manage devices that are signed in</p>
                        </div>
                        <button className="flex items-center gap-1 text-xs text-[#0284c7] font-semibold hover:underline">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Section>
                  </>
                )}

                {/* Notifications Section */}
                {activeSection === "notifications" && (
                  <Section title="Notification Preferences" desc="Choose what you want to be notified about">
                    <ToggleRow label="Booking Updates"    desc="New offers, confirmations, completions"        checked={profile.notifBooking}  onChange={v => setP("notifBooking", v)} />
                    <ToggleRow label="Payment Alerts"     desc="Escrow deposits, releases, and refunds"        checked={profile.notifPayment}  onChange={v => setP("notifPayment", v)} />
                    <ToggleRow label="New Messages"       desc="Chat messages from workers"                    checked={profile.notifMessages} onChange={v => setP("notifMessages", v)} />
                    <ToggleRow label="Dispute Updates"    desc="Status changes on your open disputes"          checked={profile.notifDisputes} onChange={v => setP("notifDisputes", v)} />
                    <ToggleRow label="System Announcements" desc="Platform news and important updates"         checked={profile.notifSystem}   onChange={v => setP("notifSystem", v)} />
                    <button
                      onClick={saveNotifications}
                      disabled={saving === "notifications"}
                      className="flex items-center gap-2 bg-[#0284c7] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0369a1] transition disabled:opacity-50"
                    >
                      {saving === "notifications" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Preferences
                    </button>
                  </Section>
                )}

                {/* Danger Zone */}
                {activeSection === "danger" && (
                  <Section title="Danger Zone" desc="Irreversible account actions">
                    <div className="border border-red-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition">
                        <div>
                          <p className="text-sm font-bold text-red-700">Delete My Account</p>
                          <p className="text-xs text-red-500 mt-0.5">Permanently delete your account and all associated data. This cannot be undone.</p>
                        </div>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="shrink-0 flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition ml-4"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-bold text-[#0c4a6e]">Export My Data</p>
                          <p className="text-xs text-gray-400 mt-0.5">Download a copy of all your data including bookings, messages, and payments.</p>
                        </div>
                        <button className="shrink-0 flex items-center gap-1.5 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 transition ml-4">
                          Export
                        </button>
                      </div>
                    </div>
                  </Section>
                )}

              </div>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteModal onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} />
        )}
      </AnimatePresence>
    </div>
  );
}
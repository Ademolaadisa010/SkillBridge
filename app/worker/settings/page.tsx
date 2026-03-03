"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Bell, AlertTriangle, LogOut, Save, Eye, EyeOff, Loader2, Menu, Camera, Phone, MapPin, Mail, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, signOut } from "firebase/auth";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import toast, { Toaster } from "react-hot-toast";

interface Profile { displayName: string; email: string; phone: string; location: string; bio: string; services: string[]; hourlyRate: string; notifBooking: boolean; notifPayment: boolean; notifMessages: boolean; notifDisputes: boolean; notifSystem: boolean; }

const SERVICES = ["Plumbing","Electrical","Carpentry","Painting","Mechanics","AC Technician","Electrician","Cleaning","Other"];
const SECTIONS = [{ id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> }, { id: "services", label: "Services", icon: <i className="fas fa-tools text-xs" /> }, { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> }, { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> }, { id: "danger", label: "Danger Zone", icon: <AlertTriangle className="w-4 h-4" /> }];

function Field({ label, value, onChange, type = "text", icon, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode; placeholder?: string; disabled?: boolean; }) {
  const [show, setShow] = useState(false); const isPw = type === "password";
  return (
    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="relative">{icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input type={isPw ? (show ? "text" : "password") : type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          className={`w-full ${icon ? "pl-10" : "pl-4"} ${isPw ? "pr-10" : "pr-4"} py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] transition disabled:bg-gray-50 disabled:text-gray-400`} />
        {isPw && <button type="button" onClick={() => setShow(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1"><p className="text-sm font-semibold text-[#0c4a6e]">{label}</p>{desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}</div>
      <button onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${checked ? "bg-[#10b981]" : "bg-gray-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50"><h2 className="text-sm font-bold text-[#0c4a6e]">{title}</h2>{desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}</div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function DeleteModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState(""); const [loading, setLoading] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center"><div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-red-500" /></div><h3 className="text-base font-bold text-[#0c4a6e] mb-1">Delete Account</h3><p className="text-sm text-gray-500 mb-5 leading-relaxed">This is <strong>permanent</strong>. All jobs, earnings history, and reviews will be deleted.</p><Field label="Confirm Password" value={pw} onChange={setPw} type="password" placeholder="Your current password" /></div>
        <div className="px-6 pb-6 flex gap-3"><button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button><button onClick={async () => { setLoading(true); await onConfirm(pw); setLoading(false); }} disabled={!pw || loading} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete</button></div>
      </motion.div>
    </motion.div>
  );
}

export default function WorkerSettingsPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [section, setSection] = useState("profile");
  const [showDelete, setShowDelete] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [profile, setProfile] = useState<Profile>({ displayName: "", email: "", phone: "", location: "", bio: "", services: [], hourlyRate: "", notifBooking: true, notifPayment: true, notifMessages: true, notifDisputes: true, notifSystem: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.push("/login"); return; }
      const snap = await getDoc(doc(db, "workers", user.uid));
      const d = snap.data() || {};
      setProfile(p => ({ ...p, displayName: user.displayName || "", email: user.email || "", phone: d.phone || "", location: d.location || "", bio: d.bio || "", services: d.services || [], hourlyRate: d.hourlyRate || "", notifBooking: d.notifBooking ?? true, notifPayment: d.notifPayment ?? true, notifMessages: d.notifMessages ?? true, notifDisputes: d.notifDisputes ?? true, notifSystem: d.notifSystem ?? true }));
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const setP = (k: keyof Profile, v: unknown) => setProfile(p => ({ ...p, [k]: v }));

  const saveProfile = async () => {
    setSaving("profile");
    try { const user = auth.currentUser!; await updateProfile(user, { displayName: profile.displayName }); await updateDoc(doc(db, "workers", user.uid), { fullName: profile.displayName, phone: profile.phone, location: profile.location, bio: profile.bio, updatedAt: serverTimestamp() }); toast.success("Profile saved."); } catch { toast.error("Failed to save."); } finally { setSaving(null); }
  };

  const saveServices = async () => {
    setSaving("services");
    try { await updateDoc(doc(db, "workers", auth.currentUser!.uid), { services: profile.services, hourlyRate: profile.hourlyRate, updatedAt: serverTimestamp() }); toast.success("Services saved."); } catch { toast.error("Failed to save."); } finally { setSaving(null); }
  };

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) { toast.error("Passwords don't match."); return; }
    if (passwords.new.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSaving("password");
    try { const user = auth.currentUser!; const cred = EmailAuthProvider.credential(user.email!, passwords.current); await reauthenticateWithCredential(user, cred); await updatePassword(user, passwords.new); setPasswords({ current: "", new: "", confirm: "" }); toast.success("Password updated."); } catch (e: any) { toast.error(e.code === "auth/wrong-password" ? "Current password is incorrect." : "Failed to change password."); } finally { setSaving(null); }
  };

  const saveNotifs = async () => {
    setSaving("notifs");
    try { await updateDoc(doc(db, "workers", auth.currentUser!.uid), { notifBooking: profile.notifBooking, notifPayment: profile.notifPayment, notifMessages: profile.notifMessages, notifDisputes: profile.notifDisputes, notifSystem: profile.notifSystem, updatedAt: serverTimestamp() }); toast.success("Preferences saved."); } catch { toast.error("Failed to save."); } finally { setSaving(null); }
  };

  const handleDelete = async (pw: string) => {
    try { const user = auth.currentUser!; await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, pw)); await deleteUser(user); router.push("/login"); } catch (e: any) { toast.error(e.code === "auth/wrong-password" ? "Incorrect password." : "Failed to delete account."); }
  };

  const toggleService = (s: string) => setP("services", profile.services.includes(s) ? profile.services.filter(x => x !== s) : [...profile.services, s]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-[#10b981]" /></div>;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />
      <WorkerSidebar />
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><div className="absolute left-0 top-0 h-full [&>aside]:flex"><WorkerSidebar /></div></div>}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><Menu className="w-5 h-5 text-[#0c4a6e]" /></button>
          <span className="text-base font-bold text-[#0c4a6e]">Settings</span>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-6">

              {/* Side nav */}
              <div className="lg:w-52 shrink-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-50 flex flex-col items-center text-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center text-white text-xl font-bold">{profile.displayName?.[0]?.toUpperCase() || "W"}</div>
                      <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#10b981] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#059669] transition"><Camera className="w-3 h-3" /></button>
                    </div>
                    <p className="text-sm font-bold text-[#0c4a6e] truncate max-w-full">{profile.displayName || "Worker"}</p>
                    <p className="text-xs text-gray-400 truncate max-w-full">{profile.email}</p>
                  </div>
                  <nav className="p-2 space-y-0.5">
                    {SECTIONS.map(s => (
                      <button key={s.id} onClick={() => setSection(s.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left ${section === s.id ? s.id === "danger" ? "bg-red-50 text-red-600" : "bg-[#dcfce7] text-[#10b981]" : s.id === "danger" ? "text-red-500 hover:bg-red-50" : "text-gray-600 hover:bg-gray-50"}`}>{s.icon}{s.label}</button>
                    ))}
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <button onClick={async () => { await signOut(auth); router.push("/login"); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"><LogOut className="w-4 h-4" /> Logout</button>
                    </div>
                  </nav>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-5">
                {section === "profile" && (
                  <Section title="Personal Information" desc="Your name, contact and bio">
                    <Field label="Full Name" value={profile.displayName} onChange={v => setP("displayName", v)} icon={<User className="w-4 h-4" />} placeholder="Your full name" />
                    <Field label="Email" value={profile.email} onChange={() => {}} type="email" icon={<Mail className="w-4 h-4" />} disabled />
                    <p className="text-xs text-gray-400 -mt-3">To change email, contact support.</p>
                    <Field label="Phone" value={profile.phone} onChange={v => setP("phone", v)} type="tel" icon={<Phone className="w-4 h-4" />} placeholder="+234 800 000 0000" />
                    <Field label="Location / Service Area" value={profile.location} onChange={v => setP("location", v)} icon={<MapPin className="w-4 h-4" />} placeholder="e.g. Lekki, Lagos" />
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bio</label><textarea value={profile.bio} onChange={e => setP("bio", e.target.value)} rows={3} placeholder="Describe your skills and experience..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981] resize-none transition" /></div>
                    <button onClick={saveProfile} disabled={saving === "profile"} className="flex items-center gap-2 bg-[#10b981] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-50">{saving === "profile" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile</button>
                  </Section>
                )}

                {section === "services" && (
                  <Section title="Services & Pricing" desc="What you offer and your rate">
                    <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Services Offered</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{SERVICES.map(s => <button key={s} onClick={() => toggleService(s)} className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition text-left ${profile.services.includes(s) ? "border-[#10b981] bg-[#dcfce7] text-[#10b981]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{s}</button>)}</div></div>
                    <Field label="Hourly Rate (₦)" value={profile.hourlyRate} onChange={v => setP("hourlyRate", v)} type="number" placeholder="e.g. 3000" />
                    <button onClick={saveServices} disabled={saving === "services"} className="flex items-center gap-2 bg-[#10b981] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-50">{saving === "services" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Services</button>
                  </Section>
                )}

                {section === "security" && (
                  <Section title="Change Password" desc="Use a strong, unique password">
                    <Field label="Current Password" value={passwords.current} onChange={v => setPasswords(p => ({ ...p, current: v }))} type="password" placeholder="Current password" />
                    <Field label="New Password" value={passwords.new} onChange={v => setPasswords(p => ({ ...p, new: v }))} type="password" placeholder="At least 8 characters" />
                    <Field label="Confirm New Password" value={passwords.confirm} onChange={v => setPasswords(p => ({ ...p, confirm: v }))} type="password" placeholder="Repeat new password" />
                    {passwords.new && <div className="space-y-1.5"><p className="text-xs text-gray-400">Strength</p><div className="flex gap-1">{[1,2,3,4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${passwords.new.length >= i * 3 ? i <= 1 ? "bg-red-400" : i <= 2 ? "bg-yellow-400" : i <= 3 ? "bg-blue-400" : "bg-[#10b981]" : "bg-gray-100"}`} />)}</div></div>}
                    <button onClick={changePassword} disabled={saving === "password" || !passwords.current || !passwords.new} className="flex items-center gap-2 bg-[#10b981] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-50">{saving === "password" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Update Password</button>
                  </Section>
                )}

                {section === "notifications" && (
                  <Section title="Notification Preferences" desc="Choose what you get notified about">
                    <Toggle label="New Job Assignments" desc="When a client accepts your offer" checked={profile.notifBooking} onChange={v => setP("notifBooking", v)} />
                    <Toggle label="Payment Alerts" desc="Escrow deposits and wallet releases" checked={profile.notifPayment} onChange={v => setP("notifPayment", v)} />
                    <Toggle label="New Messages" desc="Chat messages from clients" checked={profile.notifMessages} onChange={v => setP("notifMessages", v)} />
                    <Toggle label="Dispute Updates" desc="Status changes on your disputes" checked={profile.notifDisputes} onChange={v => setP("notifDisputes", v)} />
                    <Toggle label="System Announcements" desc="Platform news and updates" checked={profile.notifSystem} onChange={v => setP("notifSystem", v)} />
                    <button onClick={saveNotifs} disabled={saving === "notifs"} className="flex items-center gap-2 bg-[#10b981] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-50">{saving === "notifs" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Preferences</button>
                  </Section>
                )}

                {section === "danger" && (
                  <Section title="Danger Zone" desc="Irreversible account actions">
                    <div className="border border-red-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-red-50">
                        <div><p className="text-sm font-bold text-red-700">Delete My Account</p><p className="text-xs text-red-500 mt-0.5">Permanently remove your account and all earnings history. Cannot be undone.</p></div>
                        <button onClick={() => setShowDelete(true)} className="shrink-0 flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition ml-4"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    </div>
                    <div className="border border-gray-100 rounded-xl">
                      <div className="flex items-center justify-between p-4">
                        <div><p className="text-sm font-bold text-[#0c4a6e]">Export My Data</p><p className="text-xs text-gray-400 mt-0.5">Download your jobs, earnings, and messages history.</p></div>
                        <button className="shrink-0 flex items-center gap-1.5 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 transition ml-4">Export</button>
                      </div>
                    </div>
                  </Section>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <AnimatePresence>{showDelete && <DeleteModal onClose={() => setShowDelete(false)} onConfirm={handleDelete} />}</AnimatePresence>
    </div>
  );
}
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wrench, Zap, Hammer, Paintbrush, Car, Wind, Plug, Scissors,
  MapPin, Calendar, Clock, Upload, X, ChevronRight, CheckCircle2,
  Menu, ArrowLeft, Info, Image as ImageIcon, FileText, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import toast, { Toaster } from "react-hot-toast";

// ─── Data ───────────────────────────────────────────────────────────────────────
const categories = [
  { id: "plumbing",      label: "Plumbing",      icon: <Wrench className="w-5 h-5" />,     color: "bg-blue-500",   light: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "electrical",    label: "Electrical",    icon: <Zap className="w-5 h-5" />,         color: "bg-yellow-500", light: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { id: "carpentry",     label: "Carpentry",     icon: <Hammer className="w-5 h-5" />,      color: "bg-orange-500", light: "bg-orange-50 border-orange-200 text-orange-700" },
  { id: "painting",      label: "Painting",      icon: <Paintbrush className="w-5 h-5" />,  color: "bg-green-500",  light: "bg-green-50 border-green-200 text-green-700" },
  { id: "mechanics",     label: "Mechanics",     icon: <Car className="w-5 h-5" />,         color: "bg-red-500",    light: "bg-red-50 border-red-200 text-red-700" },
  { id: "ac-technician", label: "AC Technician", icon: <Wind className="w-5 h-5" />,        color: "bg-cyan-500",   light: "bg-cyan-50 border-cyan-200 text-cyan-700" },
  { id: "electrician",   label: "Electrician",   icon: <Plug className="w-5 h-5" />,        color: "bg-purple-500", light: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "other",         label: "Other",         icon: <Scissors className="w-5 h-5" />,    color: "bg-gray-500",   light: "bg-gray-50 border-gray-200 text-gray-700" },
];

const STEPS = ["Describe", "Category", "Location & Date", "Review"];

// ─── Step Indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < current  ? "bg-[#10b981] border-[#10b981] text-white" :
              i === current ? "bg-[#0284c7] border-[#0284c7] text-white" :
              "bg-white border-gray-200 text-gray-400"
            }`}>
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] font-semibold mt-1 whitespace-nowrap ${
              i <= current ? "text-[#0284c7]" : "text-gray-400"
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${i < current ? "bg-[#10b981]" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────
export default function BookServicePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    description: "",
    category: "",
    images: [] as File[],
    address: "",
    date: "",
    time: "",
    urgency: "normal" as "normal" | "urgent",
    notes: "",
  });

  const set = (field: string, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 4 - form.images.length);
    set("images", [...form.images, ...newFiles]);
  };

  const removeImage = (i: number) =>
    set("images", form.images.filter((_, idx) => idx !== i));

  // Validation per step
  const canProceed = () => {
    if (step === 0) return form.description.trim().length >= 20;
    if (step === 1) return !!form.category;
    if (step === 2) return form.address.trim().length > 3 && !!form.date;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) { router.push("/login"); return; }

      await addDoc(collection(db, "jobs"), {
        clientId: user.uid,
        clientName: user.displayName || "Client",
        description: form.description,
        category: form.category,
        address: form.address,
        date: form.date,
        time: form.time,
        urgency: form.urgency,
        notes: form.notes,
        imageCount: form.images.length,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast.success("Job posted! Workers will send you offers shortly.", {
        style: { border: "1px solid #a7f3d0", background: "#fff", color: "#264653" },
        iconTheme: { primary: "#10b981", secondary: "#fff" },
      });

      setTimeout(() => router.push("/client/bookings"), 1500);
    } catch (err) {
      console.error(err);
      toast.error("Failed to post job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === form.category);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <ClientSidebar />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full [&>aside]:flex">
            <ClientSidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
            <Menu className="w-5 h-5 text-[#0c4a6e]" />
          </button>
          <span className="text-base font-bold text-[#0c4a6e]">Book a Service</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">

            {/* Page header */}
            <div className="flex items-center gap-3 mb-6">
              <Link href="/client/dashboard" className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition shrink-0">
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-[#0c4a6e]">Book a Service</h1>
                <p className="text-xs text-gray-400">Fill in the details and get offers from verified workers</p>
              </div>
            </div>

            {/* Step indicator */}
            <StepIndicator current={step} />

            {/* Form Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <AnimatePresence mode="wait">

                {/* ── Step 0: Describe ── */}
                {step === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-[#0c4a6e] mb-1">Describe your problem</h2>
                      <p className="text-xs text-gray-400 mb-4">Be as specific as possible so workers understand what you need.</p>
                      <textarea
                        value={form.description}
                        onChange={e => set("description", e.target.value)}
                        rows={5}
                        placeholder="e.g. My bathroom tap has been leaking for 2 days. The pipe under the sink is dripping and there's water on the floor. I need it fixed urgently..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] resize-none transition"
                      />
                      <div className={`text-xs mt-1.5 text-right ${form.description.length >= 20 ? "text-[#10b981]" : "text-gray-400"}`}>
                        {form.description.length} / 20 min characters
                      </div>
                    </div>

                    {/* Image upload */}
                    <div>
                      <label className="block text-sm font-semibold text-[#0c4a6e] mb-3">
                        Upload images <span className="text-gray-400 font-normal">(optional, up to 4)</span>
                      </label>

                      <div className="grid grid-cols-4 gap-3">
                        {form.images.map((file, i) => (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => removeImage(i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {form.images.length < 4 && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-[#0284c7] hover:bg-[#f0f9ff] transition"
                          >
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                            <span className="text-[10px] text-gray-400">Add</span>
                          </button>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => addImages(e.target.files)} />
                    </div>

                    {/* Urgency */}
                    <div>
                      <label className="block text-sm font-semibold text-[#0c4a6e] mb-3">Urgency</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: "normal", label: "Normal", desc: "Within a few days", icon: <Clock className="w-4 h-4" /> },
                          { id: "urgent", label: "Urgent", desc: "ASAP — today", icon: <Zap className="w-4 h-4" /> },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => set("urgency", opt.id)}
                            className={`p-4 rounded-xl border-2 text-left transition ${
                              form.urgency === opt.id
                                ? opt.id === "urgent"
                                  ? "border-orange-400 bg-orange-50"
                                  : "border-[#0284c7] bg-[#e0f2fe]"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className={`mb-1 ${form.urgency === opt.id ? opt.id === "urgent" ? "text-orange-500" : "text-[#0284c7]" : "text-gray-400"}`}>
                              {opt.icon}
                            </div>
                            <div className="text-sm font-bold text-[#0c4a6e]">{opt.label}</div>
                            <div className="text-xs text-gray-500">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 1: Category ── */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="p-6 sm:p-8">
                    <h2 className="text-base font-bold text-[#0c4a6e] mb-1">Select a category</h2>
                    <p className="text-xs text-gray-400 mb-5">Choose the type of service you need.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => set("category", cat.id)}
                          className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2.5 transition group ${
                            form.category === cat.id
                              ? "border-[#0284c7] bg-[#e0f2fe]"
                              : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
                          }`}
                        >
                          <div className={`w-12 h-12 ${cat.color} rounded-2xl flex items-center justify-center text-white group-hover:scale-105 transition-transform ${form.category === cat.id ? "scale-105" : ""}`}>
                            {cat.icon}
                          </div>
                          <span className={`text-xs font-semibold ${form.category === cat.id ? "text-[#0284c7]" : "text-gray-600"}`}>
                            {cat.label}
                          </span>
                          {form.category === cat.id && (
                            <CheckCircle2 className="w-4 h-4 text-[#0284c7] absolute top-2 right-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: Location & Date ── */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-[#0c4a6e] mb-1">Location & Date</h2>
                      <p className="text-xs text-gray-400 mb-5">Where should the worker come, and when?</p>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#0c4a6e]">Service Address *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={form.address}
                          onChange={e => set("address", e.target.value)}
                          placeholder="Enter your full address…"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition"
                        />
                      </div>
                      <div className="flex items-start gap-1.5 mt-1">
                        <Info className="w-3.5 h-3.5 text-[#0284c7] shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-400">Your exact address is only shared with the worker after payment is confirmed.</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-[#0c4a6e]">Preferred Date *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="date"
                            value={form.date}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={e => set("date", e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-[#0c4a6e]">Preferred Time</label>
                        <div className="relative">
                          <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="time"
                            value={form.time}
                            onChange={e => set("time", e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] transition bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional notes */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#0c4a6e]">
                        Additional Notes <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                        <textarea
                          value={form.notes}
                          onChange={e => set("notes", e.target.value)}
                          rows={3}
                          placeholder="Any gate codes, instructions, or special requirements…"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] resize-none transition"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: Review ── */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="p-6 sm:p-8 space-y-5">
                    <div>
                      <h2 className="text-base font-bold text-[#0c4a6e] mb-1">Review your request</h2>
                      <p className="text-xs text-gray-400">Confirm the details before posting your job.</p>
                    </div>

                    <div className="space-y-3">
                      {/* Category */}
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                        <div className={`w-10 h-10 ${selectedCategory?.color} rounded-xl flex items-center justify-center text-white shrink-0`}>
                          {selectedCategory?.icon}
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Category</div>
                          <div className="text-sm font-semibold text-[#0c4a6e]">{selectedCategory?.label}</div>
                        </div>
                        <button onClick={() => setStep(1)} className="ml-auto text-xs text-[#0284c7] hover:underline">Edit</button>
                      </div>

                      {/* Description */}
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-gray-400">Description</div>
                          <button onClick={() => setStep(0)} className="text-xs text-[#0284c7] hover:underline">Edit</button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{form.description}</p>
                      </div>

                      {/* Location & Date */}
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs text-gray-400">Location & Schedule</div>
                          <button onClick={() => setStep(2)} className="text-xs text-[#0284c7] hover:underline">Edit</button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700">{form.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700">{form.date}{form.time ? ` at ${form.time}` : ""}</span>
                          </div>
                        </div>
                      </div>

                      {/* Urgency */}
                      <div className={`flex items-center gap-3 p-4 rounded-xl ${form.urgency === "urgent" ? "bg-orange-50 border border-orange-100" : "bg-gray-50"}`}>
                        {form.urgency === "urgent"
                          ? <Zap className="w-4 h-4 text-orange-500 shrink-0" />
                          : <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        }
                        <div>
                          <div className="text-xs text-gray-400">Urgency</div>
                          <div className={`text-sm font-semibold capitalize ${form.urgency === "urgent" ? "text-orange-600" : "text-[#0c4a6e]"}`}>
                            {form.urgency === "urgent" ? "Urgent — ASAP" : "Normal"}
                          </div>
                        </div>
                      </div>

                      {/* Images */}
                      {form.images.length > 0 && (
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="text-xs text-gray-400 mb-3">{form.images.length} image{form.images.length > 1 ? "s" : ""} attached</div>
                          <div className="flex gap-2">
                            {form.images.map((f, i) => (
                              <img key={i} src={URL.createObjectURL(f)} alt="" className="w-14 h-14 rounded-lg object-cover" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Escrow notice */}
                    <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#065f46]">Your payment is escrow-protected</p>
                        <p className="text-xs text-[#047857] mt-0.5">You only pay after accepting an offer. Funds are held securely until the job is complete.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer nav */}
              <div className="px-6 sm:px-8 pb-6 pt-2 flex items-center justify-between border-t border-gray-50 mt-2">
                <button
                  onClick={() => setStep(s => s - 1)}
                  disabled={step === 0}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                {step < 3 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 bg-[#0284c7] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0369a1] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-[#10b981] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#059669] transition disabled:opacity-60 shadow-md"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : <><Upload className="w-4 h-4" /> Post Job</>}
                  </button>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
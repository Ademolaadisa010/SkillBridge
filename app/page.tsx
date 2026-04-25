"use client";

import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/logo.jpg";
import { motion, type Variants } from "framer-motion";
import {
  ShieldCheck,
  BadgeCheck,
  Star,
  Users,
  Zap,
  MapPin,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Wrench,
  Hammer,
  Paintbrush,
  Car,
  Plug,
  Wind,
  MessageSquare,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import Hero from "@/public/hero-sec.jpg";

// ─── Animation Variants ────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring", stiffness: 140 } },
};

// ─── Data ──────────────────────────────────────────────────────────────────────
const categories = [
  { label: "Plumbing", icon: <Wrench className="w-7 h-7 text-white" />, color: "bg-blue-500", count: "5+" },
  { label: "Electrical", icon: <Zap className="w-7 h-7 text-white" />, color: "bg-yellow-500", count: "10+" },
  { label: "Carpentry", icon: <Hammer className="w-7 h-7 text-white" />, color: "bg-orange-500", count: "5+" },
  { label: "Painting", icon: <Paintbrush className="w-7 h-7 text-white" />, color: "bg-green-500", count: "15+" },
  { label: "Mechanics", icon: <Car className="w-7 h-7 text-white" />, color: "bg-red-500", count: "20+" },
  { label: "Electrician", icon: <Plug className="w-7 h-7 text-white" />, color: "bg-purple-500", count: "8+" },
  { label: "AC Technician", icon: <Wind className="w-7 h-7 text-white" />, color: "bg-cyan-500", count: "6+" },
  { label: "Welding", icon: <Wrench className="w-7 h-7 text-white" />, color: "bg-rose-500", count: "30+" },
];

const trustFeatures = [
  {
    icon: <ShieldCheck className="w-8 h-8 text-[#10b981]" />,
    title: "Manual Escrow Payments",
    desc: "Your money is held securely until the job is completed to your satisfaction. Zero risk.",
  },
  {
    icon: <BadgeCheck className="w-8 h-8 text-[#10b981]" />,
    title: "Verified Workers",
    desc: "Every artisan is ID-verified and skill-approved by our admin team before going live.",
  },
  {
    icon: <Star className="w-8 h-8 text-[#10b981]" />,
    title: "Transparent Ratings",
    desc: "Real reviews from real clients after every completed job. No fake stars.",
  },
  {
    icon: <AlertCircle className="w-8 h-8 text-[#10b981]" />,
    title: "Dispute Resolution",
    desc: "If something goes wrong, our team reviews evidence and makes a fair decision.",
  },
];

const topWorkers = [
  { name: "Taiwo Adeyemi", role: "Master Electrician", location: "Abuja, Nigeria", rating: 4.9, rate: "₦1,000" },
  { name: "Chidi Okafor", role: "Professional Plumber", location: "Lagos, Nigeria", rating: 4.8, rate: "₦900" },
  { name: "Emeka Eze", role: "Expert Carpenter", location: "Port Harcourt, NG", rating: 5.0, rate: "₦1,200" },
  { name: "Bola Akinwale", role: "AC Technician", location: "Ibadan, Nigeria", rating: 4.7, rate: "₦850" },
];

const testimonials = [
  {
    quote: "Found an amazing electrician through SkillBridge. Professional, punctual, and excellent work. The escrow payment gave me full confidence.",
    name: "Mohammed Usman",
    role: "Homeowner, Abuja",
    image: "/hero.jpg"
  },
  {
    quote: "As a carpenter, SkillBridge transformed my business. Consistent work, fair rates, and the verification builds real trust with clients.",
    name: "Kofi Asante",
    role: "Carpenter, Lagos",
    image: "/hero-sec.jpg"
  },

  {
    quote: "The chat system and secure booking are so convenient. Discussed my plumbing issue, got a quote, and scheduled everything in minutes.",
    name: "Gentle",
    role: "Business Owner, Lagos",
    image: "/test.jpg"
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="font-sans bg-white text-gray-900 antialiased overflow-x-hidden">

      <motion.nav
        className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div>
              <Image className="cursor-pointer" src={Logo} alt="logo" width={200} />
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-[#0284c7] text-sm font-medium transition">How It Works</a>
              <a href="#services" className="text-gray-600 hover:text-[#0284c7] text-sm font-medium transition">Services</a>
              <a href="#why-us" className="text-gray-600 hover:text-[#0284c7] text-sm font-medium transition">Why SkillBridge</a>
              <a href="#testimonials" className="text-gray-600 hover:text-[#0284c7] text-sm font-medium transition">Testimonials</a>
              <Link href="/register?role=worker" className="text-gray-600 hover:text-[#0284c7] text-sm font-medium transition">
                Become a Worker
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-[#0c4a6e] text-sm font-semibold hover:text-[#0284c7] transition px-4 py-2">
                Login
              </Link>
              <Link
                href="/register"
                className="bg-[#0284c7] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0369a1] transition shadow-md"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <Link href="/login"className="bg-[#0284c7] md:hidden text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0369a1] transition shadow-md">
              Login
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-[#0c4a6e] via-[#075985] to-[#0369a1] text-white overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#10b981] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0284c7] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Left copy */}
            <motion.div
              className="flex-1 text-center lg:text-left"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
                <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
                Nigeria's Most Trusted Skills Platform
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5">
                Find Trusted Skilled Workers Near You — {" "}
                <span className="text-[#34d399]">Fast.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-blue-100 text-lg sm:text-xl mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                From home repairs to technical services, connect with reliable professionals in your area and get any job done quickly and without stress.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/login"
                  className="bg-[#10b981] text-white px-8 py-4 rounded-lg font-bold text-base hover:bg-[#059669] transition shadow-lg flex items-center justify-center gap-2"
                >
                  <i className="fas fa-search"></i> Book a Service
                </Link>
                <Link
                  href="/register?role=worker"
                  className="bg-white/10 border-2 border-white/40 text-white px-8 py-4 rounded-lg font-bold text-base hover:bg-white hover:text-[#0c4a6e] transition flex items-center justify-center gap-2 backdrop-blur-sm"
                >
                  <i className="fas fa-briefcase"></i> Join as Worker
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeUp} className="flex items-center justify-center lg:justify-start gap-8 mt-10">
                {[
                  { value: "50+", label: "Skilled Workers" },
                  { value: "10+", label: "Jobs Completed" },
                  { value: "4.8★", label: "Avg. Rating" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-[#34d399]">{stat.value}</div>
                    <div className="text-xs text-blue-200 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right image */}
            <motion.div
              className="flex-1 w-full max-w-lg"
              variants={fadeRight}
              initial="hidden"
              animate="show"
            >
              <div className="relative">
                <Image
                  src={Hero}
                  alt="Skilled workers at work"
                  className="rounded-2xl shadow-2xl w-full h-64 sm:h-80 lg:h-[420px] object-cover"
                />
                {/* Floating badge */}
                <div className="absolute -bottom-5 -left-5 bg-white text-[#0c4a6e] rounded-xl p-4 shadow-xl flex items-center gap-3">
                  <div className="bg-[#10b981] p-2 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Payment Protection</div>
                    <div className="text-sm font-bold">Manual Escrow Secured</div>
                  </div>
                </div>
                <div className="absolute -top-5 -right-5 bg-[#0c4a6e] border border-white/20 text-white rounded-xl p-4 shadow-xl flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-[#34d399]" />
                  <div>
                    <div className="text-xs text-blue-300">All Workers</div>
                    <div className="text-sm font-bold">ID Verified</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <span className="inline-block bg-[#e0f2fe] text-[#0284c7] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">Simple Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0c4a6e] mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Get quality work done in three simple steps</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            {/* For Clients */}
            <motion.div variants={fadeLeft} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-[#0c4a6e] text-white px-4 py-1.5 rounded-full text-sm font-bold">For Clients</div>
              </div>
              <div className="space-y-6">
                {[
                  { step: "01", icon: <i className="fas fa-pen-to-square text-[#0284c7] text-2xl" />, title: "Post a Job", desc: "Describe your problem, upload images, select a category, pin your location, and set a date." },
                  { step: "02", icon: <i className="fas fa-handshake text-[#0284c7] text-2xl" />, title: "Get Offers", desc: "Verified workers in your area respond with offers. Compare profiles, ratings, and prices." },
                  { step: "03", icon: <i className="fas fa-lock text-[#10b981] text-2xl" />, title: "Pay Securely & Get Work Done", desc: "Funds are held in escrow. Release payment only after the job is completed to your satisfaction." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-[#0284c7]/20 rounded-xl flex items-center justify-center shadow-sm">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0284c7] mb-0.5">STEP {item.step}</div>
                      <h3 className="text-base font-bold text-[#0c4a6e] mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* For Workers */}
            <motion.div variants={fadeRight} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-[#10b981] text-white px-4 py-1.5 rounded-full text-sm font-bold">For Workers</div>
              </div>
              <div className="space-y-6">
                {[
                  { step: "01", icon: <i className="fas fa-user-check text-[#10b981] text-2xl" />, title: "Create Your Profile", desc: "Sign up, upload your ID, list your skills and service area. Our team verifies and approves you." },
                  { step: "02", icon: <i className="fas fa-paper-plane text-[#10b981] text-2xl" />, title: "Send Offers", desc: "Browse incoming job requests, send competitive offers, and chat directly with clients." },
                  { step: "03", icon: <i className="fas fa-wallet text-[#10b981] text-2xl" />, title: "Get Paid Securely", desc: "Complete the job, mark it done, and your earnings are released from escrow to your wallet." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-[#10b981]/20 rounded-xl flex items-center justify-center shadow-sm">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#10b981] mb-0.5">STEP {item.step}</div>
                      <h3 className="text-base font-bold text-[#0c4a6e] mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Why SkillBridge ── */}
      <section id="why-us" className="py-16 sm:py-24 bg-[#0c4a6e] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-72 h-72 bg-[#10b981] rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#0284c7] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <span className="inline-block bg-white/10 text-[#34d399] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider border border-white/10">Why Choose Us</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built on Trust & Security</h2>
            <p className="text-blue-200 text-lg max-w-xl mx-auto">Every feature is designed to protect both clients and workers</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {trustFeatures.map((f, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition backdrop-blur-sm"
              >
                <div className="bg-white/10 p-3 rounded-xl inline-flex mb-4">{f.icon}</div>
                <h3 className="text-base font-bold mb-2">{f.title}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Service Categories ── */}
      <section id="services" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <span className="inline-block bg-[#e0f2fe] text-[#0284c7] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">Services</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0c4a6e] mb-4">Popular Categories</h2>
            <p className="text-gray-500 text-lg">Find the right professional for any job</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-[#0284c7]/30 hover:shadow-lg transition cursor-pointer bg-white"
              >
                <div className={`w-14 h-14 ${cat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#0c4a6e]">{cat.label}</div>
                  <div className="text-xs text-gray-400">{cat.count} workers</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Top Rated Workers ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-[#f0f9ff] to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <motion.div
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <div>
              <span className="inline-block bg-[#e0f2fe] text-[#0284c7] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
                Top Rated
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0c4a6e]">
                Trusted Skilled Workers
              </h2>
              <p className="text-gray-500 mt-2">
                Reliable professionals ready to help you get any job done.
              </p>
            </div>

            <Link
              href="/login"
              className="text-[#0284c7] font-semibold hover:text-[#0369a1] flex items-center gap-1 text-sm shrink-0"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {topWorkers.map((worker, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition group"
              >
                {/* Gradient Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#38bdf8] flex items-center justify-center text-white font-bold text-lg mb-4">
                  {worker.name.charAt(0)}
                </div>

                {/* Name */}
                <h3 className="font-bold text-[#0c4a6e] text-base mb-1">
                  {worker.name}
                </h3>

                {/* Role */}
                <p className="text-sm text-gray-500 mb-2">
                  {worker.role}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                  <MapPin className="w-3 h-3" /> {worker.location}
                </div>

                {/* Rating + Verified */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    {worker.rating}
                  </div>

                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                </div>

                {/* CTA */}
                <Link
                  href="/login"
                  className="block text-center bg-[#0284c7] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#0369a1] transition"
                >
                  Contact
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Dashboard Preview / Features ── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <span className="inline-block bg-[#dcfce7] text-[#059669] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">Platform Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0c4a6e] mb-4">Everything You Need, In One Place</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Powerful tools for clients and workers alike</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Client Features */}
            <motion.div
              variants={fadeLeft}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#e0f2fe] to-[#f0f9ff] rounded-3xl p-8 border border-[#bae6fd]"
            >
              <div className="inline-flex items-center gap-2 bg-[#0284c7] text-white px-4 py-1.5 rounded-full text-sm font-bold mb-6">
                <Users className="w-4 h-4" /> For Clients
              </div>
              <h3 className="text-xl font-bold text-[#0c4a6e] mb-6">Your Client Dashboard Includes</h3>
              <ul className="space-y-4">
                {[
                  { icon: <i className="fas fa-calendar-check text-[#0284c7]" />, label: "Book & track services easily" },
                  { icon: <MessageSquare className="w-4 h-4 text-[#0284c7]" />, label: "Secure in-platform messaging" },
                  { icon: <CreditCard className="w-4 h-4 text-[#0284c7]" />, label: "Escrow payments & receipts" },
                  { icon: <Star className="w-4 h-4 text-[#0284c7]" />, label: "Save & rebook favourite workers" },
                  { icon: <AlertCircle className="w-4 h-4 text-[#0284c7]" />, label: "Dispute submission & tracking" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                      {item.icon}
                    </div>
                    {item.label}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-2 bg-[#0284c7] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#0369a1] transition"
              >
                Get Started as Client <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Worker Features */}
            <motion.div
              variants={fadeRight}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#dcfce7] to-[#f0fdf4] rounded-3xl p-8 border border-[#bbf7d0]"
            >
              <div className="inline-flex items-center gap-2 bg-[#10b981] text-white px-4 py-1.5 rounded-full text-sm font-bold mb-6">
                <Wrench className="w-4 h-4" /> For Workers
              </div>
              <h3 className="text-xl font-bold text-[#0c4a6e] mb-6">Your Worker Dashboard Includes</h3>
              <ul className="space-y-4">
                {[
                  { icon: <i className="fas fa-inbox text-[#10b981]" />, label: "Receive & manage job requests" },
                  { icon: <i className="fas fa-wallet text-[#10b981]" />, label: "Earnings & withdrawal tracking" },
                  { icon: <Star className="w-4 h-4 text-[#10b981]" />, label: "Ratings and client reviews" },
                  { icon: <BadgeCheck className="w-4 h-4 text-[#10b981]" />, label: "Profile, portfolio & certifications" },
                  { icon: <AlertCircle className="w-4 h-4 text-[#10b981]" />, label: "Dispute management support" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                      {item.icon}
                    </div>
                    {item.label}
                  </li>
                ))}
              </ul>
              <Link
                href="/register?role=worker"
                className="mt-8 inline-flex items-center gap-2 bg-[#10b981] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#059669] transition"
              >
                Join as a Worker <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <span className="inline-block bg-[#e0f2fe] text-[#0284c7] text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0c4a6e] mb-4">What Our Users Say</h2>
            <p className="text-gray-500 text-lg">Real experiences from our growing community</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="bg-white p-7 rounded-2xl shadow-md border border-gray-100 flex flex-col"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                 <Image
                    src={t.image}
                    alt={t.name}
                    width={40}
                    height={10}
                    className="rounded-full object-cover"
                  />
                  <div>
                    <div className="text-sm font-bold text-[#0c4a6e]">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-[#0c4a6e] to-[#0369a1]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of satisfied clients and skilled workers across Nigeria. It's free to sign up.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="bg-[#10b981] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#059669] transition shadow-lg"
              >
                Find Workers Now
              </Link>
              <Link
                href="/register?role=worker"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-[#0c4a6e] transition"
              >
                Register as Worker
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0c4a6e] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-[#10b981] p-2 rounded-lg">
                  <i className="fas fa-handshake text-white text-lg"></i>
                </div>
                <span className="text-xl font-bold">SkillBridge</span>
              </div>
              <p className="text-blue-200 text-sm leading-relaxed mb-4">
                Connecting verified skilled workers with clients across Nigeria. Building trust, one job at a time.
              </p>
              <div className="flex gap-3">
                {["facebook-f", "twitter", "instagram", "linkedin-in"].map((s) => (
                  <a
                    key={s}
                    href="https://www.facebook.com/skillbridgenigeria"
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#10b981] transition text-sm"
                  >
                    <i className={`fab fa-${s}`}></i>
                  </a>
                ))}
              </div>
            </div>

            {/* For Clients */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">For Clients</h4>
              <ul className="space-y-2 text-sm text-blue-200">
                {["Find Workers", "How It Works", "Safety Tips", "Dispute Center"].map((l) => (
                  <li key={l}>
                    <a href="/login" className="hover:text-[#34d399] transition">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Workers */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">For Workers</h4>
              <ul className="space-y-2 text-sm text-blue-200">
                {["Join as Worker", "Verification Process", "Earnings & Payouts", "Success Stories"].map((l) => (
                  <li key={l}>
                    <a href="/register" className="hover:text-[#34d399] transition">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-sm text-blue-200">
                {[
                  { label: "About Us", href: "#" },
                  { label: "Contact", href: "/contact" },
                  { label: "Help Center", href: "/help" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Privacy Policy", href: "/privacy" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-[#34d399] transition">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-blue-300">&copy; 2025 SkillBridge. All rights reserved.</p>
            <div className="flex items-center gap-2 text-xs text-blue-300">
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
              <span>Secure & Encrypted Platform</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
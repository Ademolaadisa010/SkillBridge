"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown,
  CreditCard, ShieldCheck, AlertCircle, UserCheck, ArrowLeft,
  Send, X, MessageSquare, Minimize2, CheckCircle, BookOpen,
  Star, Banknote, Settings, Bug, FileText, HelpCircle, Zap,
  Clock, Users
} from "lucide-react";

type Article = { id: string; title: string; content: string[]; category: string };
type Category = { id: string; label: string; icon: React.ReactNode; color: string; bg: string; articles: Article[] };
type Message = { role: "ai" | "user"; text: string; time: string };

const clientCategories: Category[] = [
  {
    id: "booking", label: "Booking & Payments",
    icon: <CreditCard className="w-5 h-5" />, color: "text-[#0284c7]", bg: "bg-[#e0f2fe]",
    articles: [
      {
        id: "how-to-book", title: "How do I book a service?", category: "Booking & Payments",
        content: [
          "Log in to your client dashboard and click **Book Service** in the sidebar.",
          "Describe your problem clearly and upload any relevant images.",
          "Select the correct service category (e.g., Plumbing, Electrical).",
          "Pin your location on the map and set your preferred date and time.",
          "Submit your booking — verified workers in your area will send you offers.",
          "Review each worker's profile, rating, and price before accepting."
        ]
      },
      {
        id: "payment-methods", title: "What payment methods are accepted?", category: "Booking & Payments",
        content: [
          "SkillBridge supports bank transfers, debit cards, and mobile wallets.",
          "All payments are processed securely through our payment gateway.",
          "Your money is held in escrow and only released after job confirmation.",
          "You can download payment receipts from your Payments dashboard."
        ]
      }
    ]
  },
  {
    id: "escrow", label: "Escrow & Refunds",
    icon: <ShieldCheck className="w-5 h-5" />, color: "text-[#10b981]", bg: "bg-[#dcfce7]",
    articles: [
      {
        id: "how-escrow-works", title: "How does escrow work?", category: "Escrow & Refunds",
        content: [
          "When you pay for a service, your money is NOT sent directly to the worker.",
          "It is held securely by SkillBridge in an escrow account.",
          "The worker only receives payment after you confirm the job is completed.",
          "This protects you from paying for work that has not been done.",
          "If there is a dispute, our admin team reviews the case before any funds move.",
          "Escrow funds are typically released within 24 hours of job confirmation."
        ]
      },
      {
        id: "refund-policy", title: "How do I request a refund?", category: "Escrow & Refunds",
        content: [
          "Go to your Payments dashboard and find the relevant booking.",
          "Click Request Refund and provide a clear reason.",
          "If a job was not started, refunds process within 3-5 business days.",
          "For disputed jobs, refunds are reviewed by our admin team.",
          "Partial refunds may be issued if work was partially completed.",
          "All refund decisions made by the admin team are final."
        ]
      }
    ]
  },
  {
    id: "disputes", label: "Disputes",
    icon: <AlertCircle className="w-5 h-5" />, color: "text-orange-500", bg: "bg-orange-50",
    articles: [
      {
        id: "open-dispute", title: "How do I open a dispute?", category: "Disputes",
        content: [
          "Navigate to the **Disputes** section in your client dashboard.",
          "Select the booking related to the issue.",
          "Clearly describe what went wrong and what outcome you expect.",
          "Upload any evidence including photos, chat screenshots, or receipts.",
          "Our admin team will review your case within 24-48 hours.",
          "You will receive notifications at every stage of the review process."
        ]
      }
    ]
  },
  {
    id: "account", label: "Account & Security",
    icon: <UserCheck className="w-5 h-5" />, color: "text-purple-500", bg: "bg-purple-50",
    articles: [
      {
        id: "reset-password", title: "How do I reset my password?", category: "Account & Security",
        content: [
          "Click **Forgot Password** on the login page.",
          "Enter the email address linked to your account.",
          "Check your inbox for a password reset link (also check spam folder).",
          "Click the link and enter a new strong password.",
          "Log in with your new password.",
          "Reset links expire after 30 minutes for your security."
        ]
      }
    ]
  }
];

const workerCategories: Category[] = [
  {
    id: "offers", label: "Sending Offers",
    icon: <Send className="w-5 h-5" />, color: "text-[#0284c7]", bg: "bg-[#e0f2fe]",
    articles: [
      {
        id: "how-to-offer", title: "How do I send an offer to a client?", category: "Sending Offers",
        content: [
          "Go to **Job Requests** in your worker dashboard.",
          "Browse available jobs in your skill category and service area.",
          "Click on a job to view full details, images, and client requirements.",
          "Click **Send Offer** and enter your price and estimated completion time.",
          "Add a short message explaining why you are the right fit for this job.",
          "Wait for the client to accept — you will get an instant notification."
        ]
      }
    ]
  },
  {
    id: "getting-paid", label: "Getting Paid",
    icon: <Banknote className="w-5 h-5" />, color: "text-[#10b981]", bg: "bg-[#dcfce7]",
    articles: [
      {
        id: "payment-timeline", title: "When do I receive my payment?", category: "Getting Paid",
        content: [
          "Payment is released from escrow after the client confirms job completion.",
          "Mark the job as **Completed** in your dashboard when you finish.",
          "The client has 48 hours to confirm or raise a dispute.",
          "If no action is taken in 48 hours, payment is automatically released to you.",
          "Funds appear in your SkillBridge wallet immediately after release.",
          "Withdraw to your bank account from the **Withdraw Funds** section."
        ]
      }
    ]
  },
  {
    id: "withdrawals", label: "Withdrawals",
    icon: <CreditCard className="w-5 h-5" />, color: "text-orange-500", bg: "bg-orange-50",
    articles: [
      {
        id: "how-to-withdraw", title: "How do I withdraw my earnings?", category: "Withdrawals",
        content: [
          "Go to **Withdraw Funds** in your worker dashboard.",
          "Ensure your bank account is linked and verified by admin.",
          "Enter the amount you wish to withdraw (minimum is 500).",
          "Confirm the withdrawal. Processing takes 1-3 business days.",
          "You will receive an SMS and email notification once processed.",
          "Platform commission is deducted before the withdrawal is sent."
        ]
      }
    ]
  },
  {
    id: "verification", label: "Verification",
    icon: <CheckCircle className="w-5 h-5" />, color: "text-purple-500", bg: "bg-purple-50",
    articles: [
      {
        id: "verify-account", title: "How does worker verification work?", category: "Verification",
        content: [
          "Upload a valid government-issued ID during or after registration.",
          "Submit your skill category and any relevant certifications.",
          "Link and verify your bank account details.",
          "Our admin team reviews submissions within 24-48 hours.",
          "You will receive a notification once you are approved.",
          "Verified workers get a green badge on their profile, building client trust."
        ]
      }
    ]
  },
  {
    id: "ratings", label: "Ratings",
    icon: <Star className="w-5 h-5" />, color: "text-yellow-500", bg: "bg-yellow-50",
    articles: [
      {
        id: "how-ratings-work", title: "How do ratings work?", category: "Ratings",
        content: [
          "After every completed job, clients can rate you from 1 to 5 stars.",
          "They can also leave a written review visible on your profile.",
          "Your average rating is displayed publicly to all potential clients.",
          "Higher ratings increase your visibility in search results.",
          "Disputed or cancelled jobs do not generate ratings.",
          "You can respond to any review from your **Ratings and Reviews** dashboard."
        ]
      }
    ]
  }
];

const generalCategories: Category[] = [
  {
    id: "rules", label: "Platform Rules",
    icon: <FileText className="w-5 h-5" />, color: "text-[#0c4a6e]", bg: "bg-slate-100",
    articles: [
      {
        id: "platform-rules", title: "What are SkillBridge platform rules?", category: "Platform Rules",
        content: [
          "All transactions must be conducted through the SkillBridge platform.",
          "Exchanging personal contact information before payment is prohibited.",
          "Fraudulent activity results in immediate account suspension.",
          "Workers must only accept jobs within their verified skill categories.",
          "Clients must provide accurate job descriptions and locations.",
          "Violations can be reported via the Disputes or Contact page."
        ]
      }
    ]
  },
  {
    id: "fraud", label: "Fraud & Safety",
    icon: <ShieldCheck className="w-5 h-5" />, color: "text-red-500", bg: "bg-red-50",
    articles: [
      {
        id: "report-fraud", title: "How do I report fraud or suspicious activity?", category: "Fraud & Safety",
        content: [
          "If you suspect fraud, do NOT complete the transaction.",
          "Report immediately via the Contact page, selecting **Report Fraud**.",
          "Provide as much detail as possible including booking ID and screenshots.",
          "Our security team escalates fraud cases within 4 hours.",
          "Your account will be protected while investigation is ongoing.",
          "SkillBridge will never ask for your password or full card number."
        ]
      }
    ]
  },
  {
    id: "technical", label: "Technical Issues",
    icon: <Bug className="w-5 h-5" />, color: "text-gray-500", bg: "bg-gray-100",
    articles: [
      {
        id: "app-not-working", title: "The app is not working. What should I do?", category: "Technical Issues",
        content: [
          "First, try refreshing the page or restarting the app.",
          "Clear your browser cache and cookies, then try again.",
          "Ensure your internet connection is stable.",
          "Try logging out and logging back in.",
          "If the issue persists, contact us via the Contact page with a screenshot.",
          "Our technical team responds to reported issues within 24 hours."
        ]
      }
    ]
  }
];

function getAIResponse(input: string): { text: string; escalate?: boolean } {
  const q = input.toLowerCase();
  if (q.includes("withdraw"))
    return { text: "To withdraw your earnings, go to **Withdraw Funds** in your worker dashboard. Make sure your bank account is verified first. Minimum withdrawal is 500 and processing takes 1-3 business days. Your funds must be in Available Balance (not locked in escrow) before withdrawing." };
  if (q.includes("escrow") || q.includes("payment locked") || q.includes("money locked") || q.includes("stuck"))
    return { text: "Your payment is held in escrow, a secure account that protects both you and the worker. Funds are released after you confirm the job is complete. If the job is done, go to **My Bookings then In Progress** and click **Confirm Completion** to release the payment." };
  if (q.includes("refund"))
    return { text: "To request a refund, go to your **Payments** dashboard, find the booking, and click Request Refund. Refunds for unstarted jobs process in 3-5 business days. For disputed jobs, our admin team reviews the case.", escalate: true };
  if (q.includes("dispute") || q.includes("complain") || q.includes("problem"))
    return { text: "To open a dispute, go to **Disputes** in your dashboard, select the booking, describe the issue, and upload any evidence. Our admin team reviews all disputes within 24-48 hours and notifies you at every stage.", escalate: true };
  if (q.includes("not responding") || q.includes("ghost"))
    return { text: "If the other party is not responding, wait at least 24 hours first. If still no response, you can open a dispute from your dashboard. For workers, if a client does not confirm completion after 48 hours, funds are automatically released." };
  if (q.includes("verify") || q.includes("verification") || q.includes("id upload"))
    return { text: "Verification requires uploading a valid government ID and your bank details. Admin reviews submissions within 24-48 hours. If verification has been pending over 48 hours, please contact support with your account email." };
  if (q.includes("book") || q.includes("find a worker"))
    return { text: "To book a service, go to your client dashboard and click **Book Service**. Describe your problem, select a category, pin your location, and set a date. Verified workers nearby will send you offers. You only pay after accepting." };
  if (q.includes("rating") || q.includes("review"))
    return { text: "Ratings are given by clients after completed jobs. Your average rating is shown publicly on your worker profile and increases your visibility in search results. View and respond to all reviews in **Ratings and Reviews**." };
  if (q.includes("fraud") || q.includes("scam") || q.includes("suspicious"))
    return { text: "This sounds serious. Do NOT complete any suspicious transaction. I am escalating this to our security team right now. A ticket will be created and our team will contact you within 4 hours.", escalate: true };
  if (q.includes("password") || q.includes("login") || q.includes("access"))
    return { text: "To reset your password, click **Forgot Password** on the login page and enter your email address. Check your inbox and spam folder for the reset link. Links expire after 30 minutes. Contact support if you still cannot get in." };
  if (q.includes("commission") || q.includes("fee") || q.includes("how much"))
    return { text: "SkillBridge deducts a platform commission from each completed job. See the exact breakdown in your **Earnings** dashboard under Commission Breakdown. Commission funds escrow protection, dispute resolution, and platform operations." };
  return {
    text: "I am not sure I fully understand your question. I can help with: escrow and payments, withdrawals, disputes, booking, verification, ratings, and account issues. Could you rephrase, or would you like me to connect you to a human agent?",
    escalate: true
  };
}

function AIChat({ onClose, onMinimize }: { onClose: () => void; onMinimize: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hi there! I am **SkillBridge AI Support**. How can I help you today?\n\nAsk me about payments, escrow, disputes, withdrawals, or anything else on the platform.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [ticketCreated, setTicketCreated] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const quickReplies = ["How does escrow work?", "How do I withdraw?", "Open a dispute", "Payment is stuck"];

  const sendMessage = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages(prev => [...prev, { role: "user", text: msg, time }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const res = getAIResponse(msg);
      let responseText = res.text;
      if (res.escalate && !ticketCreated) {
        const id = "SB" + Math.floor(10000 + Math.random() * 90000);
        setTicketCreated(id);
        responseText += "\n\nSupport ticket created: **#" + id + "**\nOur team will respond within 24-48 hours. You will receive updates by email and in-app notification.";
      }
      setMessages(prev => [...prev, { role: "ai", text: responseText, time }]);
      setTyping(false);
    }, 1300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="fixed bottom-24 right-4 sm:right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 flex flex-col"
      style={{ maxHeight: "560px" }}
    >
      <div className="bg-gradient-to-r from-[#0c4a6e] to-[#0369a1] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#10b981] rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">SkillBridge AI</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#34d399] rounded-full animate-pulse" />
              <span className="text-blue-200 text-xs">Online · Replies instantly</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMinimize} className="p-1.5 text-white/60 hover:text-white transition rounded-lg hover:bg-white/10">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white transition rounded-lg hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]" style={{ maxHeight: "340px" }}>
        {messages.map((m, i) => (
          <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "ai" && (
              <div className="w-7 h-7 bg-[#0c4a6e] rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                <Zap className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={"max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed " + (
              m.role === "user"
                ? "bg-[#0284c7] text-white rounded-tr-sm"
                : "bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-sm"
            )}>
              <div className="whitespace-pre-wrap">
                {m.text.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                  j % 2 === 1
                    ? <strong key={j} className={m.role === "user" ? "text-white" : "text-[#0c4a6e]"}>{part}</strong>
                    : part
                )}
              </div>
              <div className={"text-[10px] mt-1 " + (m.role === "user" ? "text-blue-200" : "text-gray-400")}>{m.time}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-[#0c4a6e] rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map((d, i) => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: d + "ms" }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2 bg-[#f8fafc] shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {quickReplies.map((r, i) => (
              <button key={i} onClick={() => sendMessage(r)}
                className="text-[11px] bg-white border border-[#0284c7]/30 text-[#0284c7] px-3 py-1.5 rounded-full hover:bg-[#e0f2fe] transition font-medium">
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-white border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          />
          <button onClick={() => sendMessage()}
            className="w-7 h-7 bg-[#0284c7] rounded-lg flex items-center justify-center hover:bg-[#0369a1] transition shrink-0">
            <Send className="w-3 h-3 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">AI cannot make refunds or payment decisions</p>
      </div>
    </motion.div>
  );
}

function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <button onClick={onBack} className="flex items-center gap-2 text-[#0284c7] text-sm font-medium mb-6 hover:text-[#0369a1] transition">
        <ArrowLeft className="w-4 h-4" /> Back to Help Center
      </button>
      <div className="max-w-2xl">
        <div className="inline-block bg-[#e0f2fe] text-[#0284c7] text-xs font-bold px-3 py-1 rounded-full mb-3">{article.category}</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0c4a6e] mb-8">{article.title}</h1>
        <ol className="space-y-5">
          {article.content.map((step, i) => (
            <li key={i} className="flex gap-4">
              <div className="w-8 h-8 bg-[#0c4a6e] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
              <p className="text-gray-700 leading-relaxed pt-1 text-sm sm:text-base">
                {step.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                  j % 2 === 1 ? <strong key={j} className="text-[#0c4a6e]">{part}</strong> : part
                )}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-10 pt-8 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-4">Was this article helpful?</p>
          {helpful === null ? (
            <div className="flex gap-3">
              <button onClick={() => setHelpful(true)}
                className="flex items-center gap-2 border border-gray-200 px-5 py-2.5 rounded-xl text-sm text-gray-700 hover:border-[#10b981] hover:text-[#10b981] hover:bg-[#f0fdf4] transition font-medium">
                <ThumbsUp className="w-4 h-4" /> Yes, it helped
              </button>
              <button onClick={() => setHelpful(false)}
                className="flex items-center gap-2 border border-gray-200 px-5 py-2.5 rounded-xl text-sm text-gray-700 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition font-medium">
                <ThumbsDown className="w-4 h-4" /> No, need more help
              </button>
            </div>
          ) : helpful ? (
            <div className="flex items-center gap-2 text-[#10b981] font-semibold">
              <CheckCircle className="w-5 h-5" /> Great! Glad this helped.
            </div>
          ) : (
            <div className="bg-[#e0f2fe] border border-[#bae6fd] rounded-2xl p-5">
              <p className="text-[#0c4a6e] font-bold mb-1">Let us get you more help.</p>
              <p className="text-gray-600 text-sm mb-4">Chat with our AI assistant or contact our human support team directly.</p>
              <Link href="/contact" className="bg-[#0284c7] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#0369a1] transition inline-block">
                Contact Support
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CategorySection({ title, categories, icon }: { title: string; categories: Category[]; icon: React.ReactNode }) {
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  if (activeArticle) return <ArticleView article={activeArticle} onBack={() => setActiveArticle(null)} />;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">{icon}</div>
        <h2 className="text-base font-bold text-[#0c4a6e] uppercase tracking-wider">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div key={cat.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition">
            <button
              onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + cat.bg + " " + cat.color}>{cat.icon}</div>
                <span className="font-semibold text-[#0c4a6e] text-sm">{cat.label}</span>
              </div>
              <div className={"transition-transform duration-200 " + (openCat === cat.id ? "rotate-180" : "")}>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </button>
            <AnimatePresence>
              {openCat === cat.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden border-t border-gray-100"
                >
                  {cat.articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => setActiveArticle(article)}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition text-left group"
                    >
                      <span className="text-sm text-gray-700 group-hover:text-[#0284c7] transition">{article.title}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-[#0284c7] transition" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);

  const allArticles = [
    ...clientCategories.flatMap(c => c.articles),
    ...workerCategories.flatMap(c => c.articles),
    ...generalCategories.flatMap(c => c.articles),
  ];

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setSelectedArticle(null);
    if (q.length < 2) { setSearchResults([]); return; }
    const results = allArticles.filter(a =>
      a.title.toLowerCase().includes(q.toLowerCase()) ||
      a.category.toLowerCase().includes(q.toLowerCase()) ||
      a.content.some(c => c.toLowerCase().includes(q.toLowerCase()))
    );
    setSearchResults(results);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="bg-gradient-to-br from-[#0c4a6e] via-[#075985] to-[#0369a1] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pb-14">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/" className="text-blue-300 hover:text-white text-sm transition flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Home
            </Link>
            <ChevronRight className="w-3 h-3 text-blue-400" />
            <span className="text-blue-200 text-sm">Help Center</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">How can we help you?</h1>
            <p className="text-blue-200 mb-7 text-sm sm:text-base">Search our knowledge base or browse categories below.</p>
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for help... e.g. How does escrow work?"
                className="w-full pl-12 pr-10 py-4 rounded-2xl text-gray-800 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10b981] shadow-xl"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {["How do I withdraw money?", "How does escrow work?", "How to report a dispute?", "Reset my password"].map((s) => (
                <button key={s} onClick={() => handleSearch(s)}
                  className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-blue-100 px-3 py-1.5 rounded-full transition">
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="border-t border-white/10 bg-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-4 sm:gap-10">
            {[
              { icon: <BookOpen className="w-3.5 h-3.5" />, label: "12 Articles" },
              { icon: <Clock className="w-3.5 h-3.5" />, label: "24/7 AI Support" },
              { icon: <Users className="w-3.5 h-3.5" />, label: "Human agents available" },
              { icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Avg. response: 24hrs" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-blue-200 text-xs">{s.icon} {s.label}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <AnimatePresence mode="wait">
          {searchQuery && (
            <motion.div key="results" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-10">
              {selectedArticle ? (
                <ArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} />
              ) : searchResults.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-[#0c4a6e] mb-4">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
                  </p>
                  <div className="space-y-2">
                    {searchResults.map((a) => (
                      <button key={a.id} onClick={() => setSelectedArticle(a)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-[#0284c7]/40 hover:shadow-md transition text-left group">
                        <div>
                          <div className="font-semibold text-[#0c4a6e] text-sm group-hover:text-[#0284c7] transition">{a.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{a.category}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-[#0284c7] transition" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
                  <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="font-bold text-gray-700 mb-1">No results for &quot;{searchQuery}&quot;</p>
                  <p className="text-sm text-gray-500 mb-5">Try different keywords, or ask our AI assistant directly.</p>
                  <button onClick={() => { setChatOpen(true); setChatMinimized(false); }}
                    className="bg-[#0284c7] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[#0369a1] transition">
                    Ask AI Support
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!searchQuery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <CategorySection title="For Clients" categories={clientCategories} icon={<Users className="w-4 h-4 text-[#0284c7]" />} />
            <CategorySection title="For Workers" categories={workerCategories} icon={<Settings className="w-4 h-4 text-[#10b981]" />} />
            <CategorySection title="General" categories={generalCategories} icon={<BookOpen className="w-4 h-4 text-[#0c4a6e]" />} />
            <div className="mt-6 bg-gradient-to-r from-[#0c4a6e] to-[#0369a1] rounded-2xl p-8 text-center text-white">
              <div className="w-12 h-12 bg-[#10b981] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Still need help?</h3>
              <p className="text-blue-200 text-sm mb-6 max-w-md mx-auto">
                Our AI assistant answers instantly 24/7. For complex issues, our human support team responds within 24-48 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => { setChatOpen(true); setChatMinimized(false); }}
                  className="bg-[#10b981] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#059669] transition flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Chat with AI Support
                </button>
                <Link href="/contact"
                  className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/20 transition flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Contact Human Support
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && !chatMinimized && (
            <AIChat onClose={() => setChatOpen(false)} onMinimize={() => setChatMinimized(true)} />
          )}
        </AnimatePresence>
        {chatOpen && chatMinimized && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setChatMinimized(false)}
            className="bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-2 hover:shadow-xl transition"
          >
            <Zap className="w-4 h-4 text-[#0284c7]" />
            <span className="text-sm font-semibold text-[#0c4a6e]">SkillBridge AI</span>
            <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => { setChatOpen(!chatOpen); setChatMinimized(false); }}
          className="w-14 h-14 bg-gradient-to-br from-[#0284c7] to-[#0c4a6e] rounded-full shadow-2xl flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {chatOpen
              ? <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-6 h-6 text-white" /></motion.div>
              : <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageSquare className="w-6 h-6 text-white" /></motion.div>
            }
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
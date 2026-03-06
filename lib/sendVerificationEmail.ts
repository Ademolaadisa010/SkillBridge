/**
 * useEmailVerification.ts
 * 
 * Sends a branded HTML verification email via EmailJS so it lands in
 * the inbox (not spam) — instead of relying on Firebase's default mailer.
 *
 * SETUP STEPS:
 * 1. Go to https://www.emailjs.com and create a free account
 * 2. Add an Email Service (Gmail recommended — use your support email)
 * 3. Create an Email Template with these variables:
 *      {{to_name}}       — recipient's display name
 *      {{to_email}}      — recipient's email
 *      {{verify_link}}   — the Firebase verification URL
 *      {{app_name}}      — "SkillBridge"
 * 4. Copy your Service ID, Template ID, and Public Key into .env.local:
 *      NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_xxxxxxx
 *      NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xxxxxxx
 *      NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
 * 5. Install: npm install @emailjs/browser
 *
 * HOW IT WORKS:
 * - Firebase generates a secure verification link via generateEmailVerificationLink()
 *   (done server-side via a Next.js API route to keep your service account secret)
 * - We send that link ourselves via EmailJS using our own Gmail/SMTP
 * - Result: email comes FROM your domain, not from firebase, so it bypasses spam filters
 */

import emailjs from "@emailjs/browser";

const SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  || "";

interface SendVerificationParams {
  toName:  string;
  toEmail: string;
  verifyLink: string;
}

/**
 * Sends a branded verification email via EmailJS.
 * Falls back silently if env vars are not set (Firebase fallback is used instead).
 */
export async function sendVerificationEmail({
  toName,
  toEmail,
  verifyLink,
}: SendVerificationParams): Promise<{ success: boolean; error?: string }> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn("[EmailJS] Missing env vars — falling back to Firebase default email.");
    return { success: false, error: "EmailJS not configured" };
  }

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_name:    toName || "there",
        to_email:   toEmail,
        verify_link: verifyLink,
        app_name:   "SkillBridge",
        support_email: "support@skillbridge.ng",
      },
      PUBLIC_KEY
    );
    return { success: true };
  } catch (error: any) {
    console.error("[EmailJS] Failed to send verification email:", error);
    return { success: false, error: error?.text || String(error) };
  }
}
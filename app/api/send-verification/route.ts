/**
 * app/api/send-verification/route.ts
 *
 * Server-side API route that:
 * 1. Uses Firebase Admin SDK to generate a secure email verification link
 * 2. Sends it via EmailJS (server-side) so the email comes from YOUR domain
 *    — this is why it won't land in spam.
 *
 * SETUP:
 * Add to .env.local:
 *   FIREBASE_PROJECT_ID=your-project-id
 *   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
 *   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *   EMAILJS_SERVICE_ID=service_xxxxxxx
 *   EMAILJS_TEMPLATE_ID=template_xxxxxxx
 *   EMAILJS_PRIVATE_KEY=xxxxxxxxxxxxxxx   ← use Private Key (not Public Key) for server
 *
 * Get Firebase Admin credentials from:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

import { NextRequest, NextResponse } from "next/server";

async function getAdminAuth() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getAuth();
}

export async function POST(req: NextRequest) {
  try {
    const { uid, email, displayName, continueUrl } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ error: "uid and email are required" }, { status: 400 });
    }

    // 1. Generate secure verification link via Firebase Admin
    const adminAuth = await getAdminAuth();
    const verifyLink = await adminAuth.generateEmailVerificationLink(email, {
      url: continueUrl || `${process.env.NEXT_PUBLIC_APP_URL || "https://skillbridge.ng"}/login?verified=true`,
    });

    // 2. Send via EmailJS server-side using their REST API
    const emailjsRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id:  process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id:     process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_name:       displayName || "there",
          to_email:      email,
          verify_link:   verifyLink,
          app_name:      "SkillBridge",
          support_email: "support@skillbridge.ng",
        },
      }),
    });

    if (!emailjsRes.ok) {
      const errText = await emailjsRes.text();
      console.error("[send-verification] EmailJS error:", errText);
      // Don't fail the whole request — Firebase verification link still works
      return NextResponse.json({ success: true, emailjs: false, warning: "EmailJS failed, user can request resend" });
    }

    return NextResponse.json({ success: true, emailjs: true });
  } catch (err: any) {
    console.error("[send-verification] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
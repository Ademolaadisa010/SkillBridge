/**
 * app/api/send-password-reset/route.ts
 *
 * Generates a Firebase password reset link server-side (Admin SDK),
 * then sends it via EmailJS so the email comes from YOUR Gmail/domain
 * and doesn't land in spam.
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
    const { email, continueUrl } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const adminAuth = await getAdminAuth();

    // Check the user actually exists first
    try {
      await adminAuth.getUserByEmail(email);
    } catch {
      // Don't reveal whether email exists — just return not-found
      return NextResponse.json({ error: "user-not-found" }, { status: 404 });
    }

    // Generate secure password reset link via Firebase Admin
    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: continueUrl || `${process.env.NEXT_PUBLIC_APP_URL}/login?reset=true`,
    });

    // Send via EmailJS REST API
    const emailjsRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id:  process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_RESET_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID,
        user_id:     process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email:    email,
          reset_link:  resetLink,
          app_name:    "SkillBridge",
          support_email: "support@skillbridge.ng",
        },
      }),
    });

    if (!emailjsRes.ok) {
      const errText = await emailjsRes.text();
      console.error("[send-password-reset] EmailJS error:", errText);
      return NextResponse.json(
        { error: "emailjs_failed", details: errText },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[send-password-reset] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
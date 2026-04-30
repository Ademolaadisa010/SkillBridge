import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import * as admin from "firebase-admin";

// ── Firebase Admin (shared init guard) ───────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// ── Nodemailer transporter (same as verification route) ───────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── HTML email template ───────────────────────────────────────────────────────
function buildPasswordResetHTML(name: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your SkillBridge password</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0c4a6e 0%,#075985 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
              <img src="https://skillbridge.vercel.app/logo.jpg" width="200" alt="SkillBridge Logo" />
            </div>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0c4a6e;">
              Reset your password
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              Hi <strong>${name}</strong>,<br/>
              You requested to reset your SkillBridge password. Click the button below to set a new password.
            </p>

            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetLink}"
                style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 4px 12px rgba(16,185,129,0.35);letter-spacing:0.3px;">
                🔑 Reset Password
              </a>
            </div>

            <!-- Info box -->
            <div style="background:#fefce8;border:1px solid #fef08c;border-radius:12px;padding:16px 20px;margin:24px 0;">
              <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.6;">
                <strong>⚠️ This link expires in 1 hour for security reasons.</strong><br/>
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>

            <!-- Manual link -->
            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${resetLink}" style="color:#0284c7;word-break:break-all;">${resetLink}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} SkillBridge Nigeria · All rights reserved<br/>
              Questions? Email us at <a href="mailto:support@skillbridge.ng" style="color:#0284c7;text-decoration:none;">support@skillbridge.ng</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { email, continueUrl } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    // 1. Look up user — mirrors verification route; also resolves displayName
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      // Don't reveal whether the email exists
      return NextResponse.json({ error: "user-not-found" }, { status: 404 });
    }

    const displayName = userRecord.displayName || "there";

    // 2. Generate Firebase password-reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: continueUrl || `${process.env.NEXT_PUBLIC_APP_URL}/login?reset=true`,
    });

    // 3. Send via Nodemailer — same pattern as send-verification
    await transporter.sendMail({
      from:    `"SkillBridge" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: "Reset your SkillBridge password 🔑",
      html:    buildPasswordResetHTML(displayName, resetLink),
      text: `Hi ${displayName},\n\nYou requested to reset your SkillBridge password.\n\nClick this link to reset it:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\n— The SkillBridge Team`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[send-password-reset] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
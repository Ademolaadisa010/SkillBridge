import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import * as admin from "firebase-admin";

// ── Firebase Admin init ───────────────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// ── Nodemailer transporter ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── HTML email template ───────────────────────────────────────────────────────
function buildAnnouncementHTML(name: string, subject: string, body: string): string {
  // Convert plain newlines to <br> for HTML rendering
  const htmlBody = body.replace(/\n/g, "<br/>");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#FFF 0%,#FFF 100%);border-bottom: 2px solid #0c4a6e; padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <img src="https://skillbridge.vercel.app/logo.jpg" width="200" alt="SkillBridge Logo" />
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#10b981;text-transform:uppercase;letter-spacing:1px;">
              Announcement
            </p>
            <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#0c4a6e;line-height:1.3;">
              ${subject}
            </h1>
            <p style="margin:0 0 8px;font-size:15px;color:#64748b;line-height:1.6;">
              Hi <strong>${name}</strong>,
            </p>
            <div style="font-size:15px;color:#475569;line-height:1.8;margin:16px 0 24px;">
              ${htmlBody}
            </div>

            <!-- Divider -->
            <div style="border-top:1px solid #e2e8f0;margin:28px 0;"></div>

            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
              You're receiving this because you have a SkillBridge account.<br/>
              Questions? Reply to <a href="mailto:skillbridgenigeria@gmail.com" style="color:#0284c7;text-decoration:none;">support@skillbridge</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} SkillBridge Nigeria · All rights reserved
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

// ── Fetch ALL users from Firebase Auth (handles pagination) ───────────────────
async function getAllUsers(): Promise<{ email: string; name: string }[]> {
  const users: { email: string; name: string }[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const result: admin.auth.ListUsersResult = await admin.auth().listUsers(1000, pageToken);

    for (const user of result.users) {
      // Skip users without a verified email or no email at all
      if (!user.email) continue;
      users.push({
        email: user.email,
        name:  user.displayName || "there",
      });
    }

    pageToken = result.pageToken;
  } while (pageToken);

  return users;
}

// ── Helper: send one email ────────────────────────────────────────────────────
async function sendOne(
  to: string,
  name: string,
  subject: string,
  body: string
): Promise<void> {
  await transporter.sendMail({
    from:    `"SkillBridge" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html:    buildAnnouncementHTML(name, subject, body),
    text:    `Hi ${name},\n\n${body}\n\n— The SkillBridge Team`,
  });
}

// ── POST /api/send-announcement ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Simple admin secret check — add ADMIN_SECRET to your .env
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, body } = await req.json();

    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: "subject and body are required" },
        { status: 400 }
      );
    }

    // 1. Fetch all registered users
    const users = await getAllUsers();

    if (users.length === 0) {
      return NextResponse.json({ error: "No users found" }, { status: 404 });
    }

    // 2. Send emails — batched to avoid Gmail rate limits (20 at a time)
    const BATCH_SIZE = 20;
    const DELAY_MS   = 1500; // wait 1.5s between batches

    let sent   = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            await sendOne(user.email, user.name, subject, body);
            sent++;
          } catch (err: any) {
            failed++;
            errors.push(`${user.email}: ${err?.message}`);
          }
        })
      );

      // Delay between batches (skip delay after last batch)
      if (i + BATCH_SIZE < users.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    console.log(`[send-announcement] Sent: ${sent}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      total:   users.length,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[send-announcement] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
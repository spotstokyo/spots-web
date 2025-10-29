import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST() {
  if (!resendClient || !resendFromEmail) {
    return NextResponse.json(
      { error: "Email provider is not configured." },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[send-welcome] Failed to load user", authError);
    return NextResponse.json({ error: "Failed to load user." }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, display_name, welcome_sent")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[send-welcome] Failed to load profile", profileError);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }

  if (profile?.welcome_sent) {
    return NextResponse.json({ message: "Welcome email already sent." });
  }

  const recipientEmail = profile?.email ?? user.email;
  if (!recipientEmail) {
    return NextResponse.json({ error: "User email is not available." }, { status: 400 });
  }

  const displayName =
    profile?.display_name ??
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined) ??
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined) ??
    inferNameFromEmail(recipientEmail);

  try {
    await resendClient.emails.send({
      from: resendFromEmail,
      to: recipientEmail,
      subject: "Welcome to Spots!",
      html: buildWelcomeHtml(displayName),
    });
  } catch (error) {
    console.error("[send-welcome] Failed to send welcome email", error);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: profile?.email ?? user.email,
        display_name: profile?.display_name,
        welcome_sent: true,
      },
      { onConflict: "id" },
    );

  if (updateError) {
    console.error("[send-welcome] Failed to update profile", updateError);
    return NextResponse.json({ error: "Failed to record welcome email." }, { status: 500 });
  }

  return NextResponse.json({ message: "Welcome email sent." });
}

function buildWelcomeHtml(name: string) {
  const safeName = escapeHtml(name);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Welcome to Spots</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background-color: #f9fafb; padding: 0; margin: 0; }
          .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border-radius: 12px; }
          h1 { font-size: 24px; margin-bottom: 16px; }
          p { line-height: 1.6; margin: 0 0 16px; }
          a { color: #ec4899; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Spots, ${safeName}!</h1>
          <p>We&rsquo;re excited to have you here. Start exploring curated spots, save your favourites, and share your own discoveries.</p>
          <p>If you ever have questions or feedback, just hit reply—we read everything.</p>
          <p>Happy exploring,</p>
          <p>The Spots Team</p>
        </div>
      </body>
    </html>
  `;
}

function inferNameFromEmail(email: string) {
  return email.split("@")[0] ?? "there";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

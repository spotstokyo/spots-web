// Deno Edge Function — minimal types to avoid TS errors in VS Code
// Works with the DB trigger workaround (custom header), and also accepts Svix if present.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "npm:resend";

const SECRET = Deno.env.get("AUTH_HOOK_SECRET")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

// Optional Svix verify (only if headers are present). We keep it try/catch & typed as any to avoid TS friction.
async function verifySvixIfPresent(req: Request, raw: string) {
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sig = req.headers.get("svix-signature");
  if (id && ts && sig) {
    try {
      // Dynamically import to avoid editor type issues if npm:svix types aren’t resolved.
      const { Webhook } = await import("npm:svix" as any);
      const wh: any = new (Webhook as any)(SECRET);
      wh.verify(raw, { "svix-id": id, "svix-timestamp": ts, "svix-signature": sig } as any);
      return true;
    } catch {
      return false;
    }
  }
  // No Svix headers present; caller might be our DB trigger.
  return null;
}

serve(async (req: Request) => {
  const raw = await req.text();

  // 1) Try Svix verification if headers exist
  const svixResult = await verifySvixIfPresent(req, raw);
  if (svixResult === false) {
    return new Response("invalid signature (svix)", { status: 401 });
  }

  // 2) If not Svix, require our custom header from DB trigger
  if (svixResult === null) {
    const headerSecret = req.headers.get("x-hook-secret");
    if (headerSecret !== SECRET) {
      return new Response("invalid signature (header)", { status: 401 });
    }
  }

  // Parse payload (support multiple shapes)
  let payload: any = {};
  try { payload = JSON.parse(raw || "{}"); } catch { /* ignore */ }

  const type = payload?.event ?? payload?.type;
  const user  = payload?.user ?? payload?.record ?? payload?.data?.user ?? {};
  const email = user?.email as string | undefined;

  // Try several provider locations
  const provider =
    user?.app_metadata?.provider ??
    user?.raw_app_meta_data?.provider ??
    user?.identities?.[0]?.provider ??
    user?.identities?.[0]?.identity_data?.provider;

  const isSignup =
    type === "user.created" || type === "user_signed_up" || type === "user_created";

  if (!isSignup || provider !== "google" || !email) {
    // Helpful debug line:
    console.log("ignored event", { type, provider, hasEmail: !!email });
    return new Response("ignored", { status: 200 });
  }

  // Send email
  try {
    await resend.emails.send({
      from: "Spots <hello@spots.tokyo>",
      to: email,
      subject: "Welcome to Spots 🎉",
      html: `
        <div style="font-family:system-ui,Segoe UI,Arial;padding:20px;">
          <h2 style="margin:0 0 12px">Welcome${user?.user_metadata?.full_name ? ", " + user.user_metadata.full_name : ""}!</h2>
          <p>You just signed up with Google — we’re excited to have you on Spots.</p>
          <p><a href="https://spots.tokyo" style="background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Open Spots</a></p>
        </div>`,
    });
    console.log("Email sent to", email);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("Resend error", e);
    return new Response("resend error", { status: 500 });
  }
});

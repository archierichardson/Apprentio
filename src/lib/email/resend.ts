// Direct Resend HTTP API call — no SDK dependency, this is the only
// app-level email send today (Resend otherwise only backs Supabase Auth's
// SMTP). Server-only: relies on RESEND_API_KEY, never import from client code.
export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const domain = process.env.RESEND_EMAIL_DOMAIN;
  if (!apiKey || !domain) {
    return { ok: false, error: "RESEND_API_KEY or RESEND_EMAIL_DOMAIN not set" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Apprentio <notifications@${domain}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${body}` };
  }

  return { ok: true };
}

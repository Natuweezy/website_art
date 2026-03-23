function firstDefined(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ");
}

function fromConfig() {
  const email = firstDefined(
    "EMAIL_FROM",
    "EMAIL_FROM_ADDRESS",
    "RESEND_FROM_EMAIL",
    "SENDGRID_FROM_EMAIL"
  ) || null;

  const name = firstDefined(
    "EMAIL_FROM_NAME",
    "RESEND_FROM_NAME",
    "SENDGRID_FROM_NAME"
  ) || null;

  return { email, name };
}

function replyToConfig() {
  return firstDefined(
    "EMAIL_REPLY_TO",
    "EMAIL_REPLY_TO_ADDRESS",
    "RESEND_REPLY_TO_EMAIL",
    "SENDGRID_REPLY_TO_EMAIL"
  ) || null;
}

async function sendViaResend(message) {
  const apiKey = process.env.RESEND_API_KEY;
  const { email } = fromConfig();
  if (!email) {
    throw new Error("Missing EMAIL_FROM env var.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: email,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      reply_to: message.replyTo || replyToConfig() || undefined
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend send failed: ${response.status} ${detail}`);
  }
}

async function sendViaSendgrid(message) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const { email, name } = fromConfig();
  if (!email) {
    throw new Error("Missing EMAIL_FROM env var.");
  }
  const fromEmail = email.includes("<")
    ? email.match(/<([^>]+)>/)?.[1] || email
    : email;
  const fromName = name || (email.includes("<") ? email.split("<")[0].trim() : undefined);
  const contents = [];
  if (message.text) contents.push({ type: "text/plain", value: message.text });
  if (message.html) contents.push({ type: "text/html", value: message.html });

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: (Array.isArray(message.to) ? message.to : [message.to]).map((item) => ({ email: item }))
        }
      ],
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: message.subject,
      content: contents,
      reply_to: (message.replyTo || replyToConfig()) ? { email: message.replyTo || replyToConfig() } : undefined
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`SendGrid send failed: ${response.status} ${detail}`);
  }
}

async function sendViaWebhook(message) {
  const endpoint = firstDefined("EMAIL_WEBHOOK_URL", "EMAIL_API_URL");
  const token = firstDefined("EMAIL_WEBHOOK_TOKEN", "EMAIL_API_KEY");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email webhook send failed: ${response.status} ${detail}`);
  }
}

export function getNotificationAddress() {
  return firstDefined(
    "APPLICATION_EMAIL_TO",
    "CONTACT_EMAIL",
    "NOTIFICATION_EMAIL",
    "EMAIL_TO"
  ) || "khayaartss@gmail.com";
}

export function getConfiguredProvider() {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (firstDefined("EMAIL_WEBHOOK_URL", "EMAIL_API_URL")) return "webhook";
  return null;
}

export function hasEmailProvider() {
  return !!getConfiguredProvider();
}

export async function sendEmail(message) {
  const normalized = {
    ...message,
    text: message.text || stripHtml(message.html || ""),
    html: message.html || `<pre>${escapeHtml(message.text || "")}</pre>`
  };

  const provider = getConfiguredProvider();
  if (provider === "resend") return sendViaResend(normalized);
  if (provider === "sendgrid") return sendViaSendgrid(normalized);
  if (provider === "webhook") return sendViaWebhook(normalized);
  throw new Error("No supported email provider configured. Set RESEND_API_KEY, SENDGRID_API_KEY, or EMAIL_WEBHOOK_URL.");
}

export { escapeHtml };

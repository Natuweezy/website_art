import { sendEmail, getNotificationAddress, escapeHtml, hasEmailProvider } from "./_lib/email.js";
import { jsonResponse } from "./_lib/response.js";

function clean(value) {
  return String(value || "").trim();
}

function firstNameFrom(name) {
  const first = clean(name).split(/\s+/)[0] || "";
  return first.replace(/[^\p{L}'-]/gu, "");
}

function artistSubmissionEmail(payload) {
  const fields = [
    ["Full name", payload.name],
    ["Email", payload.email],
    ["Location", payload.location],
    ["Instagram", payload.instagram],
    ["Website", payload.website],
    ["Portfolio link", payload.portfolio_link],
    ["Message", payload.message]
  ].filter(([, value]) => value);

  const lines = fields.map(([label, value]) => `${label}: ${value}`);
  return {
    subject: `New Khaya artist application: ${payload.name || payload.email}`,
    text: [
      "A new artist application was submitted through khayarts.com.",
      "",
      ...lines
    ].join("\n"),
    html: [
      "<p>A new artist application was submitted through khayarts.com.</p>",
      "<ul>",
      ...fields.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`),
      "</ul>"
    ].join("")
  };
}

function gallerySubmissionEmail(payload) {
  const fields = Object.entries(payload)
    .filter(([key, value]) => key !== "submission_type" && value)
    .map(([key, value]) => [key.replaceAll("_", " "), clean(value)]);

  return {
    subject: `New Khaya gallery registration request: ${payload.gallery_name || payload.email || "Unknown gallery"}`,
    text: [
      "A new gallery registration request was submitted through khayarts.com.",
      "",
      ...fields.map(([label, value]) => `${label}: ${value}`)
    ].join("\n"),
    html: [
      "<p>A new gallery registration request was submitted through khayarts.com.</p>",
      "<ul>",
      ...fields.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`),
      "</ul>"
    ].join("")
  };
}

function artistConfirmationEmail(firstName) {
  const greetingName = firstName ? `Hi ${firstName},` : "Hi,";
  const text = [
    greetingName,
    "",
    "Thank you for applying to Khaya. We've received your submission.",
    "Our team reviews every application manually and will respond within 5 business days.",
    "",
    "Khaya"
  ].join("\n");

  const html = [
    `<p>${escapeHtml(greetingName)}</p>`,
    "<p>Thank you for applying to Khaya. We've received your submission.</p>",
    "<p>Our team reviews every application manually and will respond within 5 business days.</p>",
    "<p>Khaya</p>"
  ].join("");

  return {
    subject: "We've received your Khaya application",
    text,
    html
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const submissionType = clean(payload.submission_type || "artist").toLowerCase();
  const email = clean(payload.email).toLowerCase();
  const name = clean(payload.name);

  if (!email) {
    return jsonResponse(400, { error: "Email is required" });
  }

  try {
    const notify = getNotificationAddress();
    const canSendEmail = hasEmailProvider();
    const normalizedPayload = {
      ...payload,
      submission_type: submissionType,
      email,
      name,
      location: clean(payload.location),
      instagram: clean(payload.instagram),
      website: clean(payload.website),
      portfolio_link: clean(payload.portfolio_link),
      message: clean(payload.message),
      gallery_name: clean(payload.gallery_name)
    };

    if (submissionType === "gallery") {
      const galleryEmail = gallerySubmissionEmail(normalizedPayload);
      if (canSendEmail) {
        await sendEmail({
          to: notify,
          subject: galleryEmail.subject,
          text: galleryEmail.text,
          html: galleryEmail.html,
          replyTo: email
        });
      }
      return jsonResponse(200, {
        ok: true,
        message: canSendEmail
          ? "Gallery request received."
          : "Gallery request received. Email delivery is not configured yet."
      });
    }

    if (!name || !normalizedPayload.location || !normalizedPayload.instagram || !normalizedPayload.portfolio_link) {
      return jsonResponse(400, {
        error: "Name, location, Instagram, and portfolio link are required for artist applications."
      });
    }

    const artistEmail = artistSubmissionEmail(normalizedPayload);
    if (canSendEmail) {
      await sendEmail({
        to: notify,
        subject: artistEmail.subject,
        text: artistEmail.text,
        html: artistEmail.html,
        replyTo: email
      });

      const firstName = clean(payload.first_name) || firstNameFrom(name);
      const confirmation = artistConfirmationEmail(firstName);
      await sendEmail({
        to: email,
        subject: confirmation.subject,
        text: confirmation.text,
        html: confirmation.html
      });
    }

    return jsonResponse(200, {
      ok: true,
      message: canSendEmail
        ? "Application received. We have emailed you a confirmation."
        : "Application received. Email delivery is not configured yet, so no confirmation email was sent."
    });
  } catch (err) {
    return jsonResponse(500, { error: err?.message || "Server error" });
  }
}

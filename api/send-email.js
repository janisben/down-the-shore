import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const {
      to,
      subject,
      html,
      text,
      replyTo,
    } = req.body || {};

    if (!to) {
      return res.status(400).json({
        ok: false,
        error: "Missing recipient email address",
      });
    }

    if (!subject) {
      return res.status(400).json({
        ok: false,
        error: "Missing email subject",
      });
    }

    if (!html && !text) {
      return res.status(400).json({
        ok: false,
        error: "Missing email content",
      });
    }

    const email = {
      from: "Down the Shore <reservations@mail.downtheshore.me>",
      to,
      subject,
    };

    if (html) {
      email.html = html;
    }

    if (text) {
      email.text = text;
    }

    if (replyTo) {
      email.replyTo = replyTo;
    }

    const { data, error } = await resend.emails.send(email);

    if (error) {
      console.error("Resend error:", error);

      return res.status(500).json({
        ok: false,
        error: error.message || "Unable to send email",
      });
    }

    return res.status(200).json({
      ok: true,
      id: data?.id,
    });
  } catch (error) {
    console.error("send-email error:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Unexpected server error",
    });
  }
}

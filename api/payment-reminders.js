export default async function handler(req, res) {
  // Optional protection for automated cron calls
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({
      error: "Missing required environment variables",
    });
  }

  const supabaseHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    // Get payment settings
    const settingsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/payment_settings?select=*&limit=1`,
      {
        headers: supabaseHeaders,
      }
    );

    if (!settingsResponse.ok) {
      throw new Error(
        `Could not load payment settings: ${await settingsResponse.text()}`
      );
    }

    const settingsRows = await settingsResponse.json();
    const settings = settingsRows[0] || {};

    const zelleRecipient =
      settings.zelle_recipient || "janisbenstock@gmail.com";

    const venmoUrl =
      settings.venmo_url || "https://venmo.com/u/janisben";

    const defaultReminderDays =
      Number(settings.reminder_days_before) || 3;

    // Get payment installments that have not already received a reminder
    const scheduleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/payment_schedule?select=id,reservation_id,label,amount_due,due_date,reminder_days_before,reminder_sent_at&reminder_sent_at=is.null`,
      {
        headers: supabaseHeaders,
      }
    );

    if (!scheduleResponse.ok) {
      throw new Error(
        `Could not load payment schedule: ${await scheduleResponse.text()}`
      );
    }

    const installments = await scheduleResponse.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = [];

    for (const installment of installments) {
      if (!installment.due_date) continue;

      const dueDate = new Date(`${installment.due_date}T00:00:00`);
      const reminderDays =
        Number(installment.reminder_days_before) || defaultReminderDays;

      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);
      reminderDate.setHours(0, 0, 0, 0);

      // Not time to remind them yet
      if (today < reminderDate) continue;

      // Don't send reminders for dates already past
      if (today > dueDate) continue;

      // Get reservation/guest
      const reservationResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(
          installment.reservation_id
        )}&select=id,guest_name,guest_email`,
        {
          headers: supabaseHeaders,
        }
      );

      if (!reservationResponse.ok) {
        results.push({
          installment: installment.id,
          status: "reservation lookup failed",
        });
        continue;
      }

      const reservationRows = await reservationResponse.json();
      const reservation = reservationRows[0];

      if (!reservation?.guest_email) {
        results.push({
          installment: installment.id,
          status: "no guest email",
        });
        continue;
      }

      const guestName = reservation.guest_name || "there";
      const label = installment.label || "payment";
      const amount = Number(installment.amount_due || 0);

      const formattedAmount = amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });

      const formattedDueDate = dueDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Down the Shore <onboarding@resend.dev>",
          to: [reservation.guest_email],
          subject: `Payment reminder — ${formattedAmount} due ${formattedDueDate}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #142f50; line-height: 1.6;">
              <h1 style="font-family: Georgia, serif; font-weight: normal;">
                Down the Shore
              </h1>

              <p>Hi ${guestName},</p>

              <p>
                Just a friendly reminder that your
                <strong>${label}</strong> payment of
                <strong>${formattedAmount}</strong>
                is due on <strong>${formattedDueDate}</strong>.
              </p>

              <p>You can make your payment using either option below:</p>

              <div style="background:#f6f2e9; padding:18px; margin:20px 0;">
                <p style="margin-top:0;">
                  <strong>Zelle</strong><br>
                  Send to: ${zelleRecipient}
                </p>

                <p style="margin-bottom:0;">
                  <strong>Venmo</strong><br>
                  <a href="${venmoUrl}">Pay with Venmo</a>
                </p>
              </div>

              <p>
                Thank you! We look forward to having you Down the Shore.
              </p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        results.push({
          installment: installment.id,
          status: "email failed",
          error: await emailResponse.text(),
        });
        continue;
      }

      // Mark reminder as sent so it cannot send twice
      const markSentResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/payment_schedule?id=eq.${encodeURIComponent(
          installment.id
        )}`,
        {
          method: "PATCH",
          headers: {
            ...supabaseHeaders,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            reminder_sent_at: new Date().toISOString(),
          }),
        }
      );

      if (!markSentResponse.ok) {
        results.push({
          installment: installment.id,
          status: "email sent but could not mark reminder sent",
        });
        continue;
      }

      results.push({
        installment: installment.id,
        guest: reservation.guest_email,
        status: "reminder sent",
      });
    }

    return res.status(200).json({
      success: true,
      checked: installments.length,
      results,
    });
  } catch (error) {
    console.error("Payment reminder error:", error);

    return res.status(500).json({
      error: error.message || "Payment reminder failed",
    });
  }
}

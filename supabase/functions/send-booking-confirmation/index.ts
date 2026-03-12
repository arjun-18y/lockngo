import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BookingEmailPayload = {
  to: string;
  bookingId: string;
  stationName: string;
  stationCity: string;
  lockerNumber: string;
  lockerSize: string;
  startTime: string;
  endTime: string;
  durationType: "hourly" | "daily";
  durationValue: string;
  amount: number;
  pinCode: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("BOOKING_EMAIL_FROM");

    if (!resendApiKey || !fromEmail) {
      console.error("Missing required secrets", {
        hasResendApiKey: Boolean(resendApiKey),
        hasFromEmail: Boolean(fromEmail),
      });
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Set RESEND_API_KEY and BOOKING_EMAIL_FROM.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const payload: BookingEmailPayload = await req.json();
    console.log("send-booking-confirmation invoked", {
      bookingId: payload?.bookingId,
      to: payload?.to,
    });

    if (!payload?.to || !payload?.bookingId) {
      console.warn("Invalid payload received", payload);
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, bookingId." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const start = new Date(payload.startTime);
    const end = new Date(payload.endTime);

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2 style="margin-bottom:8px">Your Locker Booking Is Confirmed</h2>
        <p>Thank you for booking with LockNGo.</p>
        <p><strong>Booking ID:</strong> ${payload.bookingId}</p>
        <p><strong>Station:</strong> ${payload.stationName}${payload.stationCity ? `, ${payload.stationCity}` : ""}</p>
        <p><strong>Locker:</strong> #${payload.lockerNumber} (${payload.lockerSize})</p>
        <p><strong>Duration:</strong> ${payload.durationValue} ${payload.durationType === "hourly" ? "hour(s)" : "day(s)"}</p>
        <p><strong>Start:</strong> ${start.toLocaleString("en-IN")}</p>
        <p><strong>End:</strong> ${end.toLocaleString("en-IN")}</p>
        <p><strong>Amount Paid:</strong> INR ${payload.amount}</p>
        <p><strong>Locker PIN:</strong> <span style="font-size:18px;letter-spacing:1px">${payload.pinCode}</span></p>
        <hr style="margin:16px 0;border:none;border-top:1px solid #ddd" />
        <p style="font-size:12px;color:#555">If you did not make this booking, contact support immediately.</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject: `LockNGo Booking Confirmed (${payload.bookingId})`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      let detailMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (typeof parsed?.message === "string") {
          detailMessage = parsed.message;
        } else if (typeof parsed?.error?.message === "string") {
          detailMessage = parsed.error.message;
        }
      } catch {
        // Keep raw response text when JSON parsing fails.
      }

      console.error("Resend API request failed", {
        status: resendResponse.status,
        details: detailMessage,
      });
      return new Response(
        JSON.stringify({
          error: `Failed to send email: ${detailMessage}`,
          details: detailMessage,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result = await resendResponse.json();
    console.log("Booking confirmation email sent", {
      bookingId: payload.bookingId,
      to: payload.to,
      resendId: result?.id,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("Unhandled function error", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

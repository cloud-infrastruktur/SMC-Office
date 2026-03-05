import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST - Webhook für n8n Events
export async function POST(request: NextRequest) {
  try {
    // API-Key prüfen
    const apiKey = request.headers.get("X-N8N-API-KEY") || request.headers.get("x-api-key");
    const expectedKey = process.env.N8N_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      console.warn("SOC Ingest: Invalid or missing API key");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, serviceSlug, source, metadata } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "type, title und message sind erforderlich" },
        { status: 400 }
      );
    }

    // Service finden (optional)
    let serviceId = null;
    if (serviceSlug) {
      const service = await prisma.socService.findUnique({
        where: { slug: serviceSlug },
      });
      if (service) {
        serviceId = service.id;

        // Service-Status aktualisieren bei Fehlern
        if (type === "error") {
          await prisma.socService.update({
            where: { id: service.id },
            data: { status: "error", statusText: title },
          });
        } else if (type === "heartbeat" || type === "success") {
          await prisma.socService.update({
            where: { id: service.id },
            data: { status: "active", statusText: "Online" },
          });
        }
      }
    }

    // Event erstellen
    const event = await prisma.socEvent.create({
      data: {
        type,
        title,
        message,
        serviceId,
        source: source || "n8n",
        metadata: metadata || {},
        isRead: false,
      },
    });

    // Bei kritischen Fehlern: SMS senden (wenn konfiguriert)
    if (type === "error") {
      await sendSmsAlert(title, message);
    }

    return NextResponse.json({ success: true, eventId: event.id }, { status: 201 });
  } catch (error) {
    console.error("Error in SOC ingest:", error);
    return NextResponse.json(
      { error: "Fehler beim Verarbeiten des Events" },
      { status: 500 }
    );
  }
}

// Hilfsfunktion für SMS-Alarm
async function sendSmsAlert(title: string, message: string) {
  try {
    const config = await prisma.smsAlertConfig.findFirst({
      where: { isActive: true },
    });

    if (!config || config.alertRecipients.length === 0) {
      console.log("SMS Alert: No active configuration found");
      return;
    }

    const smsText = `SMC-SOC ALARM: ${title}\n${message.substring(0, 100)}`;

    if (config.provider === "sms77") {
      // SMS77 API
      for (const recipient of config.alertRecipients) {
        await fetch("https://gateway.sms77.io/api/sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": config.apiKey || "",
          },
          body: JSON.stringify({
            to: recipient,
            text: smsText,
            from: config.fromNumber || "SMC-SOC",
          }),
        });
      }
    } else if (config.provider === "twilio") {
      // Twilio API
      const twilioAuth = Buffer.from(
        `${config.accountSid}:${config.authToken}`
      ).toString("base64");

      for (const recipient of config.alertRecipients) {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${twilioAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: recipient,
              From: config.fromNumber || "",
              Body: smsText,
            }),
          }
        );
      }
    }

    console.log("SMS Alert sent successfully");
  } catch (error) {
    console.error("Error sending SMS alert:", error);
  }
}

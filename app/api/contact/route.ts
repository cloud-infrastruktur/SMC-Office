import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendContactEmail, getSmtpConfig } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message, website } = body;

    // Honeypot-Prüfung: Wenn das versteckte Feld ausgefüllt ist, ist es ein Bot
    if (website) {
      console.log("Honeypot aktiviert - Bot-Anfrage abgelehnt");
      // Simuliere Erfolg für den Bot, lehne aber stillschweigend ab
      return NextResponse.json(
        { message: "Nachricht erfolgreich gesendet" },
        { status: 201 }
      );
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, E-Mail und Nachricht sind erforderlich" },
        { status: 400 }
      );
    }

    // Save to database first
    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
      },
    });

    // Check if SMTP is configured
    const smtpConfig = await getSmtpConfig();
    
    if (smtpConfig) {
      // Send email via SMTP
      const emailSent = await sendContactEmail({
        name,
        email,
        phone: phone || undefined,
        subject: subject || undefined,
        message,
      });

      if (emailSent) {
        return NextResponse.json(
          { message: "Nachricht erfolgreich gesendet", id: submission.id },
          { status: 201 }
        );
      } else {
        // Email failed but submission saved
        console.error("E-Mail-Versand fehlgeschlagen, aber Nachricht gespeichert");
        return NextResponse.json(
          { message: "Nachricht gespeichert, aber E-Mail-Versand fehlgeschlagen", id: submission.id },
          { status: 201 }
        );
      }
    } else {
      // No SMTP configured - just save to database
      console.warn("Keine SMTP-Konfiguration - Nachricht nur in DB gespeichert");
      return NextResponse.json(
        { message: "Nachricht erfolgreich gespeichert", id: submission.id },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Beim Senden der Nachricht ist ein Fehler aufgetreten" },
      { status: 500 }
    );
  }
}

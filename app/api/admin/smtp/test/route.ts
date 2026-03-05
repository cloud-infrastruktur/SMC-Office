import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendEmail, getSmtpConfig } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST - Test E-Mail senden
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as { role?: string }).role?.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getSmtpConfig();
    
    if (!config) {
      return NextResponse.json(
        { error: "Keine SMTP-Konfiguration gefunden. Bitte zuerst speichern." },
        { status: 400 }
      );
    }

    await sendEmail({
      to: config.contactEmail,
      subject: 'SMTP Test - SMC Office',
      text: 'Dies ist eine Test-E-Mail von Ihrer SMC Office Website.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">SMTP Test erfolgreich!</h2>
          <p>Diese Test-E-Mail wurde erfolgreich über Ihre SMTP-Konfiguration gesendet.</p>
          <p style="color: #666; margin-top: 20px;">Schwarz Management Consulting GmbH</p>
        </div>
      `,
    });

    return NextResponse.json({ 
      message: "Test-E-Mail erfolgreich gesendet!",
      details: `E-Mail wurde an ${config.contactEmail} gesendet.`
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    
    // Detaillierte Fehlermeldung zurückgeben
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    return NextResponse.json(
      { 
        error: "SMTP-Test fehlgeschlagen",
        details: errorMessage,
        help: "Bitte überprüfen Sie die SMTP-Einstellungen (Host, Port, Benutzername, Passwort)."
      },
      { status: 500 }
    );
  }
}

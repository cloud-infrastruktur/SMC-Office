import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - SMTP Konfiguration abrufen
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as { role?: string }).role?.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.smtpConfig.findFirst({
      where: { isActive: true },
    });

    // Passwort nicht zurückgeben, nur maskiert
    if (config) {
      return NextResponse.json({
        ...config,
        password: config.password ? '********' : '',
      });
    }

    return NextResponse.json(null);
  } catch (error) {
    console.error("Error fetching SMTP config:", error);
    return NextResponse.json({ error: "Fehler beim Laden der SMTP-Konfiguration" }, { status: 500 });
  }
}

// POST - SMTP Konfiguration erstellen/aktualisieren
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as { role?: string }).role?.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { host, port, secure, username, password, fromEmail, fromName, contactEmail } = body;

    if (!host || !port || !username || !fromEmail || !fromName || !contactEmail) {
      return NextResponse.json(
        { error: "Alle Pflichtfelder müssen ausgefüllt sein" },
        { status: 400 }
      );
    }

    // Bestehende Konfiguration deaktivieren
    await prisma.smtpConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Neue Konfiguration erstellen
    const existingConfig = await prisma.smtpConfig.findFirst();
    
    let config;
    if (existingConfig) {
      // Update existing
      config = await prisma.smtpConfig.update({
        where: { id: existingConfig.id },
        data: {
          host,
          port: parseInt(port),
          secure: secure === true || secure === 'true',
          username,
          password: password && password !== '********' ? password : existingConfig.password,
          fromEmail,
          fromName,
          contactEmail,
          isActive: true,
        },
      });
    } else {
      // Create new
      if (!password || password === '********') {
        return NextResponse.json(
          { error: "Passwort ist erforderlich" },
          { status: 400 }
        );
      }
      config = await prisma.smtpConfig.create({
        data: {
          host,
          port: parseInt(port),
          secure: secure === true || secure === 'true',
          username,
          password,
          fromEmail,
          fromName,
          contactEmail,
          isActive: true,
        },
      });
    }

    return NextResponse.json(
      { message: "SMTP-Konfiguration gespeichert", config: { ...config, password: '********' } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving SMTP config:", error);
    return NextResponse.json({ error: "Fehler beim Speichern der SMTP-Konfiguration" }, { status: 500 });
  }
}

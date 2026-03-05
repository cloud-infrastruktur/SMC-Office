import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Standard-Keywords für Initialisierung
const DEFAULT_KEYWORDS = [
  "Prozessmanagement",
  "Providermanagement",
  "IT-Service-Management",
  "ITSM",
  "ITSCM",
  "CMDB",
  "Change Management",
  "Release Management",
  "Testmanagement",
  "Training",
  "Qualitätssicherung",
  "SB-Banking",
  "ITIL",
  "Projektmanagement",
  "Interim Manager",
  "Projektanfrage",
  "IT-Consultant",
  "Service Manager",
];

// GET - Keyword-Konfiguration abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    let config = await prisma.crmKeywordConfig.findFirst({
      where: { isActive: true },
    });

    // Wenn keine Konfiguration existiert, Standardkonfiguration erstellen
    if (!config) {
      config = await prisma.crmKeywordConfig.create({
        data: {
          name: "Standard",
          keywords: DEFAULT_KEYWORDS,
          blacklistEmails: [],
          blacklistDomains: ["newsletter@", "noreply@", "no-reply@", "mailer-daemon@"],
          checkSubject: true,
          checkBody: true,
          caseSensitive: false,
          isActive: true,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching keyword config:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Keyword-Konfiguration" },
      { status: 500 }
    );
  }
}

// POST - Neue Konfiguration erstellen oder aktualisieren
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      name,
      keywords,
      blacklistEmails,
      blacklistDomains,
      autoAssignRules,
      checkSubject,
      checkBody,
      caseSensitive,
      isActive,
    } = body;

    // Update oder Create
    if (id) {
      const config = await prisma.crmKeywordConfig.update({
        where: { id },
        data: {
          name,
          keywords: keywords || [],
          blacklistEmails: blacklistEmails || [],
          blacklistDomains: blacklistDomains || [],
          autoAssignRules,
          checkSubject: checkSubject ?? true,
          checkBody: checkBody ?? true,
          caseSensitive: caseSensitive ?? false,
          isActive: isActive ?? true,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(config);
    } else {
      // Neue Konfiguration
      const config = await prisma.crmKeywordConfig.create({
        data: {
          name: name || "Neue Konfiguration",
          keywords: keywords || DEFAULT_KEYWORDS,
          blacklistEmails: blacklistEmails || [],
          blacklistDomains: blacklistDomains || ["newsletter@", "noreply@"],
          autoAssignRules,
          checkSubject: checkSubject ?? true,
          checkBody: checkBody ?? true,
          caseSensitive: caseSensitive ?? false,
          isActive: isActive ?? true,
        },
      });
      return NextResponse.json(config, { status: 201 });
    }
  } catch (error) {
    console.error("Error saving keyword config:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Keyword-Konfiguration" },
      { status: 500 }
    );
  }
}

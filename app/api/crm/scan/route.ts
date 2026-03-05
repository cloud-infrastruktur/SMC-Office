import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST - Manueller E-Mail-Scan oder n8n Webhook
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let scanType = "manual";
  let triggeredBy = null;

  try {
    // Auth prüfen - entweder Session oder n8n API-Key
    const apiKey = request.headers.get("X-N8N-API-KEY") || request.headers.get("x-api-key");
    const expectedKey = process.env.N8N_API_KEY;

    let isAuthorized = false;
    let userId: string | null = null;

    if (apiKey && expectedKey && apiKey === expectedKey) {
      isAuthorized = true;
      scanType = "n8n";
      triggeredBy = "n8n";
    } else {
      const session = await getServerSession(authOptions);
      if (session && isAdminOrManager((session.user as { role?: string })?.role)) {
        isAuthorized = true;
        userId = (session.user as { id?: string })?.id || null;
        triggeredBy = session.user?.email || "manual";
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    // Body lesen (optional für n8n mit spezifischen E-Mails)
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Kein Body ist OK für manuellen Scan
    }

    // Keyword-Konfiguration laden
    const keywordConfig = await prisma.crmKeywordConfig.findFirst({
      where: { isActive: true },
    });

    if (!keywordConfig || keywordConfig.keywords.length === 0) {
      return NextResponse.json(
        { error: "Keine Keyword-Konfiguration gefunden" },
        { status: 400 }
      );
    }

    // E-Mails zum Scannen holen
    // Entweder spezifische E-Mails aus dem Body oder die letzten ungelesenen
    let emails;
    if (body.emails && Array.isArray(body.emails)) {
      // Von n8n übergebene E-Mails
      emails = body.emails;
    } else {
      // Letzte ungelesene E-Mails aus der Datenbank
      const daysBack = body.daysBack || 7;
      const sinceDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      emails = await prisma.emailMessage.findMany({
        where: {
          receivedAt: { gte: sinceDate },
          // Nur E-Mails die noch nicht zu einem Deal geführt haben
          crmDeals: { none: {} },
        },
        select: {
          id: true,
          subject: true,
          fromAddress: true,
          fromName: true,
          textBody: true,
          receivedAt: true,
        },
        orderBy: { receivedAt: "desc" },
        take: body.limit || 100,
      });
    }

    const results = {
      scanned: 0,
      matched: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
      deals: [] as any[],
    };

    // Keywords für Matching vorbereiten
    const keywords = keywordConfig.caseSensitive
      ? keywordConfig.keywords
      : keywordConfig.keywords.map((k) => k.toLowerCase());

    const blacklistEmails = keywordConfig.blacklistEmails.map((e) => e.toLowerCase());
    const blacklistDomains = keywordConfig.blacklistDomains.map((d) => d.toLowerCase());

    // E-Mails durchgehen
    for (const email of emails) {
      results.scanned++;

      // Blacklist prüfen
      const fromLower = (email.fromAddress || "").toLowerCase();
      if (blacklistEmails.includes(fromLower)) {
        results.skipped++;
        continue;
      }

      const isBlacklistedDomain = blacklistDomains.some((d) => fromLower.includes(d));
      if (isBlacklistedDomain) {
        results.skipped++;
        continue;
      }

      // Keyword-Matching
      let textToSearch = "";
      if (keywordConfig.checkSubject && email.subject) {
        textToSearch += " " + email.subject;
      }
      if (keywordConfig.checkBody && email.textBody) {
        textToSearch += " " + email.textBody;
      }

      if (!keywordConfig.caseSensitive) {
        textToSearch = textToSearch.toLowerCase();
      }

      const matchedKeywords = keywords.filter((keyword) =>
        textToSearch.includes(keywordConfig.caseSensitive ? keyword : keyword.toLowerCase())
      );

      if (matchedKeywords.length === 0) {
        continue;
      }

      results.matched++;

      // Kontakt finden oder erstellen
      let contact = await prisma.crmContact.findUnique({
        where: { email: fromLower },
      });

      if (!contact) {
        // Kontakt aus E-Mail-Daten erstellen
        const nameParts = (email.fromName || "").split(" ");
        const firstName = nameParts[0] || "Unbekannt";
        const lastName = nameParts.slice(1).join(" ") || "";

        try {
          contact = await prisma.crmContact.create({
            data: {
              firstName,
              lastName: lastName || firstName,
              email: fromLower,
              source: "email",
              tags: ["Auto-Import"],
            },
          });
        } catch (err) {
          // Kontakt existiert vielleicht schon (Race Condition)
          contact = await prisma.crmContact.findUnique({
            where: { email: fromLower },
          });
        }
      }

      // Deal erstellen
      try {
        const deal = await prisma.crmDeal.create({
          data: {
            title: `Anfrage: ${email.subject || "Ohne Betreff"}`.substring(0, 200),
            description: `Automatisch erstellt aus E-Mail von ${email.fromName || email.fromAddress}\n\nBetreff: ${email.subject}`,
            phase: "PHASE_1_ANFRAGE",
            sourceType: scanType === "n8n" ? "n8n" : "email",
            sourceEmailId: email.id,
            contactId: contact?.id,
            matchedKeywords,
            tags: ["Auto-Import"],
            priority: "normal",
          },
        });

        // Aktivität erstellen
        await prisma.crmActivity.create({
          data: {
            type: "DEAL_CREATED",
            title: "Deal automatisch erstellt",
            description: `Deal wurde durch ${scanType === "n8n" ? "n8n Automation" : "manuellen Scan"} erstellt. Keywords: ${matchedKeywords.join(", ")}`,
            dealId: deal.id,
            contactId: contact?.id,
            createdById: userId,
            metadata: {
              scanType,
              matchedKeywords,
              emailId: email.id,
            },
          },
        });

        results.created++;
        results.deals.push({
          id: deal.id,
          title: deal.title,
          matchedKeywords,
        });
      } catch (err: any) {
        results.errors.push(`Fehler bei E-Mail ${email.id}: ${err.message}`);
      }
    }

    // Scan-Log erstellen
    const duration = Date.now() - startTime;
    await prisma.crmScanLog.create({
      data: {
        scanType,
        emailsScanned: results.scanned,
        dealsCreated: results.created,
        matchedKeywords: results.deals.flatMap((d) => d.matchedKeywords),
        errors: results.errors.length > 0 ? results.errors.join("\n") : null,
        duration,
        triggeredBy,
      },
    });

    // Statistiken aktualisieren
    await prisma.crmKeywordConfig.update({
      where: { id: keywordConfig.id },
      data: {
        totalScans: { increment: 1 },
        totalMatches: { increment: results.matched },
        lastScanAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      ...results,
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    console.error("Error in CRM scan:", error);

    // Fehler-Log erstellen
    await prisma.crmScanLog.create({
      data: {
        scanType,
        emailsScanned: 0,
        dealsCreated: 0,
        matchedKeywords: [],
        errors: error.message,
        duration: Date.now() - startTime,
        triggeredBy,
      },
    });

    return NextResponse.json(
      { error: "Fehler beim Scannen", details: error.message },
      { status: 500 }
    );
  }
}

// GET - Scan-Logs abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const logs = await prisma.crmScanLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching scan logs:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Scan-Logs" },
      { status: 500 }
    );
  }
}

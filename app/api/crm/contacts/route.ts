import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Alle Kontakte abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const company = searchParams.get("company") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = { isActive: true };
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (company) {
      where.company = { contains: company, mode: "insensitive" };
    }

    const contacts = await prisma.crmContact.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
      include: {
        client: true,
        _count: { select: { deals: true } },
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Kontakte" },
      { status: 500 }
    );
  }
}

// POST - Neuen Kontakt erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      mobile,
      company,
      position,
      linkedInUrl,
      xingUrl,
      website,
      address,
      city,
      postalCode,
      country,
      notes,
      tags,
      source,
      clientId,
    } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Vorname, Nachname und E-Mail sind erforderlich" },
        { status: 400 }
      );
    }

    // Prüfen ob E-Mail bereits existiert
    const existing = await prisma.crmContact.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ein Kontakt mit dieser E-Mail existiert bereits" },
        { status: 409 }
      );
    }

    const contact = await prisma.crmContact.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        mobile,
        company,
        position,
        linkedInUrl,
        xingUrl,
        website,
        address,
        city,
        postalCode,
        country: country || "Deutschland",
        notes,
        tags: tags || [],
        source: source || "manual",
        clientId,
      },
      include: { client: true },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Kontakts" },
      { status: 500 }
    );
  }
}

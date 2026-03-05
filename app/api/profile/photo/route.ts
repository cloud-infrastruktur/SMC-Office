import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { uploadFile, getFileUrl } from "@/lib/storage";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (!userRole || !["admin", "ADMIN"].includes(userRole.toLowerCase())) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const key = formData.get("key") as string;

    if (!file || !key) {
      return NextResponse.json({ error: "Datei und Schlüssel erforderlich" }, { status: 400 });
    }

    // Validierung
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Nur Bilddateien erlaubt" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Dateigröße max. 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dateiname generieren
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `profile-photo-${Date.now()}${ext}`;
    
    // S3 Upload - isPublic=true für öffentliches Profilbild
    const cloudStoragePath = await uploadFile(buffer, fileName, file.type, true);
    
    // Öffentliche URL abrufen
    const fileUrl = await getFileUrl(cloudStoragePath, true);

    // In ProfileData speichern (Cloud Storage Path für spätere Verwendung)
    await prisma.profileData.upsert({
      where: { key },
      update: { value: cloudStoragePath },
      create: {
        key,
        value: cloudStoragePath,
        category: "personal",
        sortOrder: 0,
      },
    });

    return NextResponse.json({ url: fileUrl, cloudStoragePath, message: "Foto hochgeladen" });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: "Fehler beim Hochladen" },
      { status: 500 }
    );
  }
}

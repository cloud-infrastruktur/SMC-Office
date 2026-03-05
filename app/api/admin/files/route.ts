import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as { role?: string }).role?.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await prisma.downloadFile.findMany({
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json({ error: "Error fetching files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as { role?: string }).role?.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as "PROFILE" | "REFERENCES" | "TRAININGS" | "CERTIFICATES";

    console.log(`[Upload API] Request: ${title}, Category: ${category}, File: ${file?.name}`);

    if (!file || !title || !category) {
      return NextResponse.json(
        { error: "File, title and category are required" },
        { status: 400 }
      );
    }

    // Größenprüfung
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Upload zu S3/MinIO
    console.log(`[Upload API] Uploading to S3/MinIO (${file.size} bytes)`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const cloudStoragePath = await uploadFile(buffer, file.name, file.type, false);
    console.log(`[Upload API] Uploaded: ${cloudStoragePath}`);

    // In Datenbank speichern
    const downloadFile = await prisma.downloadFile.create({
      data: {
        title,
        description: description || null,
        category,
        fileName: file.name,
        fileSize: file.size,
        cloudStoragePath,
        isPublic: false,
        uploadedBy: (session.user as { id?: string }).id,
      },
    });

    console.log(`[Upload API] Success: ${downloadFile.id}`);
    return NextResponse.json({ message: "File uploaded successfully", file: downloadFile }, { status: 201 });
  } catch (error) {
    console.error("[Upload API] Error:", error);
    return NextResponse.json({ 
      error: "Upload failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isAdminOrManager, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Alle Workflows abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const workflows = await prisma.n8nWorkflow.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Workflows" },
      { status: 500 }
    );
  }
}

// POST - Workflow erstellen oder triggern
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOrManager((session.user as { role?: string })?.role)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { action, workflowId, name, description, webhookUrl, icon, color, serviceId } = body;

    // Workflow triggern
    if (action === "trigger" && workflowId) {
      const workflow = await prisma.n8nWorkflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow || !workflow.webhookUrl) {
        return NextResponse.json(
          { error: "Workflow nicht gefunden oder keine Webhook-URL" },
          { status: 404 }
        );
      }

      // n8n Workflow triggern
      const n8nResponse = await fetch(workflow.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": process.env.N8N_API_KEY || "",
        },
        body: JSON.stringify({
          triggeredBy: session.user?.email,
          timestamp: new Date().toISOString(),
        }),
      });

      // Event erstellen
      await prisma.socEvent.create({
        data: {
          type: "info",
          title: `Workflow gestartet: ${workflow.name}`,
          message: `Workflow wurde von ${session.user?.email} manuell gestartet`,
          source: "manual",
          serviceId: workflow.serviceId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Workflow gestartet",
        n8nStatus: n8nResponse.status,
      });
    }

    // Neuen Workflow erstellen (nur Admin)
    if (action === "create" && isAdmin((session.user as { role?: string })?.role)) {
      if (!name || !webhookUrl) {
        return NextResponse.json(
          { error: "Name und Webhook-URL sind erforderlich" },
          { status: 400 }
        );
      }

      const maxSort = await prisma.n8nWorkflow.aggregate({
        _max: { sortOrder: true },
      });

      const workflow = await prisma.n8nWorkflow.create({
        data: {
          name,
          description,
          workflowId: `wf-${Date.now()}`,
          webhookUrl,
          icon: icon || "Play",
          color: color || "blue",
          serviceId,
          sortOrder: (maxSort._max.sortOrder || 0) + 1,
        },
      });

      return NextResponse.json(workflow, { status: 201 });
    }

    return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  } catch (error) {
    console.error("Error in workflow operation:", error);
    return NextResponse.json(
      { error: "Fehler bei der Workflow-Operation" },
      { status: 500 }
    );
  }
}

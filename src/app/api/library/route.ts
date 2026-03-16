import { NextRequest, NextResponse } from "next/server";

import {
  createChapter,
  createNotebook,
  createSubject,
  deleteLibraryItem,
  readStore,
  renameLibraryItem,
} from "@/lib/store";

export async function GET() {
  const data = await readStore();
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      kind?: "subject" | "notebook" | "chapter";
      name?: string;
      description?: string;
      subjectId?: string;
      notebookId?: string;
      title?: string;
      unit?: string;
    };

    if (body.kind === "subject") {
      const result = await createSubject({
        name: body.name || "",
        description: body.description,
      });
      return NextResponse.json({
        data: result.data,
        subject: result.subject,
      });
    }

    if (body.kind === "notebook") {
      const result = await createNotebook({
        subjectId: body.subjectId || "",
        name: body.name || "",
      });
      return NextResponse.json({
        data: result.data,
        subject: result.subject,
        notebook: result.notebook,
      });
    }

    if (body.kind === "chapter") {
      const result = await createChapter({
        subjectId: body.subjectId || "",
        notebookId: body.notebookId || "",
        title: body.title || "",
        unit: body.unit || "未分单元",
      });
      return NextResponse.json({
        data: result.data,
        subject: result.subject,
        notebook: result.notebook,
        chapter: result.chapter,
      });
    }

    return NextResponse.json({ error: "Invalid library creation kind." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      kind?: "subject" | "notebook" | "chapter";
      id?: string;
      name?: string;
      unit?: string;
    };

    if (!body.kind || !body.id || !body.name) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const result = await renameLibraryItem({
      kind: body.kind,
      id: body.id,
      name: body.name,
      unit: body.unit,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      kind?: "subject" | "notebook" | "chapter";
      id?: string;
    };

    if (!body.kind || !body.id) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const result = await deleteLibraryItem({
      kind: body.kind,
      id: body.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { runDeepSeekOcr, transformOcrToStudyNote } from "@/lib/siliconflow";
import { findStructureByIds, updateChapterNote } from "@/lib/store";
import type { OutputFormat, TemplatePresetId } from "@/lib/types";

type ProcessBody = {
  subjectId: string;
  notebookId: string;
  chapterId: string;
  unit: string;
  fileDataUrl: string;
  sourceName: string;
  outputFormat: OutputFormat;
  templatePreset: TemplatePresetId;
  templateInstruction: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProcessBody;

    console.info("[api/process] request received", {
      subjectId: body.subjectId,
      notebookId: body.notebookId,
      chapterId: body.chapterId,
      sourceName: body.sourceName,
      outputFormat: body.outputFormat,
      templatePreset: body.templatePreset,
      hasFileDataUrl: Boolean(body.fileDataUrl),
    });

    if (
      !body.subjectId ||
      !body.notebookId ||
      !body.chapterId ||
      !body.fileDataUrl ||
      !body.sourceName
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const structure = await findStructureByIds({
      subjectId: body.subjectId,
      notebookId: body.notebookId,
      chapterId: body.chapterId,
    });

    console.info("[api/process] structure resolved", {
      subjectName: structure.subject.name,
      notebookName: structure.notebook.name,
      chapterTitle: structure.chapter.title,
      currentUnit: structure.chapter.unit,
    });

    const rawOcrMarkdown = await runDeepSeekOcr({ fileDataUrl: body.fileDataUrl });
    console.info("[api/process] OCR completed", {
      rawOcrLength: rawOcrMarkdown.length,
      rawOcrPreview: rawOcrMarkdown.slice(0, 120),
    });

    const transformed = await transformOcrToStudyNote({
      rawOcrMarkdown,
      subjectName: structure.subject.name,
      notebookName: structure.notebook.name,
      chapterTitle: structure.chapter.title,
      outputFormat: body.outputFormat,
      templatePreset: body.templatePreset || "general",
      templateInstruction: body.templateInstruction || "整理为通用课堂笔记。",
    });

    console.info("[api/process] transform completed", {
      transformedTitle: transformed.title,
      markdownLength: transformed.markdown.length,
      mindmapLength: transformed.mindmapMermaid.length,
    });

    const updated = await updateChapterNote({
      chapterId: structure.chapter.id,
      updater: (chapter) => {
        chapter.title = transformed.title || structure.chapter.title;
        chapter.unit = body.unit || chapter.unit;
        chapter.note = {
          rawOcrMarkdown,
          markdown: transformed.markdown,
          mindmapTree: transformed.mindmapTree,
          mindmapMermaid: transformed.mindmapMermaid,
          sourceName: body.sourceName,
          sourceDataUrl: body.fileDataUrl,
          updatedAt: new Date().toISOString(),
        };
      },
    });

    console.info("[api/process] chapter updated", {
      chapterId: updated.chapter.id,
      chapterTitle: updated.chapter.title,
      unit: updated.chapter.unit,
    });

    return NextResponse.json({
      subject: updated.subject,
      notebook: updated.notebook,
      chapter: updated.chapter,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/process] failed", {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

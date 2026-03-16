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

    const rawOcrMarkdown = await runDeepSeekOcr({ fileDataUrl: body.fileDataUrl });
    const transformed = await transformOcrToStudyNote({
      rawOcrMarkdown,
      subjectName: structure.subject.name,
      notebookName: structure.notebook.name,
      chapterTitle: structure.chapter.title,
      outputFormat: body.outputFormat,
      templatePreset: body.templatePreset || "general",
      templateInstruction: body.templateInstruction || "整理为通用课堂笔记。",
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

    return NextResponse.json({
      subject: updated.subject,
      notebook: updated.notebook,
      chapter: updated.chapter,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

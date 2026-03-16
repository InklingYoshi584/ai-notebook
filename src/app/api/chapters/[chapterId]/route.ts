import { NextRequest, NextResponse } from "next/server";

import { updateChapterNote } from "@/lib/store";

type Params = {
  params: Promise<{
    chapterId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { chapterId } = await context.params;
    const body = (await request.json()) as {
      markdown?: string;
      mindmapMermaid?: string;
    };

    const updated = await updateChapterNote({
      chapterId,
      updater: (chapter) => {
        if (!chapter.note) {
          throw new Error("This chapter does not have generated content yet.");
        }

        if (typeof body.markdown === "string") {
          chapter.note.markdown = body.markdown;
        }

        if (typeof body.mindmapMermaid === "string") {
          chapter.note.mindmapMermaid = body.mindmapMermaid;
        }

        chapter.note.updatedAt = new Date().toISOString();
      },
    });

    return NextResponse.json({ chapter: updated.chapter });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

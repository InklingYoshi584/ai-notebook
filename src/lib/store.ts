import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AppData, Chapter, Notebook, Subject } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "notebooks.json");

const now = () => new Date().toISOString();

const seedData = (): AppData => {
  const createdAt = now();

  return {
    updatedAt: createdAt,
    subjects: [
      {
        id: "subject-demo-biology",
        name: "生物",
        theme: "from-emerald-300 via-teal-300 to-cyan-300",
        description: "概念树、过程图和名词解释集中管理。",
        createdAt,
        updatedAt: createdAt,
        notebooks: [
          {
            id: "notebook-demo-biology",
            name: "细胞与分子基础",
            createdAt,
            updatedAt: createdAt,
            chapters: [
              {
                id: "chapter-demo-biology",
                title: "示例章节",
                unit: "第 1 单元",
                createdAt,
                updatedAt: createdAt,
                note: {
                  rawOcrMarkdown: "# 细胞结构\n\n- 细胞膜\n- 细胞核\n- 线粒体",
                  markdown:
                    "# 细胞结构\n\n## 核心概念\n- 细胞膜：控制物质进出\n- 细胞核：储存遗传信息\n- 线粒体：提供能量\n\n## 复习提示\n- 重点对比各细胞器功能。",
                  mindmapMermaid:
                    "mindmap\n  root((细胞结构))\n    核心概念\n      细胞膜\n      细胞核\n      线粒体\n    复习提示\n      对比各细胞器功能",
                  mindmapTree: {
                    title: "细胞结构",
                    children: [
                      {
                        title: "核心概念",
                        children: [
                          { title: "细胞膜" },
                          { title: "细胞核" },
                          { title: "线粒体" },
                        ],
                      },
                      {
                        title: "复习提示",
                        children: [{ title: "对比各细胞器功能" }],
                      },
                    ],
                  },
                  sourceName: "demo-note.png",
                  updatedAt: createdAt,
                },
              },
            ],
          },
        ],
      },
      {
        id: "subject-demo-history",
        name: "历史",
        theme: "from-amber-200 via-orange-200 to-rose-200",
        description: "按时间线整理课堂笔记和事件脉络。",
        createdAt,
        updatedAt: createdAt,
        notebooks: [
          {
            id: "notebook-demo-history",
            name: "近代中国史",
            createdAt,
            updatedAt: createdAt,
            chapters: [],
          },
        ],
      },
    ],
  };
};

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(dataFile, "utf-8");
  } catch {
    await writeFile(dataFile, JSON.stringify(seedData(), null, 2), "utf-8");
  }
}

export async function readStore(): Promise<AppData> {
  await ensureStore();
  const raw = await readFile(dataFile, "utf-8");
  return JSON.parse(raw) as AppData;
}

export async function writeStore(data: AppData) {
  data.updatedAt = now();
  await ensureStore();
  await writeFile(dataFile, JSON.stringify(data, null, 2), "utf-8");
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
    .slice(0, 48) || "item";

const subjectThemes = [
  "from-emerald-300 via-teal-300 to-cyan-300",
  "from-amber-200 via-orange-200 to-rose-200",
  "from-sky-200 via-cyan-200 to-teal-200",
  "from-fuchsia-200 via-pink-200 to-rose-200",
  "from-lime-200 via-green-200 to-emerald-200",
];

function pickTheme(index: number) {
  return subjectThemes[index % subjectThemes.length];
}

export async function createSubject(input: { name: string; description?: string }) {
  const data = await readStore();
  const timestamp = now();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Subject name is required");
  }

  const existing = data.subjects.find((item) => item.name === name);
  if (existing) {
    return { data, subject: existing };
  }

  const subject = {
    id: `subject-${slugify(name)}-${Date.now()}`,
    name,
    description: input.description?.trim() || "自定义学科笔记本",
    theme: pickTheme(data.subjects.length),
    createdAt: timestamp,
    updatedAt: timestamp,
    notebooks: [],
  } satisfies Subject;

  data.subjects.unshift(subject);
  await writeStore(data);
  return { data, subject };
}

export async function createNotebook(input: { subjectId: string; name: string }) {
  const data = await readStore();
  const timestamp = now();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Notebook name is required");
  }

  const subject = data.subjects.find((item) => item.id === input.subjectId);
  if (!subject) {
    throw new Error("Subject not found");
  }

  const existing = subject.notebooks.find((item) => item.name === name);
  if (existing) {
    return { data, subject, notebook: existing };
  }

  const notebook = {
    id: `notebook-${slugify(name)}-${Date.now()}`,
    name,
    chapters: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies Notebook;

  subject.notebooks.unshift(notebook);
  subject.updatedAt = timestamp;
  await writeStore(data);
  return { data, subject, notebook };
}

export async function createChapter(input: {
  subjectId: string;
  notebookId: string;
  title: string;
  unit: string;
}) {
  const data = await readStore();
  const timestamp = now();
  const title = input.title.trim();

  if (!title) {
    throw new Error("Chapter title is required");
  }

  const subject = data.subjects.find((item) => item.id === input.subjectId);
  if (!subject) {
    throw new Error("Subject not found");
  }

  const notebook = subject.notebooks.find((item) => item.id === input.notebookId);
  if (!notebook) {
    throw new Error("Notebook not found");
  }

  const existing = notebook.chapters.find((item) => item.title === title);
  if (existing) {
    existing.unit = input.unit.trim() || existing.unit;
    existing.updatedAt = timestamp;
    notebook.updatedAt = timestamp;
    subject.updatedAt = timestamp;
    await writeStore(data);
    return { data, subject, notebook, chapter: existing };
  }

  const chapter = {
    id: `chapter-${slugify(title)}-${Date.now()}`,
    title,
    unit: input.unit.trim() || "未分单元",
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies Chapter;

  notebook.chapters.unshift(chapter);
  notebook.updatedAt = timestamp;
  subject.updatedAt = timestamp;
  await writeStore(data);
  return { data, subject, notebook, chapter };
}

export async function findStructureByIds(input: {
  subjectId: string;
  notebookId: string;
  chapterId: string;
}) {
  const data = await readStore();
  const subject = data.subjects.find((item) => item.id === input.subjectId);
  if (!subject) throw new Error("Subject not found");

  const notebook = subject.notebooks.find((item) => item.id === input.notebookId);
  if (!notebook) throw new Error("Notebook not found");

  const chapter = notebook.chapters.find((item) => item.id === input.chapterId);
  if (!chapter) throw new Error("Chapter not found");

  return { data, subject, notebook, chapter };
}

export async function renameLibraryItem(input: {
  kind: "subject" | "notebook" | "chapter";
  id: string;
  name: string;
  unit?: string;
}) {
  const data = await readStore();
  const timestamp = now();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Name is required");
  }

  if (input.kind === "subject") {
    const subject = data.subjects.find((item) => item.id === input.id);
    if (!subject) throw new Error("Subject not found");
    subject.name = name;
    subject.updatedAt = timestamp;
    await writeStore(data);
    return { data, subject };
  }

  for (const subject of data.subjects) {
    const notebook = subject.notebooks.find((item) => item.id === input.id);
    if (input.kind === "notebook" && notebook) {
      notebook.name = name;
      notebook.updatedAt = timestamp;
      subject.updatedAt = timestamp;
      await writeStore(data);
      return { data, subject, notebook };
    }

    for (const existingNotebook of subject.notebooks) {
      const chapter = existingNotebook.chapters.find((item) => item.id === input.id);
      if (input.kind === "chapter" && chapter) {
        chapter.title = name;
        if (input.unit !== undefined) {
          chapter.unit = input.unit.trim() || chapter.unit;
        }
        chapter.updatedAt = timestamp;
        existingNotebook.updatedAt = timestamp;
        subject.updatedAt = timestamp;
        await writeStore(data);
        return { data, subject, notebook: existingNotebook, chapter };
      }
    }
  }

  throw new Error("Item not found");
}

export async function deleteLibraryItem(input: {
  kind: "subject" | "notebook" | "chapter";
  id: string;
}) {
  const data = await readStore();
  const timestamp = now();

  if (input.kind === "subject") {
    const index = data.subjects.findIndex((item) => item.id === input.id);
    if (index === -1) throw new Error("Subject not found");
    const [subject] = data.subjects.splice(index, 1);
    await writeStore(data);
    return { data, subject };
  }

  for (const subject of data.subjects) {
    const notebookIndex = subject.notebooks.findIndex((item) => item.id === input.id);
    if (input.kind === "notebook" && notebookIndex !== -1) {
      const [notebook] = subject.notebooks.splice(notebookIndex, 1);
      subject.updatedAt = timestamp;
      await writeStore(data);
      return { data, subject, notebook };
    }

    for (const notebook of subject.notebooks) {
      const chapterIndex = notebook.chapters.findIndex((item) => item.id === input.id);
      if (input.kind === "chapter" && chapterIndex !== -1) {
        const [chapter] = notebook.chapters.splice(chapterIndex, 1);
        notebook.updatedAt = timestamp;
        subject.updatedAt = timestamp;
        await writeStore(data);
        return { data, subject, notebook, chapter };
      }
    }
  }

  throw new Error("Item not found");
}

export async function upsertChapterShell(input: {
  subjectName: string;
  notebookName: string;
  chapterTitle: string;
  unit: string;
}) {
  const data = await readStore();
  const timestamp = now();

  let subject = data.subjects.find((item) => item.name === input.subjectName);
  if (!subject) {
    subject = {
      id: `subject-${slugify(input.subjectName)}-${Date.now()}`,
      name: input.subjectName,
      description: "自定义学科笔记本",
      theme: "from-sky-200 via-cyan-200 to-teal-200",
      createdAt: timestamp,
      updatedAt: timestamp,
      notebooks: [],
    } satisfies Subject;
    data.subjects.unshift(subject);
  }

  let notebook = subject.notebooks.find((item) => item.name === input.notebookName);
  if (!notebook) {
    notebook = {
      id: `notebook-${slugify(input.notebookName)}-${Date.now()}`,
      name: input.notebookName,
      chapters: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies Notebook;
    subject.notebooks.unshift(notebook);
  }

  let chapter = notebook.chapters.find((item) => item.title === input.chapterTitle);
  if (!chapter) {
    chapter = {
      id: `chapter-${slugify(input.chapterTitle)}-${Date.now()}`,
      title: input.chapterTitle,
      unit: input.unit,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies Chapter;
    notebook.chapters.unshift(chapter);
  } else {
    chapter.unit = input.unit;
    chapter.updatedAt = timestamp;
  }

  subject.updatedAt = timestamp;
  notebook.updatedAt = timestamp;
  await writeStore(data);

  return { data, subject, notebook, chapter };
}

export async function updateChapterNote(input: {
  chapterId: string;
  updater: (chapter: Chapter) => void;
}) {
  const data = await readStore();

  for (const subject of data.subjects) {
    for (const notebook of subject.notebooks) {
      const chapter = notebook.chapters.find((item) => item.id === input.chapterId);
      if (!chapter) continue;

      input.updater(chapter);
      const timestamp = now();
      chapter.updatedAt = timestamp;
      notebook.updatedAt = timestamp;
      subject.updatedAt = timestamp;
      await writeStore(data);

      return { data, subject, notebook, chapter };
    }
  }

  throw new Error("Chapter not found");
}

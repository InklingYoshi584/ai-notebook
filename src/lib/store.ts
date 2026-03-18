import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import type { AppData, Chapter, Notebook, NoteRecord, Subject } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const legacyDataFile = path.join(dataDir, "notebooks.json");
const storeDir = path.join(dataDir, "library");
const storeMetaFile = path.join(storeDir, "meta.json");
const subjectsDir = path.join(storeDir, "subjects");

type StoreMeta = {
  updatedAt: string;
};

type SubjectMeta = Omit<Subject, "notebooks">;

type NotebookMeta = Omit<Notebook, "chapters">;

type ChapterMeta = Omit<Chapter, "note">;

type NoteMeta = Pick<NoteRecord, "sourceName" | "updatedAt">;

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

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function getSubjectDir(subjectId: string) {
  return path.join(subjectsDir, subjectId);
}

function getSubjectMetaFile(subjectId: string) {
  return path.join(getSubjectDir(subjectId), "meta.json");
}

function getNotebooksDir(subjectId: string) {
  return path.join(getSubjectDir(subjectId), "notebooks");
}

function getNotebookDir(subjectId: string, notebookId: string) {
  return path.join(getNotebooksDir(subjectId), notebookId);
}

function getNotebookMetaFile(subjectId: string, notebookId: string) {
  return path.join(getNotebookDir(subjectId, notebookId), "meta.json");
}

function getChaptersDir(subjectId: string, notebookId: string) {
  return path.join(getNotebookDir(subjectId, notebookId), "chapters");
}

function getChapterDir(subjectId: string, notebookId: string, chapterId: string) {
  return path.join(getChaptersDir(subjectId, notebookId), chapterId);
}

function getChapterMetaFile(subjectId: string, notebookId: string, chapterId: string) {
  return path.join(getChapterDir(subjectId, notebookId, chapterId), "meta.json");
}

function getChapterNoteDir(subjectId: string, notebookId: string, chapterId: string) {
  return path.join(getChapterDir(subjectId, notebookId, chapterId), "note");
}

function getChapterNoteMetaFile(subjectId: string, notebookId: string, chapterId: string) {
  return path.join(getChapterNoteDir(subjectId, notebookId, chapterId), "meta.json");
}

async function listDirectories(rootDir: string) {
  if (!(await pathExists(rootDir))) {
    return [] as string[];
  }

  const entries = await readdir(rootDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function readNoteRecord(
  subjectId: string,
  notebookId: string,
  chapterId: string,
): Promise<NoteRecord | undefined> {
  const noteDir = getChapterNoteDir(subjectId, notebookId, chapterId);
  if (!(await pathExists(noteDir))) {
    return undefined;
  }

  const noteMeta = await readJsonFile<NoteMeta>(
    getChapterNoteMetaFile(subjectId, notebookId, chapterId),
  );
  const rawOcrMarkdown = await readFile(path.join(noteDir, "ocr.md"), "utf-8");
  const markdown = await readFile(path.join(noteDir, "markdown.md"), "utf-8");
  const mindmapMermaid = await readFile(path.join(noteDir, "mindmap.mmd"), "utf-8");
  const mindmapTree = await readJsonFile<NoteRecord["mindmapTree"]>(
    path.join(noteDir, "mindmap-tree.json"),
  );
  const sourceDataUrlPath = path.join(noteDir, "source-data-url.txt");
  const sourceDataUrl = (await pathExists(sourceDataUrlPath))
    ? await readFile(sourceDataUrlPath, "utf-8")
    : undefined;

  return {
    ...noteMeta,
    rawOcrMarkdown,
    markdown,
    mindmapMermaid,
    mindmapTree,
    sourceDataUrl,
  };
}

async function readStructuredStore(): Promise<AppData> {
  const meta = await readJsonFile<StoreMeta>(storeMetaFile);
  const subjectIds = await listDirectories(subjectsDir);
  const subjects = await Promise.all(
    subjectIds.map(async (subjectId) => {
      const subjectMeta = await readJsonFile<SubjectMeta>(getSubjectMetaFile(subjectId));
      const notebookIds = await listDirectories(getNotebooksDir(subjectId));
      const notebooks = await Promise.all(
        notebookIds.map(async (notebookId) => {
          const notebookMeta = await readJsonFile<NotebookMeta>(
            getNotebookMetaFile(subjectId, notebookId),
          );
          const chapterIds = await listDirectories(getChaptersDir(subjectId, notebookId));
          const chapters = await Promise.all(
            chapterIds.map(async (chapterId) => {
              const chapterMeta = await readJsonFile<ChapterMeta>(
                getChapterMetaFile(subjectId, notebookId, chapterId),
              );
              const note = await readNoteRecord(subjectId, notebookId, chapterId);

              return {
                ...chapterMeta,
                note,
              } satisfies Chapter;
            }),
          );

          return {
            ...notebookMeta,
            chapters: sortByUpdatedAtDesc(chapters),
          } satisfies Notebook;
        }),
      );

      return {
        ...subjectMeta,
        notebooks: sortByUpdatedAtDesc(notebooks),
      } satisfies Subject;
    }),
  );

  return {
    updatedAt: meta.updatedAt,
    subjects: sortByUpdatedAtDesc(subjects),
  };
}

async function writeNoteRecord(
  subjectId: string,
  notebookId: string,
  chapterId: string,
  note: NoteRecord,
) {
  const noteDir = getChapterNoteDir(subjectId, notebookId, chapterId);
  await mkdir(noteDir, { recursive: true });
  await writeJsonFile(getChapterNoteMetaFile(subjectId, notebookId, chapterId), {
    sourceName: note.sourceName,
    updatedAt: note.updatedAt,
  } satisfies NoteMeta);
  await writeFile(path.join(noteDir, "ocr.md"), note.rawOcrMarkdown, "utf-8");
  await writeFile(path.join(noteDir, "markdown.md"), note.markdown, "utf-8");
  await writeFile(path.join(noteDir, "mindmap.mmd"), note.mindmapMermaid, "utf-8");
  await writeJsonFile(path.join(noteDir, "mindmap-tree.json"), note.mindmapTree);

  const sourceDataUrlPath = path.join(noteDir, "source-data-url.txt");
  if (note.sourceDataUrl) {
    await writeFile(sourceDataUrlPath, note.sourceDataUrl, "utf-8");
  }
}

async function persistStore(data: AppData) {
  await mkdir(dataDir, { recursive: true });
  await rm(storeDir, { recursive: true, force: true });
  await mkdir(subjectsDir, { recursive: true });
  await writeJsonFile(storeMetaFile, { updatedAt: data.updatedAt } satisfies StoreMeta);

  for (const subject of data.subjects) {
    const subjectDir = getSubjectDir(subject.id);
    await mkdir(subjectDir, { recursive: true });
    await writeJsonFile(getSubjectMetaFile(subject.id), {
      id: subject.id,
      name: subject.name,
      theme: subject.theme,
      description: subject.description,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    } satisfies SubjectMeta);

    await mkdir(getNotebooksDir(subject.id), { recursive: true });

    for (const notebook of subject.notebooks) {
      const notebookDir = getNotebookDir(subject.id, notebook.id);
      await mkdir(notebookDir, { recursive: true });
      await writeJsonFile(getNotebookMetaFile(subject.id, notebook.id), {
        id: notebook.id,
        name: notebook.name,
        createdAt: notebook.createdAt,
        updatedAt: notebook.updatedAt,
      } satisfies NotebookMeta);

      await mkdir(getChaptersDir(subject.id, notebook.id), { recursive: true });

      for (const chapter of notebook.chapters) {
        const chapterDir = getChapterDir(subject.id, notebook.id, chapter.id);
        await mkdir(chapterDir, { recursive: true });
        await writeJsonFile(getChapterMetaFile(subject.id, notebook.id, chapter.id), {
          id: chapter.id,
          title: chapter.title,
          unit: chapter.unit,
          createdAt: chapter.createdAt,
          updatedAt: chapter.updatedAt,
        } satisfies ChapterMeta);

        if (chapter.note) {
          await writeNoteRecord(subject.id, notebook.id, chapter.id, chapter.note);
        }
      }
    }
  }
}

async function migrateLegacyStore() {
  if (!(await pathExists(legacyDataFile))) {
    return false;
  }

  const legacyData = await readJsonFile<AppData>(legacyDataFile);
  await persistStore(legacyData);
  return true;
}

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  if (await pathExists(storeMetaFile)) {
    return;
  }

  const migrated = await migrateLegacyStore();
  if (migrated) {
    return;
  }

  await persistStore(seedData());
}

export async function readStore(): Promise<AppData> {
  await ensureStore();
  return readStructuredStore();
}

export async function writeStore(data: AppData) {
  data.updatedAt = now();
  await ensureStore();
  await persistStore(data);
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

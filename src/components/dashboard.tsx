"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpenText, ChevronRight, LayoutList, Network, Plus } from "lucide-react";

import type { AppData, Chapter, MindmapNode, Notebook, OutputFormat, Subject } from "@/lib/types";

type DashboardProps = {
  initialData: AppData;
};

type NotebookItem = {
  subject: Subject;
  notebook: Notebook;
};

function flattenNotebooks(subjects: Subject[]) {
  const items: NotebookItem[] = [];
  for (const subject of subjects) {
    for (const notebook of subject.notebooks) {
      items.push({ subject, notebook });
    }
  }
  return items;
}

function toTreeLines(node?: MindmapNode) {
  if (!node) return [] as string[];

  const lines: string[] = [];
  const walk = (item: MindmapNode, depth: number) => {
    lines.push(`${"  ".repeat(depth)}- ${item.title}`);
    item.children?.forEach((child) => walk(child, depth + 1));
  };
  walk(node, 0);
  return lines;
}

function MindmapPreview({ node }: { node?: MindmapNode }) {
  if (!node) {
    return <p className="text-sm text-slate-500">这个章节还没有思维导图内容。</p>;
  }

  const lines = toTreeLines(node);
  return (
    <pre className="w-full max-w-full overflow-auto rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm leading-7 text-slate-700">
      {lines.join("\n")}
    </pre>
  );
}

export function Dashboard({ initialData }: DashboardProps) {
  const [data, setData] = useState(initialData);
  const [previewMode, setPreviewMode] = useState<OutputFormat>("markdown");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobileDialogTab, setMobileDialogTab] = useState<"picker" | "create">("picker");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterUnit, setNewChapterUnit] = useState("第 1 单元");
  const [createNotebookSubjectId, setCreateNotebookSubjectId] = useState("");
  const [createChapterNotebookId, setCreateChapterNotebookId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const notebooks = useMemo(() => flattenNotebooks(data.subjects), [data.subjects]);
  const [selectedNotebookId, setSelectedNotebookId] = useState(notebooks[0]?.notebook.id || "");
  const selectedNotebookItem =
    notebooks.find((item) => item.notebook.id === selectedNotebookId) ?? notebooks[0] ?? undefined;
  const selectedSubject = selectedNotebookItem?.subject ?? data.subjects[0];

  const chapters = selectedNotebookItem?.notebook.chapters ?? [];
  const [selectedChapterId, setSelectedChapterId] = useState(chapters[0]?.id || "");
  const selectedChapter =
    chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0] ?? undefined;

  const notebookCreationSubjectId = createNotebookSubjectId || selectedSubject?.id || data.subjects[0]?.id || "";
  const chapterCreationNotebookId =
    createChapterNotebookId || selectedNotebookItem?.notebook.id || notebooks[0]?.notebook.id || "";
  const chapterCreationNotebookItem = notebooks.find((item) => item.notebook.id === chapterCreationNotebookId);

  function selectNotebook(notebookId: string) {
    const item = notebooks.find((entry) => entry.notebook.id === notebookId);
    if (!item) return;

    setSelectedNotebookId(notebookId);
    setSelectedChapterId(item.notebook.chapters[0]?.id || "");
    setPickerOpen(false);
  }

  function createItem(kind: "subject" | "notebook" | "chapter", payload: Record<string, string>) {
    setFeedback("");

    startTransition(async () => {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...payload }),
      });
      const result = (await response.json()) as {
        error?: string;
        data: AppData;
        subject?: Subject;
        notebook?: Notebook;
        chapter?: Chapter;
      };

      if (!response.ok || result.error) {
        setFeedback(result.error || "创建失败");
        return;
      }

      setData(result.data);
      if (result.notebook?.id) {
        setSelectedNotebookId(result.notebook.id);
        setSelectedChapterId(result.notebook.chapters[0]?.id || "");
        setCreateChapterNotebookId(result.notebook.id);
      }
      if (result.chapter?.id) {
        setSelectedChapterId(result.chapter.id);
      }
      if (result.subject?.id) {
        setCreateNotebookSubjectId(result.subject.id);
      }
      setFeedback("创建成功");
    });
  }

  function handleCreateSubject() {
    if (!newSubjectName.trim()) return;
    createItem("subject", { name: newSubjectName.trim() });
    setNewSubjectName("");
  }

  function handleCreateNotebook() {
    if (!notebookCreationSubjectId || !newNotebookName.trim()) return;
    createItem("notebook", { subjectId: notebookCreationSubjectId, name: newNotebookName.trim() });
    setNewNotebookName("");
  }

  function handleCreateChapter() {
    if (!chapterCreationNotebookItem?.subject.id || !chapterCreationNotebookId || !newChapterTitle.trim()) return;
    createItem("chapter", {
      subjectId: chapterCreationNotebookItem.subject.id,
      notebookId: chapterCreationNotebookId,
      title: newChapterTitle.trim(),
      unit: newChapterUnit.trim() || "未分单元",
    });
    setNewChapterTitle("");
  }

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <main className="mx-auto grid w-full max-w-7xl min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4 lg:block">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">选择笔记本</h2>
          </div>

          <div className="space-y-3">
            {data.subjects.map((subject) => (
              <div key={subject.id} className="rounded-2xl border border-[var(--line)] bg-white/75 p-2">
                <p className="px-2 py-1 text-xs tracking-[0.2em] text-slate-500 uppercase">{subject.name}</p>
                <div className="space-y-1">
                  {subject.notebooks.map((notebook) => (
                    <button
                      key={notebook.id}
                      type="button"
                      onClick={() => selectNotebook(notebook.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                        selectedNotebookItem?.notebook.id === notebook.id
                          ? "bg-teal-50 text-teal-900"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{notebook.name}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 rounded-2xl border border-[var(--line)] bg-white/75 p-3">
            <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">新增内容</p>
            <input
              value={newSubjectName}
              onChange={(event) => setNewSubjectName(event.target.value)}
              className="field"
              placeholder="新科目"
            />
            <button type="button" onClick={handleCreateSubject} className="action-button" disabled={isPending}>
              <Plus className="h-4 w-4" /> 新建科目
            </button>
            <input
              value={newNotebookName}
              onChange={(event) => setNewNotebookName(event.target.value)}
              className="field"
              placeholder="新笔记本"
            />
            <select
              value={notebookCreationSubjectId}
              onChange={(event) => setCreateNotebookSubjectId(event.target.value)}
              className="field"
            >
              {data.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  归属科目：{subject.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleCreateNotebook} className="action-button" disabled={isPending}>
              <Plus className="h-4 w-4" /> 新建笔记本
            </button>
            <input
              value={newChapterTitle}
              onChange={(event) => setNewChapterTitle(event.target.value)}
              className="field"
              placeholder="新章节"
            />
            <input
              value={newChapterUnit}
              onChange={(event) => setNewChapterUnit(event.target.value)}
              className="field"
              placeholder="单元"
            />
            <select
              value={chapterCreationNotebookId}
              onChange={(event) => setCreateChapterNotebookId(event.target.value)}
              className="field"
            >
              {notebooks.map((item) => (
                <option key={item.notebook.id} value={item.notebook.id}>
                  归属笔记本：{item.subject.name} / {item.notebook.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleCreateChapter} className="action-button" disabled={isPending}>
              <Plus className="h-4 w-4" /> 新建章节
            </button>
            {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}
          </div>
        </aside>

        <section className="min-w-0 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
                {selectedNotebookItem?.subject.name || "未选择科目"}
              </p>
              <h1 className="truncate text-2xl font-semibold">
                {selectedNotebookItem?.notebook.name || "请先创建笔记本"}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm lg:hidden"
            >
              <LayoutList className="h-4 w-4" /> 切换笔记本
            </button>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-full rounded-2xl border border-[var(--line)] bg-white p-1 sm:w-auto">
              {(["markdown", "mindmap"] as OutputFormat[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm transition sm:flex-none ${
                    previewMode === mode ? "bg-[var(--accent)] text-white" : "text-slate-600"
                  }`}
                >
                  {mode === "markdown" ? "Markdown" : "思维导图"}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <Network className="h-4 w-4" /> 预览模式
            </div>
          </div>

          {chapters.length > 0 ? (
            <div className="mb-4">
              <label className="mb-2 block text-sm text-slate-600">章节</label>
              <select
                value={selectedChapter?.id || ""}
                onChange={(event) => setSelectedChapterId(event.target.value)}
                className="field"
              >
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="h-[calc(100vh-240px)] max-h-[760px] min-h-[360px] w-full max-w-full overflow-auto rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            {selectedChapter ? (
              <ChapterPreview chapter={selectedChapter} mode={previewMode} />
            ) : (
              <p className="text-sm text-slate-500">当前笔记本还没有章节内容。</p>
            )}
          </div>
        </section>
      </main>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 lg:hidden" onClick={() => setPickerOpen(false)}>
          <div
            className="max-h-[78vh] w-full overflow-auto rounded-3xl bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 inline-flex w-full rounded-2xl border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setMobileDialogTab("picker")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm ${
                  mobileDialogTab === "picker" ? "bg-[var(--accent)] text-white" : "text-slate-600"
                }`}
              >
                选择
              </button>
              <button
                type="button"
                onClick={() => setMobileDialogTab("create")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm ${
                  mobileDialogTab === "create" ? "bg-[var(--accent)] text-white" : "text-slate-600"
                }`}
              >
                新增
              </button>
            </div>

            {mobileDialogTab === "picker" ? (
              <div className="space-y-3">
                {data.subjects.map((subject) => (
                  <div key={subject.id} className="rounded-2xl border border-slate-200 p-2">
                    <p className="px-2 py-1 text-xs tracking-[0.2em] text-slate-500 uppercase">{subject.name}</p>
                    <div className="space-y-1">
                      {subject.notebooks.map((notebook) => (
                        <button
                          key={notebook.id}
                          type="button"
                          onClick={() => selectNotebook(notebook.id)}
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                            selectedNotebookItem?.notebook.id === notebook.id
                              ? "bg-teal-50 text-teal-900"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          {notebook.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={newSubjectName}
                  onChange={(event) => setNewSubjectName(event.target.value)}
                  className="field"
                  placeholder="新科目"
                />
                <button type="button" onClick={handleCreateSubject} className="action-button" disabled={isPending}>
                  <Plus className="h-4 w-4" /> 新建科目
                </button>
                <input
                  value={newNotebookName}
                  onChange={(event) => setNewNotebookName(event.target.value)}
                  className="field"
                  placeholder="新笔记本"
                />
                <select
                  value={notebookCreationSubjectId}
                  onChange={(event) => setCreateNotebookSubjectId(event.target.value)}
                  className="field"
                >
                  {data.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      归属科目：{subject.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={handleCreateNotebook} className="action-button" disabled={isPending}>
                  <Plus className="h-4 w-4" /> 新建笔记本
                </button>
                <input
                  value={newChapterTitle}
                  onChange={(event) => setNewChapterTitle(event.target.value)}
                  className="field"
                  placeholder="新章节"
                />
                <input
                  value={newChapterUnit}
                  onChange={(event) => setNewChapterUnit(event.target.value)}
                  className="field"
                  placeholder="单元"
                />
                <select
                  value={chapterCreationNotebookId}
                  onChange={(event) => setCreateChapterNotebookId(event.target.value)}
                  className="field"
                >
                  {notebooks.map((item) => (
                    <option key={item.notebook.id} value={item.notebook.id}>
                      归属笔记本：{item.subject.name} / {item.notebook.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={handleCreateChapter} className="action-button" disabled={isPending}>
                  <Plus className="h-4 w-4" /> 新建章节
                </button>
                {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChapterPreview({ chapter, mode }: { chapter: Chapter; mode: OutputFormat }) {
  if (!chapter.note) {
    return <p className="text-sm text-slate-500">这个章节还没有生成内容。</p>;
  }

  if (mode === "mindmap") {
    return (
      <div className="space-y-4">
        <MindmapPreview node={chapter.note.mindmapTree} />
        <details className="rounded-2xl border border-[var(--line)] bg-white/75 p-3">
          <summary className="cursor-pointer text-sm font-medium">查看 Mermaid 源码</summary>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-700">
            {chapter.note.mindmapMermaid}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <pre className="w-full max-w-full overflow-auto whitespace-pre-wrap text-sm leading-7 text-slate-700">
      {chapter.note.markdown}
    </pre>
  );
}

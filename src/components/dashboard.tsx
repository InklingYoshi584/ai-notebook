"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BookOpenText,
  ChevronRight,
  LayoutList,
  Network,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import type {
  AppData,
  Chapter,
  MindmapNode,
  Notebook,
  OutputFormat,
  ProcessResponse,
  Subject,
  TemplatePresetId,
} from "@/lib/types";

type DashboardProps = {
  initialData: AppData;
};

type NotebookItem = {
  subject: Subject;
  notebook: Notebook;
};

type TemplatePreset = {
  id: TemplatePresetId;
  label: string;
  instruction: string;
};

const templatePresets: TemplatePreset[] = [
  {
    id: "general",
    label: "通用课堂",
    instruction: "整理为清晰的课堂笔记，保留知识点、例子、易错点和复习提示。",
  },
  {
    id: "math",
    label: "数学题型",
    instruction: "突出公式、定理、例题、解题步骤和易错点。",
  },
  {
    id: "biology",
    label: "生物概念树",
    instruction: "突出概念定义、结构功能、过程步骤和对比关系。",
  },
  {
    id: "history",
    label: "历史时间线",
    instruction: "突出时间线、事件背景、原因、经过、影响和易混点。",
  },
  {
    id: "english",
    label: "英语词法",
    instruction: "突出单词、短语、语法点、例句和记忆提示。",
  },
  {
    id: "physics",
    label: "物理模型",
    instruction: "突出物理模型、条件、实验现象、公式和结论。",
  },
];

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
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"subject" | "notebook" | "chapter" | "unit">("chapter");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [chapterCreateNotebookId, setChapterCreateNotebookId] = useState("");
  const [notebookCreateSubjectId, setNotebookCreateSubjectId] = useState("");
  const [newUnitName, setNewUnitName] = useState("第 1 单元");
  const [aiSubjectId, setAiSubjectId] = useState("");
  const [aiNotebookId, setAiNotebookId] = useState("");
  const [useNewUnit, setUseNewUnit] = useState(true);
  const [existingChapterId, setExistingChapterId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templatePreset, setTemplatePreset] = useState<TemplatePresetId>("general");
  const [templateInstruction, setTemplateInstruction] = useState(templatePresets[0].instruction);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const notebooks = useMemo(() => flattenNotebooks(data.subjects), [data.subjects]);
  const [selectedNotebookId, setSelectedNotebookId] = useState(notebooks[0]?.notebook.id || "");
  const selectedNotebookItem =
    notebooks.find((item) => item.notebook.id === selectedNotebookId) ?? notebooks[0] ?? undefined;
  const selectedSubject = selectedNotebookItem?.subject ?? data.subjects[0];

  const chapters = selectedNotebookItem?.notebook.chapters ?? [];
  const [selectedChapterId, setSelectedChapterId] = useState(chapters[0]?.id || "");
  const selectedChapter =
    chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0] ?? undefined;

  const resolvedAiSubjectId = aiSubjectId || selectedSubject?.id || data.subjects[0]?.id || "";
  const aiSubject = data.subjects.find((subject) => subject.id === resolvedAiSubjectId) ?? data.subjects[0];
  const resolvedAiNotebookId = aiNotebookId || selectedNotebookItem?.notebook.id || aiSubject?.notebooks[0]?.id || "";
  const aiNotebookItem = notebooks.find((item) => item.notebook.id === resolvedAiNotebookId);
  const aiNotebookChapters = aiNotebookItem?.notebook.chapters ?? [];
  const resolvedExistingChapterId = existingChapterId || aiNotebookChapters[0]?.id || "";

  function selectNotebook(notebookId: string) {
    const item = notebooks.find((entry) => entry.notebook.id === notebookId);
    if (!item) return;

    setSelectedNotebookId(notebookId);
    setSelectedChapterId(item.notebook.chapters[0]?.id || "");
    setPickerOpen(false);
  }

  function selectChapter(notebookId: string, chapterId: string) {
    setSelectedNotebookId(notebookId);
    setSelectedChapterId(chapterId);
    setPickerOpen(false);
  }

  function openSubjectDialog() {
    setNewSubjectName("");
    setSubjectDialogOpen(true);
  }

  function openNotebookDialog(subjectId: string) {
    setNotebookCreateSubjectId(subjectId);
    setNewNotebookName("");
    setNotebookDialogOpen(true);
  }

  function openChapterInline(notebookId: string) {
    setChapterCreateNotebookId(notebookId);
    setNewChapterName("");
  }

  function syncSelection(nextData: AppData, notebookId?: string, chapterId?: string) {
    const nextNotebooks = flattenNotebooks(nextData.subjects);
    const nextNotebook = nextNotebooks.find((item) => item.notebook.id === notebookId) ?? nextNotebooks[0];
    const nextChapter =
      nextNotebook?.notebook.chapters.find((item) => item.id === chapterId) ?? nextNotebook?.notebook.chapters[0];

    setSelectedNotebookId(nextNotebook?.notebook.id || "");
    setSelectedChapterId(nextChapter?.id || "");
  }

  function openAiDialog() {
    setAiSubjectId(selectedSubject?.id || data.subjects[0]?.id || "");
    setAiNotebookId(selectedNotebookItem?.notebook.id || notebooks[0]?.notebook.id || "");
    setExistingChapterId(selectedChapter?.id || "");
    setUseNewUnit(true);
    setNewUnitName(selectedChapter?.unit || "第 1 单元");
    setFeedback("");
    setAiDialogOpen(true);
  }

  async function refreshData() {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    const result = (await response.json()) as { data: AppData };
    setData(result.data);
    return result.data;
  }

  function handleCreateSubject() {
    if (!newSubjectName.trim()) return;

    setFeedback("");
    startTransition(async () => {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "subject", name: newSubjectName.trim() }),
      });
      const result = (await response.json()) as { error?: string; data: AppData; subject?: Subject };

      if (!response.ok || result.error) {
        setFeedback(result.error || "创建科目失败");
        return;
      }

      setData(result.data);
      setSelectedNotebookId(result.subject?.notebooks[0]?.id || "");
      setSelectedChapterId(result.subject?.notebooks[0]?.chapters[0]?.id || "");
      setSubjectDialogOpen(false);
      setFeedback("科目已创建。");
    });
  }

  function handleCreateNotebook() {
    if (!notebookCreateSubjectId || !newNotebookName.trim()) return;

    setFeedback("");
    startTransition(async () => {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "notebook",
          subjectId: notebookCreateSubjectId,
          name: newNotebookName.trim(),
        }),
      });
      const result = (await response.json()) as { error?: string; data: AppData; notebook?: Notebook };

      if (!response.ok || result.error) {
        setFeedback(result.error || "创建笔记本失败");
        return;
      }

      setData(result.data);
      syncSelection(result.data, result.notebook?.id);
      setNotebookDialogOpen(false);
      setFeedback("笔记本已创建。");
    });
  }

  function handleCreateChapter(subjectId: string, notebookId: string) {
    if (!subjectId || !notebookId || !newChapterName.trim()) return;

    setFeedback("");
    startTransition(async () => {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "chapter",
          subjectId,
          notebookId,
          title: newChapterName.trim(),
          unit: "未分单元",
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        data: AppData;
        notebook?: Notebook;
        chapter?: Chapter;
      };

      if (!response.ok || result.error) {
        setFeedback(result.error || "创建章节失败");
        return;
      }

      setData(result.data);
      syncSelection(result.data, result.notebook?.id, result.chapter?.id);
      setChapterCreateNotebookId("");
      setNewChapterName("");
      setFeedback("章节已创建。");
    });
  }

  function handleDelete(kind: "subject" | "notebook" | "chapter") {
    let id = "";
    if (kind === "subject") id = selectedSubject?.id || "";
    if (kind === "notebook") id = selectedNotebookItem?.notebook.id || "";
    if (kind === "chapter") id = selectedChapter?.id || "";
    if (!id) return;

    setFeedback("");
    startTransition(async () => {
      const response = await fetch("/api/library", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const result = (await response.json()) as { error?: string; data: AppData };

      if (!response.ok || result.error) {
        setFeedback(result.error || "删除失败");
        return;
      }

      setData(result.data);
      syncSelection(result.data);
      setDeleteDialogOpen(false);
      setFeedback("删除成功");
    });
  }

  function handleDeleteUnit() {
    if (!selectedChapter?.id) return;

    setFeedback("");
    startTransition(async () => {
      const response = await fetch(`/api/chapters/${selectedChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearUnit: true }),
      });
      const result = (await response.json()) as { error?: string; chapter?: Chapter };

      if (!response.ok || result.error) {
        setFeedback(result.error || "删除单元失败");
        return;
      }

      const nextData = await refreshData();
      syncSelection(nextData, selectedNotebookItem?.notebook.id, selectedChapter.id);
      setDeleteDialogOpen(false);
      setFeedback("当前章节的单元已删除。");
    });
  }

  async function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });
  }

  function handleApplyTemplate(presetId: TemplatePresetId) {
    const preset = templatePresets.find((item) => item.id === presetId);
    if (!preset) return;
    setTemplatePreset(preset.id);
    setTemplateInstruction(preset.instruction);
  }

  function handleGenerate() {
    setFeedback("");

    if (!aiSubject?.id || !resolvedAiNotebookId) {
      setFeedback("请先在树形目录里选择科目和笔记本。");
      return;
    }

    if (!selectedFile) {
      setFeedback("请先选择一张图片或 PDF。");
      return;
    }

    startTransition(async () => {
      try {
        const targetChapterId = resolvedExistingChapterId;

        if (!targetChapterId) {
          setFeedback("请先在树里选择一个章节。");
          return;
        }

        if (useNewUnit && !newUnitName.trim()) {
          setFeedback("请先填写新单元名称。");
          return;
        }

        const fileDataUrl = await fileToDataUrl(selectedFile);
        const response = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: aiSubject.id,
            notebookId: resolvedAiNotebookId,
            chapterId: targetChapterId,
            unit: useNewUnit
              ? newUnitName
              : aiNotebookChapters.find((chapter) => chapter.id === targetChapterId)?.unit || "未分单元",
            fileDataUrl,
            sourceName: selectedFile.name,
            outputFormat: previewMode,
            templatePreset,
            templateInstruction,
          }),
        });
        const result = (await response.json()) as ProcessResponse | { error: string };

        if (!response.ok || "error" in result) {
          throw new Error("error" in result ? result.error : "生成失败");
        }

        await refreshData();
        setSelectedNotebookId(result.notebook.id);
        setSelectedChapterId(result.chapter.id);
        setAiDialogOpen(false);
        setSelectedFile(null);
        setExistingChapterId(result.chapter.id);
        setFeedback("AI 已完成 OCR 和整理，当前章节内容已更新。");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "生成失败");
      }
    });
  }

  function handleSave() {
    if (!selectedChapter?.id || !selectedChapter.note) return;

    const markdownValue = (document.getElementById("markdown-editor") as HTMLTextAreaElement | null)?.value;
    const mindmapValue = (document.getElementById("mindmap-editor") as HTMLTextAreaElement | null)?.value;

    startSaving(async () => {
      const response = await fetch(`/api/chapters/${selectedChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: typeof markdownValue === "string" ? markdownValue : undefined,
          mindmapMermaid: typeof mindmapValue === "string" ? mindmapValue : undefined,
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFeedback(result.error || "保存失败");
        return;
      }

      await refreshData();
      setFeedback("当前章节已保存。");
    });
  }

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <main className="mx-auto grid w-full max-w-7xl min-w-0 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4 lg:block">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpenText className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">选择笔记本</h2>
            </div>
            <button
              type="button"
              onClick={openSubjectDialog}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white text-slate-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {data.subjects.map((subject) => (
              <div key={subject.id} className="rounded-2xl border border-[var(--line)] bg-white/75 p-2">
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">{subject.name}</p>
                  <button
                    type="button"
                    onClick={() => openNotebookDialog(subject.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-white text-slate-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {subject.notebooks.map((notebook) => (
                    <div key={notebook.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectNotebook(notebook.id)}
                          className={`flex min-w-0 flex-1 items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                            selectedNotebookItem?.notebook.id === notebook.id
                              ? "bg-teal-50 text-teal-900"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{notebook.name}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openChapterInline(notebook.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white text-slate-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {chapterCreateNotebookId === notebook.id ? (
                        <div className="flex items-center gap-2 pl-3">
                          <input
                            value={newChapterName}
                            onChange={(event) => setNewChapterName(event.target.value)}
                            className="field py-2 text-sm"
                            placeholder="新建章节"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateChapter(subject.id, notebook.id)}
                            className="inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs"
                          >
                            确定
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChapterCreateNotebookId("");
                              setNewChapterName("");
                            }}
                            className="inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs"
                          >
                            取消
                          </button>
                        </div>
                      ) : null}
                      {selectedNotebookItem?.notebook.id === notebook.id && notebook.chapters.length > 0 ? (
                        <div className="space-y-1 pl-3">
                          {notebook.chapters.map((chapter) => (
                            <div key={chapter.id} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => selectChapter(notebook.id, chapter.id)}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                                  selectedChapter?.id === chapter.id
                                    ? "bg-amber-50 text-amber-900"
                                    : "text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <span className="truncate">{chapter.title}</span>
                                <span className="text-[11px] text-slate-400">章节</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => selectChapter(notebook.id, chapter.id)}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] ${
                                  selectedChapter?.id === chapter.id
                                    ? "bg-orange-50 text-orange-900"
                                    : "text-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                <span className="truncate">{chapter.unit || "未分单元"}</span>
                                <span className="text-[10px] text-slate-400">单元</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
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

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={openAiDialog}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm"
              >
                <Plus className="h-4 w-4" /> AI 整理
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedChapter?.note || isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {isSaving ? "保存中..." : "保存当前预览"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
              >
                <Trash2 className="h-4 w-4" /> 删除
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm lg:hidden"
              >
                <LayoutList className="h-4 w-4" /> 切换笔记本
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-full rounded-2xl border border-[var(--line)] bg-white p-1 sm:w-auto sm:gap-1">
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

          {selectedChapter ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1">章节：{selectedChapter.title}</span>
              <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1">单元：{selectedChapter.unit || "未分单元"}</span>
            </div>
          ) : null}

          <div className="h-[calc(100vh-240px)] max-h-[760px] min-h-[360px] w-full max-w-full overflow-auto rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            {selectedChapter ? (
              <ChapterPreview chapter={selectedChapter} mode={previewMode} />
            ) : (
              <p className="text-sm text-slate-500">当前笔记本还没有章节内容。</p>
            )}
          </div>

          {feedback ? <p className="mt-3 text-sm leading-6 text-slate-600">{feedback}</p> : null}
        </section>
      </main>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 lg:hidden" onClick={() => setPickerOpen(false)}>
          <div
            className="max-h-[82vh] w-full overflow-auto rounded-3xl bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">切换笔记本</h3>
              <button
                type="button"
                onClick={openSubjectDialog}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {data.subjects.map((subject) => (
                <div key={subject.id} className="rounded-2xl border border-slate-200 p-2">
                  <div className="flex items-center justify-between gap-2 px-2 py-1">
                    <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">{subject.name}</p>
                    <button
                      type="button"
                      onClick={() => openNotebookDialog(subject.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {subject.notebooks.map((notebook) => (
                      <div key={notebook.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => selectNotebook(notebook.id)}
                            className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm ${
                              selectedNotebookItem?.notebook.id === notebook.id
                                ? "bg-teal-50 text-teal-900"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            {notebook.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => openChapterInline(notebook.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        {chapterCreateNotebookId === notebook.id ? (
                          <div className="flex items-center gap-2 pl-3">
                            <input
                              value={newChapterName}
                              onChange={(event) => setNewChapterName(event.target.value)}
                              className="field py-2 text-sm"
                              placeholder="新建章节"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleCreateChapter(subject.id, notebook.id)}
                              className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              确定
                            </button>
                          </div>
                        ) : null}
                        {selectedNotebookItem?.notebook.id === notebook.id && notebook.chapters.length > 0 ? (
                          <div className="space-y-1 pl-3">
                            {notebook.chapters.map((chapter) => (
                              <div key={chapter.id} className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => selectChapter(notebook.id, chapter.id)}
                                  className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                                    selectedChapter?.id === chapter.id
                                      ? "bg-amber-50 text-amber-900"
                                      : "text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {chapter.title}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => selectChapter(notebook.id, chapter.id)}
                                  className={`w-full rounded-lg px-3 py-2 text-left text-[11px] ${
                                    selectedChapter?.id === chapter.id
                                      ? "bg-orange-50 text-orange-900"
                                      : "text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  {chapter.unit || "未分单元"}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {aiDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setAiDialogOpen(false)}>
          <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-4 sm:p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">AI 整理</p>
                <h2 className="text-xl font-semibold">选择笔记本并整理图片</h2>
              </div>
              <button type="button" onClick={() => setAiDialogOpen(false)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm">
                关闭
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-700">目标笔记本</p>
                {data.subjects.map((subject) => (
                  <div key={subject.id} className="rounded-2xl border border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAiSubjectId(subject.id);
                        setAiNotebookId(subject.notebooks[0]?.id || "");
                        setExistingChapterId(subject.notebooks[0]?.chapters[0]?.id || "");
                        setNewUnitName(subject.notebooks[0]?.chapters[0]?.unit || "第 1 单元");
                      }}
                      className={`mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                        resolvedAiSubjectId === subject.id ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"
                      }`}
                    >
                      <span>{subject.name}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {resolvedAiSubjectId === subject.id ? (
                      <div className="space-y-1 pl-3">
                        {subject.notebooks.map((notebook) => (
                          <div key={notebook.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAiSubjectId(subject.id);
                                setAiNotebookId(notebook.id);
                                setExistingChapterId(notebook.chapters[0]?.id || "");
                                setNewUnitName(notebook.chapters[0]?.unit || "第 1 单元");
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                                resolvedAiNotebookId === notebook.id
                                  ? "bg-teal-50 text-teal-900"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <span className="truncate">{notebook.name}</span>
                              <span className="text-xs text-slate-400">{notebook.chapters.length} 章</span>
                            </button>
                            {resolvedAiNotebookId === notebook.id && notebook.chapters.length > 0 ? (
                              <div className="space-y-1 pl-3">
                                {notebook.chapters.map((chapter) => (
                                  <button
                                    key={chapter.id}
                                    type="button"
                                    onClick={() => {
                                      setAiSubjectId(subject.id);
                                      setAiNotebookId(notebook.id);
                                      setExistingChapterId(chapter.id);
                                      setNewUnitName(chapter.unit || "第 1 单元");
                                    }}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                                      resolvedExistingChapterId === chapter.id
                                        ? "bg-amber-50 text-amber-900"
                                        : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span className="truncate">{chapter.title}</span>
                                    <span className="text-[11px] text-slate-400">{chapter.unit}</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
                <label className="flex min-w-0 cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-600">
                  <span className="truncate">{selectedFile ? selectedFile.name : "选择图片或 PDF"}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                  <span className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
                    <Upload className="h-3.5 w-3.5" /> 浏览文件
                  </span>
                </label>

                <div className="rounded-2xl border border-slate-200 p-3">
                  <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={useNewUnit}
                      onChange={(event) => setUseNewUnit(event.target.checked)}
                    />
                    在当前章节下新建单元
                  </label>

                  {useNewUnit ? (
                    <input
                      value={newUnitName}
                      onChange={(event) => setNewUnitName(event.target.value)}
                      className="field"
                      placeholder="新单元名称"
                    />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      当前会写入已选章节的现有单元：{aiNotebookChapters.find((chapter) => chapter.id === resolvedExistingChapterId)?.unit || "未分单元"}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {templatePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyTemplate(preset.id)}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        templatePreset === preset.id
                          ? "bg-[var(--accent)] text-white"
                          : "border border-slate-200 text-slate-600"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={templateInstruction}
                  onChange={(event) => setTemplateInstruction(event.target.value)}
                  className="field min-h-[110px] resize-y"
                  placeholder="整理说明"
                />

                <button type="button" onClick={handleGenerate} className="action-button" disabled={isPending}>
                  <Sparkles className="h-4 w-4" /> {isPending ? "整理中..." : "开始 OCR 与整理"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setDeleteDialogOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-4 sm:p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4">
              <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">删除内容</p>
              <h2 className="text-xl font-semibold">选择要删除的对象</h2>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeleteTarget("chapter")}
                className={`rounded-2xl px-3 py-2 text-sm ${deleteTarget === "chapter" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}
              >
                章节
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget("unit")}
                className={`rounded-2xl px-3 py-2 text-sm ${deleteTarget === "unit" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}
              >
                单元
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget("notebook")}
                className={`rounded-2xl px-3 py-2 text-sm ${deleteTarget === "notebook" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}
              >
                笔记本
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget("subject")}
                className={`rounded-2xl px-3 py-2 text-sm ${deleteTarget === "subject" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}
              >
                科目
              </button>
            </div>

            <div className="space-y-3">
              {deleteTarget === "chapter" ? (
                <button
                  type="button"
                  onClick={() => handleDelete("chapter")}
                  disabled={!selectedChapter || isPending}
                  className="danger-button"
                >
                  删除当前章节：{selectedChapter?.title || "未选择"}
                </button>
              ) : null}
              {deleteTarget === "unit" ? (
                <button
                  type="button"
                  onClick={handleDeleteUnit}
                  disabled={!selectedChapter || !selectedChapter.unit || isPending}
                  className="danger-button"
                >
                  删除当前单元：{selectedChapter?.unit || "未设置单元"}
                </button>
              ) : null}
              {deleteTarget === "notebook" ? (
                <button
                  type="button"
                  onClick={() => handleDelete("notebook")}
                  disabled={!selectedNotebookItem?.notebook || isPending}
                  className="danger-button"
                >
                  删除当前笔记本：{selectedNotebookItem?.notebook.name || "未选择"}
                </button>
              ) : null}
              {deleteTarget === "subject" ? (
                <button
                  type="button"
                  onClick={() => handleDelete("subject")}
                  disabled={!selectedSubject || isPending}
                  className="danger-button"
                >
                  删除当前科目：{selectedSubject?.name || "未选择"}
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {subjectDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setSubjectDialogOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-4 sm:p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4">
              <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">新增科目</p>
              <h2 className="text-xl font-semibold">创建一个新科目</h2>
            </div>
            <input
              value={newSubjectName}
              onChange={(event) => setNewSubjectName(event.target.value)}
              className="field"
              placeholder="新科目名称"
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={handleCreateSubject} className="action-button flex-1" disabled={isPending}>
                创建
              </button>
              <button type="button" onClick={() => setSubjectDialogOpen(false)} className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm">
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notebookDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setNotebookDialogOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-4 sm:p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4">
              <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">新增笔记本</p>
              <h2 className="text-xl font-semibold">创建一个新笔记本</h2>
            </div>
            <input
              value={newNotebookName}
              onChange={(event) => setNewNotebookName(event.target.value)}
              className="field"
              placeholder="新笔记本名称"
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={handleCreateNotebook} className="action-button flex-1" disabled={isPending}>
                创建
              </button>
              <button type="button" onClick={() => setNotebookDialogOpen(false)} className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm">
                取消
              </button>
            </div>
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
        <textarea
          id="mindmap-editor"
          defaultValue={chapter.note.mindmapMermaid}
          key={`${chapter.id}-mindmap`}
          className="field min-h-[220px] resize-y bg-[#112026] text-emerald-50"
        />
      </div>
    );
  }

  return (
    <textarea
      id="markdown-editor"
      defaultValue={chapter.note.markdown}
      key={`${chapter.id}-markdown`}
      className="field min-h-full resize-none border-none bg-transparent p-0 leading-7 shadow-none"
    />
  );
}

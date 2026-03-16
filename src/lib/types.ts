export type OutputFormat = "markdown" | "mindmap";

export type TemplatePresetId =
  | "general"
  | "math"
  | "biology"
  | "history"
  | "english"
  | "physics";

export type NoteRecord = {
  markdown: string;
  mindmapMermaid: string;
  mindmapTree: MindmapNode;
  rawOcrMarkdown: string;
  sourceName: string;
  sourceDataUrl?: string;
  updatedAt: string;
};

export type Chapter = {
  id: string;
  title: string;
  unit: string;
  note?: NoteRecord;
  createdAt: string;
  updatedAt: string;
};

export type Notebook = {
  id: string;
  name: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
};

export type Subject = {
  id: string;
  name: string;
  theme: string;
  description: string;
  notebooks: Notebook[];
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  subjects: Subject[];
  updatedAt: string;
};

export type MindmapNode = {
  title: string;
  children?: MindmapNode[];
};

export type BootstrapResponse = {
  data: AppData;
};

export type ProcessResponse = {
  subject: Subject;
  notebook: Notebook;
  chapter: Chapter;
};

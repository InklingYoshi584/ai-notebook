import type { MindmapNode, OutputFormat, TemplatePresetId } from "@/lib/types";

const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const OCR_MODEL = process.env.SILICONFLOW_OCR_MODEL || "deepseek-ai/DeepSeek-OCR";
const TEXT_MODEL = process.env.SILICONFLOW_TEXT_MODEL || "Pro/deepseek-ai/DeepSeek-V3.2";

function getApiKey() {
  const apiKey = process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    throw new Error("SILICONFLOW_API_KEY is not configured on the server.");
  }

  return apiKey;
}

async function siliconflowFetch(body: Record<string, unknown>) {
  const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 401) {
      throw new Error(
        "SiliconFlow API key 无效或已失效。请更新 .env.local 里的 SILICONFLOW_API_KEY，并重启 Next.js 服务。",
      );
    }
    throw new Error(`SiliconFlow request failed: ${response.status} ${detail}`);
  }

  return response.json() as Promise<{
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  }>;
}

export async function runDeepSeekOcr(input: { fileDataUrl: string }) {
  const result = await siliconflowFetch({
    model: OCR_MODEL,
    temperature: 0.1,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: input.fileDataUrl,
            },
          },
          {
            type: "text",
            text: "<image>\n<|grounding|>Convert the document to markdown.",
          },
        ],
      },
    ],
  });

  return result.choices?.[0]?.message?.content?.trim() || "";
}

function extractJsonBlock(raw: string) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() || raw.trim();
}

export async function transformOcrToStudyNote(input: {
  rawOcrMarkdown: string;
  subjectName: string;
  notebookName: string;
  chapterTitle: string;
  outputFormat: OutputFormat;
  templatePreset: TemplatePresetId;
  templateInstruction: string;
}) {
  const result = await siliconflowFetch({
    model: TEXT_MODEL,
    temperature: 0.2,
    max_tokens: 5000,
    messages: [
      {
        role: "system",
        content:
          "你是一个课堂笔记整理助手。你会把 OCR 草稿整理成高质量的学习笔记，同时输出 Markdown 和思维导图树。只输出 JSON，不要附加解释。",
      },
      {
        role: "user",
        content: `请将以下 OCR 草稿整理为适合 ${input.subjectName} 学科的学习笔记。\n\n要求：\n1. 保留原始信息，不要胡编。\n2. 自动修正 OCR 中明显断行和错位。\n3. Markdown 要包含标题、核心知识点、易错点或复习提示。\n4. 生成思维导图树，节点简洁。\n5. preferredFormat 表示当前用户偏好，若为 mindmap，则导图层级更细；若为 markdown，则正文更完整。\n6. 严格参考模板偏好，但不要编造 OCR 中不存在的知识点。\n\n输出 JSON 结构必须是：\n{\n  "title": string,\n  "markdown": string,\n  "mindmapTree": { "title": string, "children": [] },\n  "mindmapMermaid": string\n}\n\n学科：${input.subjectName}\n笔记本：${input.notebookName}\n章节：${input.chapterTitle}\npreferredFormat：${input.outputFormat}\ntemplatePreset：${input.templatePreset}\ntemplateInstruction：${input.templateInstruction}\n\nOCR Markdown:\n${input.rawOcrMarkdown}`,
      },
    ],
  });

  const content = result.choices?.[0]?.message?.content?.trim() || "";
  const parsed = JSON.parse(extractJsonBlock(content)) as {
    title: string;
    markdown: string;
    mindmapTree: MindmapNode;
    mindmapMermaid: string;
  };

  return parsed;
}

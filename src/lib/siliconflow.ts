import type { MindmapNode, OutputFormat, TemplatePresetId } from "@/lib/types";

const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const OCR_MODEL = process.env.SILICONFLOW_OCR_MODEL || "deepseek-ai/DeepSeek-OCR";
const TEXT_MODEL = process.env.SILICONFLOW_TEXT_MODEL || "Pro/deepseek-ai/DeepSeek-V3.2";
const TEXT_MODEL_FALLBACKS = [TEXT_MODEL, "deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"];
const OCR_PRIMARY_PROMPT =
  "<image>\n Free OCR";
const OCR_FALLBACK_PROMPT = "<image>\n<|grounding|>Convert the document to markdown.";

function getApiKey() {
  const apiKey = process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    throw new Error("SILICONFLOW_API_KEY is not configured on the server.");
  }

  return apiKey;
}

async function siliconflowFetch(body: Record<string, unknown>) {
  const model = typeof body.model === "string" ? body.model : "unknown";
  console.info("[siliconflow] request", { model });

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
    console.error("[siliconflow] request failed", {
      model,
      status: response.status,
      detail,
    });
    if (response.status === 401) {
      throw new Error(
        "SiliconFlow API key 无效或已失效。请更新 .env.local 里的 SILICONFLOW_API_KEY，并重启 Next.js 服务。",
      );
    }
    throw new Error(`SiliconFlow request failed: ${response.status} ${detail}`);
  }

  console.info("[siliconflow] request succeeded", { model, status: response.status });

  return response.json() as Promise<{
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  }>;
}

function isRetryableSiliconflowError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /SiliconFlow request failed: 5\d\d/.test(error.message);
}

function extractAssistantText(result: {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}) {
  const content = result.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

async function requestOcr(fileDataUrl: string, prompt: string) {
  const result = await siliconflowFetch({
    model: OCR_MODEL,
    temperature: 0.1,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: fileDataUrl,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  return extractAssistantText(result);
}

export async function runDeepSeekOcr(input: { fileDataUrl: string }) {
  const primaryResult = await requestOcr(input.fileDataUrl, OCR_PRIMARY_PROMPT);
  if (primaryResult) {
    return primaryResult;
  }

  console.warn("[siliconflow] OCR primary prompt returned empty content; retrying fallback prompt");

  const fallbackResult = await requestOcr(input.fileDataUrl, OCR_FALLBACK_PROMPT);
  if (fallbackResult) {
    return fallbackResult;
  }

  throw new Error("OCR completed but returned empty content for both primary and fallback prompts.");
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
  const messages = [
    {
      role: "system",
      content:
        "你是一个课堂笔记整理助手。你会把 OCR 草稿整理成高质量的学习笔记，同时输出 Markdown 和思维导图树。只输出 JSON，不要附加解释。",
    },
    {
      role: "user",
      content: `请将以下 OCR 草稿整理为适合 ${input.subjectName} 学科的学习笔记。\n\n要求：\n1. 保留原始信息，不要胡编。\n2. 自动修正 OCR 中明显断行和错位。\n3. Markdown 要包含标题、核心知识点、易错点或复习提示。\n4. 生成思维导图树，节点简洁。\n5. preferredFormat 表示当前用户偏好，若为 mindmap，则导图层级更细；若为 markdown，则正文更完整。\n6. 严格参考模板偏好，但不要编造 OCR 中不存在的知识点。\n7. "mindmapMermaid" 必须优先使用 Mermaid 的 "mindmap" 语法，整体视觉要横向扩散，避免自上而下的分层图。\n8. 如果确实无法使用 "mindmap" 语法，才允许使用 "flowchart LR" 作为降级方案；禁止输出 "graph TD"、"graph TB"、"flowchart TD"、"flowchart TB"。\n9. Mermaid 节点文案保持简洁，尽量减少交叉和拥挤。\n\n输出 JSON 结构必须是：\n{\n  "title": string,\n  "markdown": string,\n  "mindmapTree": { "title": string, "children": [] },\n  "mindmapMermaid": string\n}\n\n学科：${input.subjectName}\n笔记本：${input.notebookName}\n章节：${input.chapterTitle}\npreferredFormat：${input.outputFormat}\ntemplatePreset：${input.templatePreset}\ntemplateInstruction：${input.templateInstruction}\n\nOCR Markdown:\n${input.rawOcrMarkdown}`,
    },
  ];

  let content = "";
  let lastError: Error | null = null;

  for (const model of TEXT_MODEL_FALLBACKS) {
    try {
      const result = await siliconflowFetch({
        model,
        temperature: 0.2,
        max_tokens: 5000,
        messages,
      });

      content = result.choices?.[0]?.message?.content?.trim() || "";
      console.info("[siliconflow] transform model selected", { model });
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown transform error");
      console.warn("[siliconflow] transform model failed", {
        model,
        message: lastError.message,
      });

      if (!isRetryableSiliconflowError(error)) {
        throw error;
      }
    }
  }

  if (!content) {
    throw lastError || new Error("SiliconFlow transform failed without a response.");
  }

  const parsed = JSON.parse(extractJsonBlock(content)) as {
    title: string;
    markdown: string;
    mindmapTree: MindmapNode;
    mindmapMermaid: string;
  };

  return parsed;
}

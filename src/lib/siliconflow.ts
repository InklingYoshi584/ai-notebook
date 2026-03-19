import type { MindmapNode, OutputFormat, TemplatePresetId } from "@/lib/types";

const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const OCR_MODEL = process.env.SILICONFLOW_OCR_MODEL || "Qwen/Qwen3.5-397B-A17B";
const VISION_SYSTEM_PROMPT =
  "你是一个课堂笔记整理助手。你要直接读取图片内容并整理成高质量学习笔记，同时输出 Markdown、原始提取稿和思维导图。只输出 JSON，不要附加解释。";

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

function extractJsonBlock(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) {
    return fenced[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }

  return raw.trim();
}

function parseStudyNotePayload(raw: string) {
  const jsonText = extractJsonBlock(raw);

  try {
    return JSON.parse(jsonText) as {
      title: string;
      rawOcrMarkdown?: string;
      markdown: string;
      mindmapTree: MindmapNode;
      mindmapMermaid: string;
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error";
    console.error("[siliconflow] failed to parse multimodal JSON", {
      message,
      preview: jsonText.slice(0, 500),
    });
    throw new Error("多模态模型返回了非 JSON 结果，请重试一次。若持续失败，需要继续收紧输出格式。");
  }
}

function sanitizeMermaidText(value: string) {
  return value
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, expr: string) => expr)
    .replace(/\$([^$]+)\$/g, (_, expr: string) => expr)
    .replace(/\\\((.*?)\\\)/g, (_, expr: string) => expr)
    .replace(/\\\[(.*?)\\\]/g, (_, expr: string) => expr)
    .replace(/\\(?:frac|sqrt|text|mathrm|mathbf|left|right|cdot|times|div|leq|geq|neq|approx|angle|triangle|parallel|perp|circ|sin|cos|tan|alpha|beta|gamma|theta|pi|lambda|mu|Delta|sum|int|pm|mp)\b/g, "")
    .replace(/[{}]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeMindmapMermaid(chart: string) {
  return chart
    .split("\n")
    .map((line) => {
      if (!line.trim() || /^\s*(mindmap|flowchart\s+LR|%%\{)/i.test(line)) {
        return line;
      }

      return sanitizeMermaidText(line);
    })
    .join("\n");
}

function buildMindmapMermaidFromTree(tree: MindmapNode) {
  const lines = ["mindmap"];

  function visit(node: MindmapNode, depth: number) {
    const indent = "  ".repeat(depth);
    const title = sanitizeMermaidText(node.title || "未命名节点") || "未命名节点";

    if (depth === 1) {
      lines.push(`${indent}root((${title}))`);
    } else {
      lines.push(`${indent}${title}`);
    }

    for (const child of node.children || []) {
      visit(child, depth + 1);
    }
  }

  visit(tree, 1);

  return lines.join("\n");
}

export async function generateStudyNoteFromImage(input: {
  fileDataUrl: string;
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
      content: VISION_SYSTEM_PROMPT,
    },
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
          text: `请直接阅读图片内容并一步完成提取和整理，生成适合 ${input.subjectName} 学科的学习笔记。不要先做 OCR 再总结，必须尽量覆盖图片中的全部有效内容。\n\n要求：\n1. 保留原始信息，不要胡编，不要只提标题。\n2. 尽量识别并保留正文、列表、表格、批注、公式、页眉页脚和手写内容。\n3. rawOcrMarkdown 字段写入尽可能完整的原始提取 Markdown；无法辨认处用 [unclear] 标记。\n4. markdown 字段输出整理后的学习笔记，自动修正明显断行和错位。\n5. preferredFormat 表示当前用户偏好，若为 mindmap，则导图层级更细；若为 markdown，则正文更完整。\n6. 严格参考模板偏好，但不要编造图片中不存在的知识点。\n7. mindmapMermaid 必须优先使用 Mermaid 的 mindmap 语法；如果确实无法使用，才允许使用 flowchart LR。\n8. Mermaid 节点只能使用纯文本，禁止 LaTeX、HTML 标签、Markdown 强调、表格语法和复杂公式块。公式请改写成普通文本，例如把 $S=ab$ 写成 S = ab。\n9. 禁止输出 graph TD、graph TB、flowchart TD、flowchart TB。\n10. 只输出 JSON，不要输出 Markdown 代码块说明，不要输出额外解释。\n\n输出 JSON 结构必须是：\n{\n  "title": string,\n  "rawOcrMarkdown": string,\n  "markdown": string,\n  "mindmapTree": { "title": string, "children": [] },\n  "mindmapMermaid": string\n}\n\n学科：${input.subjectName}\n笔记本：${input.notebookName}\n章节：${input.chapterTitle}\npreferredFormat：${input.outputFormat}\ntemplatePreset：${input.templatePreset}\ntemplateInstruction：${input.templateInstruction}`,
        },
      ],
    },
  ];

  let content = "";
  let lastError: Error | null = null;

  try {
    const result = await siliconflowFetch({
      model: OCR_MODEL,
      temperature: 0.2,
      max_tokens: 8000,
      messages,
    });

    content = extractAssistantText(result);
    console.info("[siliconflow] vision model selected", { model: OCR_MODEL });
  } catch (error) {
    lastError = error instanceof Error ? error : new Error("Unknown vision transform error");
    console.warn("[siliconflow] vision model failed", {
      model: OCR_MODEL,
      message: lastError.message,
    });

    if (!isRetryableSiliconflowError(error)) {
      throw error;
    }
  }

  if (!content) {
    throw lastError || new Error("SiliconFlow vision transform failed without a response.");
  }

  const parsed = parseStudyNotePayload(content);

  return {
    title: parsed.title,
    rawOcrMarkdown: parsed.rawOcrMarkdown || parsed.markdown,
    markdown: parsed.markdown,
    mindmapTree: parsed.mindmapTree,
    mindmapMermaid: parsed.mindmapTree
      ? buildMindmapMermaidFromTree(parsed.mindmapTree)
      : sanitizeMindmapMermaid(parsed.mindmapMermaid),
  };
}

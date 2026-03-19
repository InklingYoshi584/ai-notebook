"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

let mermaidLoader: Promise<typeof import("mermaid")> | undefined;

function normalizeMindmapChart(chart: string) {
  const trimmed = chart.trim();

  const withHorizontalFlowchart = (value: string) =>
    `%%{init: { "flowchart": { "nodeSpacing": 70, "rankSpacing": 120, "curve": "bumpX", "padding": 18 } }}%%\n${value}`;

  if (/^graph\s+TD\b/i.test(trimmed)) {
    return withHorizontalFlowchart(trimmed.replace(/^graph\s+TD\b/i, "flowchart LR"));
  }

  if (/^graph\s+TB\b/i.test(trimmed)) {
    return withHorizontalFlowchart(trimmed.replace(/^graph\s+TB\b/i, "flowchart LR"));
  }

  if (/^flowchart\s+TD\b/i.test(trimmed)) {
    return withHorizontalFlowchart(trimmed.replace(/^flowchart\s+TD\b/i, "flowchart LR"));
  }

  if (/^flowchart\s+TB\b/i.test(trimmed)) {
    return withHorizontalFlowchart(trimmed.replace(/^flowchart\s+TB\b/i, "flowchart LR"));
  }

  if (/^flowchart\s+LR\b/i.test(trimmed)) {
    return withHorizontalFlowchart(trimmed);
  }

  return trimmed;
}

async function getMermaid() {
  if (!mermaidLoader) {
    mermaidLoader = import("mermaid");
  }

  const mermaidModule = await mermaidLoader;
  const mermaid = mermaidModule.default;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    mindmap: {
      padding: 18,
      maxNodeWidth: 240,
    },
    flowchart: {
      nodeSpacing: 70,
      rankSpacing: 120,
      curve: "bumpX",
      padding: 18,
    },
    themeVariables: {
      background: "#fbf7ef",
      primaryColor: "#0f766e",
      primaryTextColor: "#fffdf7",
      primaryBorderColor: "#0b5b56",
      secondaryColor: "#fff5df",
      secondaryTextColor: "#5e3a24",
      secondaryBorderColor: "#e6c79f",
      tertiaryColor: "#eef7f4",
      tertiaryTextColor: "#22424a",
      tertiaryBorderColor: "#bfdad2",
      fontFamily: "Georgia, Times New Roman, serif",
      lineColor: "#8aa5a1",
      edgeLabelBackground: "#fbf7ef",
    },
  });

  return mermaid;
}

export function MermaidPreview({ chart }: { chart?: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const reactId = useId();
  const diagramId = useMemo(() => `mermaid-${reactId.replace(/[:]/g, "")}`, [reactId]);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      if (!chart?.trim()) {
        setSvg("");
        setError("");
        return;
      }

      try {
        const mermaid = await getMermaid();
        const { svg: renderedSvg } = await mermaid.render(diagramId, normalizeMindmapChart(chart));

        if (!cancelled) {
          setSvg(renderedSvg);
          setError("");
        }
      } catch (renderError) {
        if (!cancelled) {
          setSvg("");
          setError(renderError instanceof Error ? renderError.message : "Mermaid render failed.");
        }
      }
    }

    renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId]);

  if (!chart?.trim()) {
    return <p className="text-sm text-slate-500">这个章节还没有思维导图内容。</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
        Mermaid 渲染失败：{error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm text-slate-500">
        正在生成思维导图预览...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.9rem] border border-[rgba(152,123,92,0.18)] bg-[radial-gradient(circle_at_top,rgba(217,167,94,0.15),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.12),transparent_28%),linear-gradient(180deg,rgba(255,252,247,0.98),rgba(247,242,232,0.96))] shadow-[0_24px_70px_rgba(102,72,45,0.14)]">
      <TransformWrapper minScale={0.5} initialScale={0.9} centerOnInit limitToBounds={false} wheel={{ step: 0.1 }} pinch={{ step: 5 }} doubleClick={{ disabled: true }}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="flex flex-col">
            <div className="flex flex-col gap-3 border-b border-[rgba(152,123,92,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,248,237,0.65))] px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-[rgba(89,67,49,0.62)] uppercase">XMind Inspired</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="rounded-full border border-[rgba(152,123,92,0.16)] bg-white/75 px-3 py-1 text-[13px] font-medium text-slate-700">拖动画布浏览分支</span>
                  <span className="rounded-full border border-[rgba(15,118,110,0.16)] bg-[rgba(236,247,243,0.82)] px-3 py-1 text-[13px] font-medium text-teal-800">更接近 XMind 的卡片风格</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button type="button" onClick={() => zoomOut()} className="rounded-full border border-[rgba(152,123,92,0.18)] bg-white/80 px-3 py-1.5 text-slate-700 transition hover:border-[rgba(152,123,92,0.28)] hover:bg-white">
                  缩小
                </button>
                <button type="button" onClick={() => resetTransform()} className="rounded-full border border-[rgba(152,123,92,0.18)] bg-white/80 px-3 py-1.5 text-slate-700 transition hover:border-[rgba(152,123,92,0.28)] hover:bg-white">
                  重置
                </button>
                <button type="button" onClick={() => zoomIn()} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-teal-800 transition hover:border-teal-300 hover:bg-teal-100">
                  放大
                </button>
              </div>
            </div>
            <div className="h-[460px] overflow-hidden bg-[linear-gradient(180deg,rgba(255,250,243,0.78),rgba(245,240,231,0.48))] sm:h-[560px]">
              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                <div className="mermaid-diagram xmind-like-diagram flex min-h-full min-w-full items-center justify-center p-8 sm:p-12" dangerouslySetInnerHTML={{ __html: svg }} />
              </TransformComponent>
            </div>
          </div>
        )}
      </TransformWrapper>
    </div>
  );
}

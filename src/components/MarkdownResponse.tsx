"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownResponseProps = {
  content: string;
};

export function MarkdownResponse({ content }: MarkdownResponseProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-4 text-2xl font-bold text-zinc-900">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-3 mt-6 text-xl font-bold text-zinc-900">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-5 text-lg font-bold text-zinc-900">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 leading-relaxed text-zinc-700 last:mb-0">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 ml-5 list-disc space-y-1 text-zinc-700">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 ml-5 list-decimal space-y-1 text-zinc-700">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-bold text-zinc-900">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-zinc-700">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-sm text-red-700">
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
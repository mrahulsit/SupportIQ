import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders model output as markdown. Raw HTML in the output is NOT rendered
 * (react-markdown escapes it by default), which keeps replies XSS-safe.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="siq-md space-y-2 break-words text-[14px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          code: ({ children }) => <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[12.5px]">{children}</code>,
          pre: ({ children }) => <pre className="overflow-x-auto rounded-lg bg-black/5 p-2">{children}</pre>,
          h1: ({ children }) => <p className="font-semibold">{children}</p>,
          h2: ({ children }) => <p className="font-semibold">{children}</p>,
          h3: ({ children }) => <p className="font-semibold">{children}</p>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

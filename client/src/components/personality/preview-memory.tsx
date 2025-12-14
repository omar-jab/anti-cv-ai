import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  memory: string | null;
}

function normalizeMarkdown(markdown: string) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");

  while (lines.length > 0 && lines[0]?.trim() === "") lines.shift();
  while (lines.length > 0 && lines.at(-1)?.trim() === "") lines.pop();

  const nonEmpty = lines.filter((line) => line.trim() !== "");
  if (nonEmpty.length === 0) return "";

  const minIndent = Math.min(
    ...nonEmpty.map((line) => (line.match(/^[ \t]*/)?.[0] ?? "").length),
  );

  if (minIndent < 4) return lines.join("\n");
  return lines.map((line) => line.slice(minIndent)).join("\n");
}

export default function PreviewMemory({ memory }: Props) {
  if (memory == null) {
    return <p>No memory atm</p>;
  }

  const normalizedMemory = normalizeMarkdown(memory);

  return (
    <div className="px-4 py-3 text-sm">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            void node;
            return <a className="underline underline-offset-2" {...props} />;
          },
          h1: ({ node, ...props }) => {
            void node;
            return (
              <h1 className="text-xl font-semibold tracking-tight" {...props} />
            );
          },
          h2: ({ node, ...props }) => {
            void node;
            return (
              <h2 className="text-lg font-semibold tracking-tight" {...props} />
            );
          },
          h3: ({ node, ...props }) => {
            void node;
            return (
              <h3
                className="text-base font-semibold tracking-tight"
                {...props}
              />
            );
          },
          p: ({ node, ...props }) => {
            void node;
            return <p className="leading-6" {...props} />;
          },
          ul: ({ node, ...props }) => {
            void node;
            return <ul className="list-disc pl-5" {...props} />;
          },
          ol: ({ node, ...props }) => {
            void node;
            return <ol className="list-decimal pl-5" {...props} />;
          },
          pre: ({ node, ...props }) => {
            void node;
            return (
              <pre
                className="my-2 overflow-x-auto rounded-md bg-white p-3 text-xs"
                {...props}
              />
            );
          },
          code: ({ node, className, ...props }) => {
            void node;
            const isInline = !className;

            return isInline ? (
              <code
                className="rounded bg-white px-1 py-0.5 font-mono text-xs"
                {...props}
              />
            ) : (
              <code className={className} {...props} />
            );
          },
        }}
      >
        {normalizedMemory}
      </Markdown>
    </div>
  );
}

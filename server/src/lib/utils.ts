import type { UserMemoryItem } from "../types";

export function compactOneLine(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

export function buildUserMemoriesBlock(memories: UserMemoryItem[]) {
  const lines: string[] = [];

  for (const memory of memories) {
    const title = compactOneLine(`${memory.section}/${memory.title}`);
    const content = compactOneLine(memory.content);
    if (!title || !content) continue;
    lines.push(`${title}: ${content}`);
  }

  return `<user_memories>\n${lines.join("\n")}\n</user_memories>`;
}

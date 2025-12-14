export type ConversationSessionResponse = {
  session_id: string;
  handle: string;
  personality: {
    id: string;
    version: number;
    updatedAt: string | null;
  };
};

async function parseErrorMessage(res: Response) {
  const text = await res.text().catch(() => "");
  return text || `Request failed (${res.status})`;
}

export async function createConversationSession(handle: string) {
  const res = await fetch("/api/conversation/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  const data = (await res.json()) as Partial<ConversationSessionResponse>;
  if (typeof data?.session_id !== "string" || !data.session_id) {
    throw new Error("Invalid response");
  }
  if (typeof data?.handle !== "string" || !data.handle) {
    throw new Error("Invalid response");
  }
  if (
    typeof data?.personality?.id !== "string" ||
    typeof data?.personality?.version !== "number"
  ) {
    throw new Error("Invalid response");
  }

  return data as ConversationSessionResponse;
}

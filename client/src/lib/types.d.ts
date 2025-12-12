interface MessageType {
  key: string;
  from: "user" | "assistant";
  versions?: { id: string; content: string }[];
  content?: string;
  attachments?: {
    type: "file";
    url: string;
    mediaType?: string;
    filename?: string;
  }[];
}

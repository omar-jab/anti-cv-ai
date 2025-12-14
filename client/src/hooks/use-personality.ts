import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

export type UserPersonality = {
  id: string;
  content: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
  analysis?: unknown;
};

export type UserPersonalityVersion = {
  id: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
};

async function fetchLatestPersonality(getToken: () => Promise<string | null>) {
  const token = await getToken();

  const res = await fetch("/api/personality", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { personality?: unknown };
  if (data.personality === null) return null;
  if (!data?.personality || typeof data.personality !== "object") {
    throw new Error("Invalid response");
  }

  return data.personality as UserPersonality;
}

async function fetchPersonalityVersions(params: {
  getToken: () => Promise<string | null>;
  limit?: number;
}) {
  const token = await params.getToken();
  const limit = params.limit ?? 50;

  const res = await fetch(`/api/personality/versions?limit=${limit}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { personalities?: unknown };
  if (!Array.isArray(data?.personalities)) {
    throw new Error("Invalid response");
  }

  return data.personalities as UserPersonalityVersion[];
}

async function fetchPersonalityVersionById(params: {
  id: string;
  getToken: () => Promise<string | null>;
}) {
  const token = await params.getToken();

  const res = await fetch(`/api/personality/versions/${params.id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { personality?: unknown };
  if (!data?.personality || typeof data.personality !== "object") {
    throw new Error("Invalid response");
  }

  return data.personality as UserPersonality;
}

export function useLatestPersonality() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();

  const query = useQuery<UserPersonality | null, Error>({
    queryKey: ["personality", userId],
    enabled: isLoaded && isSignedIn,
    queryFn: () => fetchLatestPersonality(getToken),
  });

  return {
    isLoaded,
    isSignedIn,
    userId,
    personality: query.data ?? null,
    query,
  };
}

export function usePersonalityVersions(limit = 50) {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();

  const query = useQuery<UserPersonalityVersion[], Error>({
    queryKey: ["personality-versions", userId, limit],
    enabled: isLoaded && isSignedIn,
    queryFn: () => fetchPersonalityVersions({ getToken, limit }),
  });

  return {
    isLoaded,
    isSignedIn,
    userId,
    versions: query.data ?? [],
    query,
  };
}

export function usePersonalityVersion(id: string | null, enabled = true) {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();

  const query = useQuery<UserPersonality, Error>({
    queryKey: ["personality-version", userId, id],
    enabled: enabled && isLoaded && isSignedIn && !!id,
    queryFn: () => fetchPersonalityVersionById({ id: id!, getToken }),
  });

  return {
    isLoaded,
    isSignedIn,
    userId,
    personality: query.data ?? null,
    query,
  };
}

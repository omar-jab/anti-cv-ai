import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router";
import type { CVSchema } from "@/components/chat/profile/cv";

export type PublicUserData = {
  user: {
    id: string;
    handle: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    imageUrl: string | null;
  };
  cv: CVSchema | null;
};

function normalizeHandle(input: string | null | undefined) {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  const withoutAt = raw.startsWith("@") ? raw.slice(1) : raw;
  const handle = withoutAt.trim().toLowerCase();
  if (!handle) return null;

  if (handle.length < 3 || handle.length > 30) return null;
  if (!/^[a-z0-9._]+$/.test(handle)) return null;
  if (handle.startsWith(".") || handle.endsWith(".")) return null;
  if (handle.includes("..")) return null;

  return handle;
}

async function fetchPublicUserData(handle: string): Promise<PublicUserData> {
  const res = await fetch(`/api/public/users/${encodeURIComponent(handle)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("User not found");
    }
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as PublicUserData;
  return data;
}

export function usePublicUser(options?: { handle?: string | null }) {
  const params = useParams();
  const inputHandle = options?.handle ?? params.user_handle;
  const handle = useMemo(() => normalizeHandle(inputHandle), [inputHandle]);
  const validationError = useMemo(() => {
    const raw = (inputHandle ?? "").trim();
    if (!raw) return null;
    return handle ? null : "Handle non valido";
  }, [handle, inputHandle]);

  const query = useQuery<PublicUserData, Error>({
    queryKey: ["public-user", handle],
    enabled: !!handle,
    queryFn: () => fetchPublicUserData(handle!),
    staleTime: 60_000,
  });

  return {
    inputHandle: inputHandle ?? null,
    handle,
    isValid: !!handle,
    validationError,
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    query,
  };
}

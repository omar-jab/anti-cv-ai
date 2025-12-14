/**
 * Custom Hook per recuperare un utente dato un suo id o identificativo dall'url
 *
 * Qualcosa come @{user} -> @omarjab
 *
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router";

export type HandleCheckResponse = {
  handle: string;
  exists: boolean;
  available: boolean;
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

async function fetchHandleCheck(handle: string) {
  const res = await fetch(`/api/users/handle/${encodeURIComponent(handle)}`);
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { handle?: unknown; exists?: unknown };
  if (typeof data?.handle !== "string") {
    throw new Error("Invalid response");
  }

  return data as HandleCheckResponse;
}

export function useUser(options?: { handle?: string | null }) {
  const params = useParams();
  const inputHandle = options?.handle ?? params.user_handle;
  const handle = useMemo(() => normalizeHandle(inputHandle), [inputHandle]);
  const validationError = useMemo(() => {
    const raw = (inputHandle ?? "").trim();
    if (!raw) return null;
    return handle ? null : "Handle non valido";
  }, [handle, inputHandle]);

  const query = useQuery<HandleCheckResponse, Error>({
    queryKey: ["user-handle-check", handle],
    enabled: !!handle,
    queryFn: () => fetchHandleCheck(handle!),
    staleTime: 60_000,
  });

  return {
    inputHandle: inputHandle ?? null,
    handle,
    isValid: !!handle,
    validationError,
    exists: query.data?.exists ?? null,
    available: query.data?.available ?? null,
    query,
  };
}

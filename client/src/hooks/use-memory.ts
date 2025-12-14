import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export type UserMemoryItem = {
    id: string;
    section: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};

async function fetchMemories(getToken: () => Promise<string | null>) {
    const token = await getToken();

    const res = await fetch(getApiUrl("/api/memories"), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Request failed (${res.status})`);
    }

    const data = (await res.json()) as { memories?: unknown };
    if (!Array.isArray(data?.memories)) {
        throw new Error("Invalid response");
    }

    return data.memories as UserMemoryItem[];
}

export function useMemory() {
    const { isLoaded, isSignedIn, getToken, userId } = useAuth();

    const query = useQuery<UserMemoryItem[], Error>({
        queryKey: ["memories", userId],
        enabled: isLoaded && isSignedIn,
        queryFn: () => fetchMemories(getToken),
    });

    return {
        isLoaded,
        isSignedIn,
        userId,
        memories: query.data ?? [],
        query,
    };
}

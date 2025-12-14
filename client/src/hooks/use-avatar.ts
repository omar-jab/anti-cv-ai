import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type UserAvatar = {
  id: string;
  groupId: string;
  avatarId: string;
  name: string | null;
  status: string | null;
  trainingStatus: string | null;
  trainingError: string | null;
  imageUrl: string | null;
  motionPreviewUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function isUserAvatar(value: unknown): value is UserAvatar {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function fetchAvatar(getToken: () => Promise<string | null>) {
  const token = await getToken();

  const res = await fetch("/api/avatar", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { avatar?: unknown };
  if (data.avatar === null) return null;
  if (!isUserAvatar(data.avatar)) {
    throw new Error("Invalid response");
  }

  return data.avatar;
}

async function createAvatar(params: {
  getToken: () => Promise<string | null>;
  name?: string;
  files: File[];
}) {
  const token = await params.getToken();

  const formData = new FormData();
  if (params.name?.trim()) {
    formData.append("name", params.name.trim());
  }
  for (const file of params.files) {
    formData.append("photos", file);
  }

  const res = await fetch("/api/avatar", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { avatar?: unknown };
  if (!isUserAvatar(data.avatar)) {
    throw new Error("Invalid response");
  }

  return data.avatar;
}

export function useAvatar() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<UserAvatar | null, Error>({
    queryKey: ["avatar", userId],
    enabled: isLoaded && isSignedIn,
    queryFn: () => fetchAvatar(getToken),
    refetchInterval: (q) => {
      const avatar = q.state.data;
      if (!avatar) return false;
      const isPending =
        avatar.status === "pending" || avatar.trainingStatus === "pending";
      return isPending ? 3000 : false;
    },
  });

  const createMutation = useMutation<UserAvatar, Error, { name?: string; files: File[] }>({
    mutationFn: (vars) => createAvatar({ getToken, ...vars }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["avatar", userId] });
    },
  });

  return {
    isLoaded,
    isSignedIn,
    userId,
    avatar: query.data ?? null,
    query,
    create: createMutation.mutate,
    createMutation,
  };
}

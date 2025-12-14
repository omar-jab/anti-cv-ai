import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export type PersonalityJobStatus = "queued" | "running" | "succeeded" | "failed";

export type PersonalityJob = {
  id: string;
  status: PersonalityJobStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
};

async function startPersonalityJob(getToken: () => Promise<string | null>) {
  const token = await getToken();

  const res = await fetch("/api/personality/jobs", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { job?: unknown };
  if (!data?.job || typeof data.job !== "object") {
    throw new Error("Invalid response");
  }

  return data.job as PersonalityJob;
}

async function fetchPersonalityJob(params: {
  jobId: string;
  getToken: () => Promise<string | null>;
}) {
  const token = await params.getToken();

  const res = await fetch(`/api/personality/jobs/${params.jobId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }

  const data = (await res.json()) as { job?: unknown };
  if (!data?.job || typeof data.job !== "object") {
    throw new Error("Invalid response");
  }

  return data.job as PersonalityJob;
}

export function usePersonalityJob() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);

  const startMutation = useMutation<PersonalityJob, Error>({
    mutationFn: () => startPersonalityJob(getToken),
    onSuccess: (job) => {
      setJobId(job.id);
    },
  });

  const jobQuery = useQuery<PersonalityJob, Error>({
    queryKey: ["personality-job", userId, jobId],
    enabled: isLoaded && isSignedIn && !!jobId,
    queryFn: () => fetchPersonalityJob({ jobId: jobId!, getToken }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
  });

  const job = jobQuery.data ?? startMutation.data ?? null;

  const isRunning = useMemo(() => {
    const status = job?.status;
    return (
      startMutation.isPending || status === "queued" || status === "running"
    );
  }, [job?.status, startMutation.isPending]);

  useEffect(() => {
    if (!job || !userId) return;
    if (job.status !== "succeeded") return;

    void queryClient.invalidateQueries({ queryKey: ["personality", userId] });
    void queryClient.invalidateQueries({ queryKey: ["personality-versions", userId] });
  }, [job, queryClient, userId]);

  return {
    isLoaded,
    isSignedIn,
    userId,
    job,
    jobId,
    isRunning,
    start: () => startMutation.mutate(),
    startMutation,
    jobQuery,
  };
}

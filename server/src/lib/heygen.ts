type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function extractMessage(json: unknown) {
  if (!isRecord(json)) return null;
  return (
    getOptionalString(json.message) ??
    getOptionalString(json.msg) ??
    getOptionalString(json.error)
  );
}

export function getHeyGenApiKey() {
  const apiKey = Bun.env.HEYGEN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing HEYGEN_API_KEY");
  }

  return apiKey;
}

export async function uploadAsset(params: {
  apiKey: string;
  contentType: string;
  bytes: Uint8Array;
}) {
  const res = await fetch("https://upload.heygen.com/v1/asset", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-API-KEY": params.apiKey,
      "Content-Type": params.contentType,
    },
    body: params.bytes,
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractMessage(json) ?? `HeyGen Upload Asset failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error("HeyGen Upload Asset: invalid JSON response");
  }

  const code = getOptionalNumber(json.code);
  if (code !== 100) {
    throw new Error(
      extractMessage(json) ??
        `HeyGen Upload Asset failed (code ${code ?? "?"})`,
    );
  }

  const data = isRecord(json.data) ? json.data : null;
  const assetId = getOptionalString(data?.id);
  const url = getOptionalString(data?.url);
  const imageKey = getOptionalString(data?.image_key);

  if (!assetId || !url || !imageKey) {
    throw new Error("HeyGen Upload Asset: missing required fields");
  }

  return { assetId, url, imageKey };
}

export async function createPhotoAvatarGroup(params: {
  apiKey: string;
  name: string;
  imageKey: string;
  generationId?: string;
}) {
  const body: Record<string, unknown> = {
    name: params.name,
    image_key: params.imageKey,
  };

  if (params.generationId) {
    body.generation_id = params.generationId;
  }

  const res = await fetch(
    "https://api.heygen.com/v2/photo_avatar/avatar_group/create",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": params.apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractMessage(json) ??
        `HeyGen Create Photo Avatar Group failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error("HeyGen Create Photo Avatar Group: invalid JSON response");
  }

  const error = getOptionalString(json.error);
  if (error) {
    throw new Error(error);
  }

  const data = isRecord(json.data) ? json.data : null;
  const id = getOptionalString(data?.id);
  const groupId = getOptionalString(data?.group_id);
  const name = getOptionalString(data?.name);
  const status = getOptionalString(data?.status);
  const imageUrl = getOptionalString(data?.image_url);
  const motionPreviewUrl = getOptionalString(data?.motion_preview_url);

  if (!id || !groupId) {
    throw new Error(
      "HeyGen Create Photo Avatar Group: missing required fields",
    );
  }

  return {
    id,
    groupId,
    name,
    status,
    imageUrl,
    motionPreviewUrl,
  };
}

export async function addLooksToPhotoAvatarGroup(params: {
  apiKey: string;
  groupId: string;
  imageKeys: string[];
  name: string;
  generationId?: string;
}) {
  const body: Record<string, unknown> = {
    group_id: params.groupId,
    image_keys: params.imageKeys,
    name: params.name,
  };

  if (params.generationId) {
    body.generation_id = params.generationId;
  }

  const res = await fetch(
    "https://api.heygen.com/v2/photo_avatar/avatar_group/add",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": params.apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractMessage(json) ??
        `HeyGen Add Looks to Photo Avatar Group failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error(
      "HeyGen Add Looks to Photo Avatar Group: invalid JSON response",
    );
  }

  const error = getOptionalString(json.error);
  if (error) {
    throw new Error(error);
  }

  const data = isRecord(json.data) ? json.data : null;
  const list = Array.isArray(data?.photo_avatar_list)
    ? data?.photo_avatar_list
    : null;
  if (!list) {
    throw new Error(
      "HeyGen Add Looks to Photo Avatar Group: missing photo_avatar_list",
    );
  }

  return list
    .map((item) => {
      if (!isRecord(item)) return null;
      const id = getOptionalString(item.id);
      const groupId = getOptionalString(item.group_id);
      const name = getOptionalString(item.name);
      const status = getOptionalString(item.status);
      const imageUrl = getOptionalString(item.image_url);
      const motionPreviewUrl = getOptionalString(item.motion_preview_url);
      if (!id || !groupId) return null;
      return { id, groupId, name, status, imageUrl, motionPreviewUrl };
    })
    .filter((value): value is NonNullable<typeof value> => !!value);
}

export async function trainPhotoAvatarGroup(params: {
  apiKey: string;
  groupId: string;
}) {
  const res = await fetch("https://api.heygen.com/v2/photo_avatar/train", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
    },
    body: JSON.stringify({ group_id: params.groupId }),
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractMessage(json) ??
        `HeyGen Train Photo Avatar Group failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error("HeyGen Train Photo Avatar Group: invalid JSON response");
  }

  const error = getOptionalString(json.error);
  if (error) {
    throw new Error(error);
  }

  const data = isRecord(json.data) ? json.data : null;
  const inner = data && isRecord(data.data) ? data.data : null;
  const flowId = getOptionalString(inner?.flow_id);

  return { flowId };
}

export async function getTrainingJobStatus(params: {
  apiKey: string;
  groupId: string;
}) {
  const res = await fetch(
    `https://api.heygen.com/v2/photo_avatar/train/status/${params.groupId}`,
    {
      headers: {
        Accept: "application/json",
        "x-api-key": params.apiKey,
      },
    },
  );

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractMessage(json) ??
        `HeyGen Get Training Job Status failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error("HeyGen Get Training Job Status: invalid JSON response");
  }

  const error = getOptionalString(json.error);
  if (error) {
    throw new Error(error);
  }

  const data = isRecord(json.data) ? json.data : null;
  const status = getOptionalString(data?.status);
  const errorMsg = getOptionalString(data?.error_msg);
  const createdAt = getOptionalNumber(data?.created_at);
  const updatedAt = getOptionalNumber(data?.updated_at);

  return { status, errorMsg, createdAt, updatedAt };
}

export async function getPhotoAvatarDetails(params: {
  apiKey: string;
  id: string;
}) {
  const res = await fetch(
    `https://api.heygen.com/v2/photo_avatar/${params.id}`,
    {
      headers: {
        Accept: "application/json",
        "x-api-key": params.apiKey,
      },
    },
  );

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractMessage(json) ??
        `HeyGen Photo Avatar Details failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error("HeyGen Photo Avatar Details: invalid JSON response");
  }

  const error = getOptionalString(json.error);
  if (error) {
    throw new Error(error);
  }

  const data = isRecord(json.data) ? json.data : null;
  const id = getOptionalString(data?.id);
  const groupId = getOptionalString(data?.group_id);
  const name = getOptionalString(data?.name);
  const status = getOptionalString(data?.status);
  const imageUrl = getOptionalString(data?.image_url);
  const motionPreviewUrl = getOptionalString(data?.motion_preview_url);

  if (!id) {
    throw new Error("HeyGen Photo Avatar Details: missing required fields");
  }

  return { id, groupId, name, status, imageUrl, motionPreviewUrl };
}

export async function createStreamingSessionToken(params: { apiKey: string }) {
  const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
    },
    body: "{}",
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractMessage(json) ??
        `HeyGen Create Session Token failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error("HeyGen Create Session Token: invalid JSON response");
  }

  const data = isRecord(json.data) ? json.data : null;
  const token = getOptionalString(data?.token);
  if (!token) {
    throw new Error("HeyGen Create Session Token: missing data.token");
  }

  return { token };
}

export type StreamingAvatarListItem = {
  avatarId: string;
  poseName: string | null;
  status: string | null;
  normalPreviewUrl: string | null;
  defaultVoiceId: string | null;
  isPublic: boolean | null;
  createdAt: number | null;
};

export async function listStreamingAvatars(params: { apiKey: string }) {
  const res = await fetch("https://api.heygen.com/v1/streaming/avatar.list", {
    headers: {
      Accept: "application/json",
      "x-api-key": params.apiKey,
    },
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractMessage(json) ??
        `HeyGen List Streaming Avatars failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error("HeyGen List Streaming Avatars: invalid JSON response");
  }

  const code = getOptionalNumber(json.code);
  const message = getOptionalString(json.message);
  const data = Array.isArray(json.data) ? json.data : [];

  const avatars = data
    .map((item) => {
      if (!isRecord(item)) return null;
      const avatarId = getOptionalString(item.avatar_id);
      if (!avatarId) return null;

      return {
        avatarId,
        poseName: getOptionalString(item.pose_name),
        status: getOptionalString(item.status),
        normalPreviewUrl: getOptionalString(item.normal_preview),
        defaultVoiceId: getOptionalString(item.default_voice),
        isPublic: getOptionalBoolean(item.is_public),
        createdAt: getOptionalNumber(item.created_at),
      } satisfies StreamingAvatarListItem;
    })
    .filter((value): value is StreamingAvatarListItem => !!value);

  return { code, message, avatars };
}

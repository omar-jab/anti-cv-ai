import type { Context } from "hono";
import type { AppEnvWithAuth } from "../middleware/auth";
import {
  addLooksToPhotoAvatarGroup,
  createPhotoAvatarGroup,
  getHeyGenApiKey,
  getPhotoAvatarDetails,
  getTrainingJobStatus,
  trainPhotoAvatarGroup,
  uploadAsset,
} from "../lib/heygen";

type UserAvatarRow = {
  id: string;
  user_id: string;
  heygen_group_id: string;
  heygen_avatar_id: string;
  heygen_asset_id: string | null;
  heygen_image_key: string | null;
  name: string | null;
  status: string | null;
  training_status: string | null;
  training_error: string | null;
  image_url: string | null;
  motion_preview_url: string | null;
  created_at: number;
  updated_at: number;
};

function toIso(value: number | null) {
  return typeof value === "number" && value > 0
    ? new Date(value).toISOString()
    : null;
}

function pickFiles(formData: FormData) {
  const fields = ["photos", "photo", "images", "image"] as const;
  for (const field of fields) {
    const values = formData.getAll(field);
    const files = values.filter((v): v is File => v instanceof File);
    if (files.length > 0) return files;
  }
  return [];
}

function normalizeName(input: unknown) {
  if (typeof input !== "string") return "Avatar";
  const value = input.trim();
  if (!value) return "Avatar";
  return value.length > 80 ? value.slice(0, 80) : value;
}

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

function toApiAvatar(row: UserAvatarRow) {
  return {
    id: row.id,
    groupId: row.heygen_group_id,
    avatarId: row.heygen_avatar_id,
    name: row.name,
    status: row.status,
    trainingStatus: row.training_status,
    trainingError: row.training_error,
    imageUrl: row.image_url,
    motionPreviewUrl: row.motion_preview_url,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function CreateUserAvatar(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  let apiKey: string;
  try {
    apiKey = getHeyGenApiKey();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return context.json(
      { error: "HeyGen is not configured", details: message },
      500,
    );
  }

  const formData = await context.req.formData().catch(() => null);
  if (!formData) {
    return context.json({ error: "Invalid form data" }, 400);
  }

  const files = pickFiles(formData);
  if (files.length === 0) {
    return context.json({ error: "Missing photo" }, 400);
  }

  if (files.length > 4) {
    return context.json({ error: "Too many photos (max 4)" }, 400);
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return context.json({ error: "Unsupported file type" }, 400);
    }
    if (!file.size) {
      return context.json({ error: "Empty file" }, 400);
    }
  }

  const name = normalizeName(formData.get("name"));

  const uploads: Array<{ assetId: string; imageKey: string }> = [];
  let group: Awaited<ReturnType<typeof createPhotoAvatarGroup>>;
  let trainingStatus: string | null = null;
  let trainingError: string | null = null;

  try {
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const uploaded = await uploadAsset({
        apiKey,
        contentType: file.type,
        bytes,
      });
      uploads.push({ assetId: uploaded.assetId, imageKey: uploaded.imageKey });
    }

    group = await createPhotoAvatarGroup({
      apiKey,
      name,
      imageKey: uploads[0]!.imageKey,
    });

    for (let idx = 1; idx < uploads.length; idx += 1) {
      const suffix = idx + 1;
      try {
        await addLooksToPhotoAvatarGroup({
          apiKey,
          groupId: group.groupId,
          imageKeys: [uploads[idx]!.imageKey],
          name: `${name} ${suffix}`,
        });
      } catch {
        // Best-effort: group creation still succeeds with the first photo
      }
    }

    try {
      await trainPhotoAvatarGroup({ apiKey, groupId: group.groupId });
      const training = await getTrainingJobStatus({
        apiKey,
        groupId: group.groupId,
      });
      trainingStatus = training.status;
      trainingError = training.errorMsg;
    } catch (error) {
      trainingError = error instanceof Error ? error.message : String(error);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return context.json(
      { error: "Failed to create avatar", details: message },
      500,
    );
  }

  const db = context.get("db");
  const now = Date.now();
  const existing = db
    .query(
      `SELECT id, created_at
       FROM user_avatars
       WHERE user_id = ?
       LIMIT 1`,
    )
    .get(userId) as { id: string; created_at: number } | undefined;

  const id = existing?.id ?? crypto.randomUUID();
  const createdAt = existing?.created_at ?? now;

  if (existing) {
    db.query(
      `UPDATE user_avatars
       SET heygen_group_id = ?,
           heygen_avatar_id = ?,
           heygen_asset_id = ?,
           heygen_image_key = ?,
           name = ?,
           status = ?,
           training_status = ?,
           training_error = ?,
           image_url = ?,
           motion_preview_url = ?,
           updated_at = ?
       WHERE user_id = ?`,
    ).run(
      group.groupId,
      group.id,
      uploads[0]!.assetId,
      uploads[0]!.imageKey,
      group.name ?? name,
      group.status,
      trainingStatus,
      trainingError,
      group.imageUrl,
      group.motionPreviewUrl,
      now,
      userId,
    );
  } else {
    db.query(
      `INSERT INTO user_avatars (
         id, user_id, heygen_group_id, heygen_avatar_id,
         heygen_asset_id, heygen_image_key,
         name, status, training_status, training_error,
         image_url, motion_preview_url,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      userId,
      group.groupId,
      group.id,
      uploads[0]!.assetId,
      uploads[0]!.imageKey,
      group.name ?? name,
      group.status,
      trainingStatus,
      trainingError,
      group.imageUrl,
      group.motionPreviewUrl,
      createdAt,
      now,
    );
  }

  const row = db
    .query(
      `SELECT
        id, user_id, heygen_group_id, heygen_avatar_id,
        heygen_asset_id, heygen_image_key, name, status,
        training_status, training_error, image_url, motion_preview_url,
        created_at, updated_at
       FROM user_avatars
       WHERE user_id = ?
       LIMIT 1`,
    )
    .get(userId) as UserAvatarRow | undefined;

  return context.json(
    {
      avatar: row
        ? toApiAvatar(row)
        : {
            id,
            groupId: group.groupId,
            avatarId: group.id,
            name: group.name ?? name,
            status: group.status,
            trainingStatus,
            trainingError,
            imageUrl: group.imageUrl,
            motionPreviewUrl: group.motionPreviewUrl,
            createdAt: toIso(createdAt),
            updatedAt: toIso(now),
          },
    },
    201,
  );
}

export async function GetUserAvatar(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const db = context.get("db");
  const row = db
    .query(
      `SELECT
        id, user_id, heygen_group_id, heygen_avatar_id,
        heygen_asset_id, heygen_image_key, name, status,
        training_status, training_error, image_url, motion_preview_url,
        created_at, updated_at
       FROM user_avatars
       WHERE user_id = ?
       LIMIT 1`,
    )
    .get(userId) as UserAvatarRow | undefined;

  if (!row) {
    return context.json({ avatar: null });
  }

  let apiKey: string;
  try {
    apiKey = getHeyGenApiKey();
  } catch {
    return context.json({ avatar: toApiAvatar(row) });
  }

  const now = Date.now();
  let updated = false;
  let next = { ...row };

  try {
    const details = await getPhotoAvatarDetails({
      apiKey,
      id: row.heygen_avatar_id,
    });
    next = {
      ...next,
      status: details.status ?? next.status,
      name: details.name ?? next.name,
      image_url: details.imageUrl ?? next.image_url,
      motion_preview_url: details.motionPreviewUrl ?? next.motion_preview_url,
    };
    updated = true;
  } catch {
    // Best-effort: keep cached DB values
  }

  try {
    const training = await getTrainingJobStatus({
      apiKey,
      groupId: row.heygen_group_id,
    });
    next = {
      ...next,
      training_status: training.status ?? next.training_status,
      training_error: training.status ? training.errorMsg : next.training_error,
    };
    updated = true;
  } catch {
    // Best-effort: keep cached DB values
  }

  if (updated) {
    db.query(
      `UPDATE user_avatars
       SET name = ?,
           status = ?,
           training_status = ?,
           training_error = ?,
           image_url = ?,
           motion_preview_url = ?,
           updated_at = ?
       WHERE user_id = ?`,
    ).run(
      next.name,
      next.status,
      next.training_status,
      next.training_error,
      next.image_url,
      next.motion_preview_url,
      now,
      userId,
    );
    next.updated_at = now;
  }

  return context.json({ avatar: toApiAvatar(next) });
}

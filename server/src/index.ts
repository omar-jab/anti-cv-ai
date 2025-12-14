import { Hono } from "hono";
import { ChatPersonalityBuilder } from "./controllers/chat-personality-builder";
import { PersonaChat, PersonaChatSession } from "./controllers/chat-persona";
import { ChatSession } from "./controllers/chat-session";
import {
  GetPersonalityUpdateJob,
  GetUserPersonalityById,
  GetUserPersonality,
  ListUserPersonalities,
  StartPersonalityUpdateJob,
} from "./controllers/personality-jobs";
import { CreateUserApiKey } from "./controllers/user-api-keys";
import { CheckUserHandle } from "./controllers/user-handle";
import { Conversation, ConversationSession } from "./controllers/conversation";
import { CreateUserAvatar, GetUserAvatar } from "./controllers/user-avatar";
import {
  CreateTtsRequest,
  ListTtsVoices,
  StreamTtsRequest,
} from "./controllers/tts";
import { GetUserProfile, UpdateUserProfile } from "./controllers/user-profile";
import {
  CreateUserMemory,
  DeleteUserMemory,
  ListUserMemories,
  UpdateUserMemory,
} from "./controllers/user-memories";
import { GetPublicUserData } from "./controllers/public-user-data";
import { dbMiddleware, getDb } from "./db";
import { authMiddleware, type AppEnvWithAuth } from "./middleware/auth";
import dotenv from "dotenv";
import { cors } from "hono/cors";

getDb();

const app = new Hono<AppEnvWithAuth>();
dotenv.config();

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization", "X-Custom-Header"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use("*", dbMiddleware);
app.use("*", authMiddleware);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/api/chat/session", ChatSession);
app.post("/api/chat/personality", ChatPersonalityBuilder);
app.post("/api/chat/persona/session", PersonaChatSession);
app.post("/api/chat/persona", PersonaChat);
app.get("/api/memories", ListUserMemories);
app.post("/api/memories", CreateUserMemory);
app.patch("/api/memories/:id", UpdateUserMemory);
app.delete("/api/memories/:id", DeleteUserMemory);
app.get("/api/personality", GetUserPersonality);
app.get("/api/personality/versions", ListUserPersonalities);
app.get("/api/personality/versions/:id", GetUserPersonalityById);
app.post("/api/personality/jobs", StartPersonalityUpdateJob);
app.get("/api/personality/jobs/:id", GetPersonalityUpdateJob);
app.post("/api/api-keys", CreateUserApiKey);
app.get("/api/users/handle/:handle", CheckUserHandle);
app.get("/api/public/users/:handle", GetPublicUserData);
app.post("/api/conversation/session", ConversationSession);
app.post("/api/conversation", Conversation);
app.get("/api/avatar", GetUserAvatar);
app.post("/api/avatar", CreateUserAvatar);
app.get("/api/profile", GetUserProfile);
app.put("/api/profile", UpdateUserProfile);
app.get("/api/tts/voices", ListTtsVoices);
app.post("/api/tts/requests", CreateTtsRequest);
app.get("/api/tts/requests/:id/stream", StreamTtsRequest);

const port = (() => {
  const value = Number(Bun.env.PORT);
  return Number.isFinite(value) && value > 0 ? value : 8342;
})();

export default {
  port,
  fetch: app.fetch,
};

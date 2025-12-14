To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

Server: http://localhost:8342 (override with `PORT`)

SQLite:
- Path via `SQLITE_DB_PATH` (default `./data/app.sqlite`)
- Migrations in `src/migrations` run on startup

## Avatar API (HeyGen Photo Avatars)

Gestisce la creazione di un **Photo Avatar Group** su HeyGen partendo da una o più foto caricate dal client e lo salva nel DB legandolo all'utente Clerk.

### Config

- `HEYGEN_API_KEY` (server-side)

### Creare/aggiornare avatar

`POST /api/avatar` (richiede JWT Clerk)

`multipart/form-data`:
- `photos`: 1–4 file (`image/png` o `image/jpeg`)
- `name` (opzionale): nome avatar

Response `201`:
```json
{ "avatar": { "id": "...", "groupId": "...", "avatarId": "...", "status": "...", "trainingStatus": "..." } }
```

### Ottenere avatar

`GET /api/avatar` (richiede JWT Clerk)

Response `200`:
```json
{ "avatar": null }
```
oppure
```json
{ "avatar": { "id": "...", "imageUrl": "...", "status": "...", "trainingStatus": "..." } }
```

## TTS API (ElevenLabs)

Endpoint backend per **Text-to-Speech** via ElevenLabs senza esporre `ELEVENLABS_API_KEY` al client.

### Config

- `ELEVENLABS_API_KEY` (server-side)

### Lista voices

`GET /api/tts/voices` (richiede JWT Clerk)

Response `200`:
```json
{ "voices": [ { "voiceId": "...", "name": "..." } ] }
```

### Creare una request TTS (stream)

`POST /api/tts/requests` (richiede JWT Clerk)

Body:
```json
{ "text": "Hello", "voiceId": "..." }
```

Response `201`:
```json
{ "requestId": "...", "streamUrl": "/api/tts/requests/.../stream?token=...", "expiresAt": "..." }
```

Nota: la request è **effimera** (in-memory) e scade dopo pochi minuti.

## Persona Chat API

Endpoint per parlare con la **persona** salvata nel DB (derivata dalle memorie).

### Autenticazione

Supporta due modalità:

1) **Clerk JWT** (come le altre API)
- Header: `Authorization: Bearer <jwt>`

2) **User API Key** (opaca, non espone `user_id`)
- Header: `x-user-api-key: <opk_...>`
  - Accettati anche: `x-user-api`, `x-user-key`, `x-api-key`

> Se passi sia JWT che API key, viene usato il JWT.

### Creare una API Key (una volta)

`POST /api/api-keys` (richiede JWT Clerk)

Body:
```json
{ "label": "my-service" }
```

Response `201`:
```json
{ "keyId": "...", "apiKey": "opk_...", "label": "my-service", "createdAt": "..." }
```

Nota: `apiKey` viene restituita **solo** alla creazione (nel DB viene salvato solo l'hash).

### Creare una sessione per chat persona

`POST /api/chat/persona/session`

La sessione viene legata alla **ultima persona disponibile** dell'utente in quel momento.
Se in futuro generi una nuova versione della persona, crea una nuova sessione per usarla.

Response `201`:
```json
{
  "session_id": "uuid",
  "personality": { "id": "uuid", "version": 3, "updatedAt": "..." }
}
```

### Inviare un messaggio (stream)

`POST /api/chat/persona`

Body:
```json
{
  "session_id": "uuid",
  "message": {
    "content": "Ciao, cosa posso pubblicare oggi?"
  }
}
```

Risposta: **UI Message Stream** (compatibile con AI SDK / `useChat`).

### Errori (status code)

- `401` non autenticato (manca JWT e manca/è invalida API key)
- `403` sessione di un altro utente
- `404` sessione/persona non trovata
- `409` sessione senza persona associata

## User Handle API

Endpoint pubblico per verificare se un handle (tipo `@nome`) è già in uso.

### Check handle

`GET /api/users/handle/:handle`

Esempio:
`GET /api/users/handle/@omar`

Response `200`:
```json
{ "handle": "omar", "exists": true, "available": false }
```

Errori:
- `400` handle non valido (formato/lunghezza)

## Conversation API (replica utente)

Endpoint per conversare in streaming con la “replica” di un utente, identificato dal suo `handle`.

> Nota: al momento è **pubblico** (non richiede auth). Chi conosce l'handle può avviare una conversazione.

### Creare una sessione

`POST /api/conversation/session`

Body:
```json
{ "handle": "@omar" }
```

Response `201`:
```json
{
  "session_id": "uuid",
  "handle": "omar",
  "personality": { "id": "uuid", "version": 3, "updatedAt": "..." }
}
```

### Inviare un messaggio (stream)

`POST /api/conversation`

Body:
```json
{
  "handle": "@omar",
  "session_id": "uuid",
  "message": { "content": "Ciao! Come risponderesti a questo DM?" }
}
```

Risposta: **UI Message Stream** (compatibile con AI SDK / `useChat`).

### Errori (status code)

- `400` payload/handle non valido
- `403` sessione non appartiene all'handle
- `404` user/session/personality non trovata
- `409` sessione senza persona associata

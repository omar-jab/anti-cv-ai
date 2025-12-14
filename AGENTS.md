# Agents Guide

Questo repository contiene **client** e **server**. L’agente deve lavorare rispettando stack, convenzioni e principi di semplicità.

## Principi base

- **Semplice prima di tutto**: evita over-engineering e astrazioni inutili.
- **Codice pulito e leggibile**: funzioni piccole, nomi chiari, responsabilità singole.
- **Modifiche minimali**: cambia solo ciò che serve, senza refactor gratuiti.
- **Coerenza**: segui i pattern già presenti nel progetto.
- **TypeScript sempre** (client e server): tipizza bene input, output, stati e risposte API.

---

## Struttura progetto

- `/client` → Bun + Vite + React
- `/server` → Bun + Hono
- DB → SQLite
- Auth → Clerk

---

## Client

### Stack
- Bun + Vite
- React Router per il routing
- shadcn/ui + Tailwind per UI
- React Hook Form per **tutti** i form
- TanStack Query (`@tanstack/react-query`) per **tutte** le query e mutation verso API

### Regole UI
- Usa componenti shadcn esistenti prima di crearne di nuovi.
- Tailwind solo per layout e styling, senza inventare design system paralleli.
- Componenti piccoli e composabili, niente file monolitici.

### Form (React Hook Form)
- Ogni form deve usare `useForm` e (se serve) `FormProvider`.
- Validazione: preferisci schema (es. zod) se già presente nel progetto, altrimenti validazione RHF semplice.
- Non gestire manualmente lo state dei campi con `useState` se è un form.

### Data fetching (TanStack Query)
- **GET**: `useQuery`
- **POST/PUT/PATCH/DELETE**: `useMutation`
- Invalidazione cache chiara e mirata (`queryClient.invalidateQueries`).
- Gestisci loading, error e empty state in modo esplicito.

### Routing (React Router)
- Mantieni le rotte in modo leggibile e prevedibile.
- Se una pagina cresce troppo, spezzala in componenti e file dedicati.

---

## Server

### Stack
- Bun + HonoJS
- API REST (JSON)
- SQLite come database
- Clerk per autenticazione

### Regole API
- Risposte JSON coerenti e tipizzabili.
- Error handling chiaro con status code corretti:
  - 400: input non valido
  - 401: non autenticato
  - 403: non autorizzato
  - 404: risorsa non trovata
  - 500: errore interno
- Validazione input lato server: non fidarti mai del client.

### Auth (Clerk)
- Ogni endpoint protetto deve verificare l’utente (token/sessione Clerk).
- Il server non deve mai “fidarsi” di `userId` passato dal client se non verificato.

### Database (SQLite)
- Query semplici e leggibili.
- Evita query duplicate: se una query si ripete, centralizzala in un modulo repository/service.
- Usa transazioni quando modifichi più tabelle o più step dipendenti.

---

## Convenzioni consigliate

### Naming
- Componenti React: `PascalCase.tsx`
- Funzioni e variabili: `camelCase`
- Tipi e interfacce: `PascalCase`
- Endpoint: path in `kebab-case`

### Organizzazione (linee guida)
- Client: separa `pages`, `components`, `lib/api` (o equivalente già presente), `hooks`
- Server: separa `routes`, `services`, `db` (o equivalente già presente)

---

## Cosa NON fare

- Non introdurre nuove librerie senza una vera necessità.
- Non creare architetture “enterprise” se non richieste.
- Non duplicare logica di fetch: usa un layer API condiviso se già esiste.
- Non mettere logica complessa dentro componenti UI.
- Non fare mai le build.

---

## Checklist prima di chiudere una modifica

- Il codice è più semplice di prima, non più complesso.
- Form gestiti con React Hook Form.
- Fetch gestito con TanStack Query.
- UI con shadcn + Tailwind, senza componenti custom inutili.
- Errori e stati di loading gestiti.
- Endpoint protetti verificano Clerk correttamente.
- Tipi TS aggiornati e coerenti con le risposte API.



# Documentazione 'AI SDK' -> https://ai-sdk.dev/llms.txt
Da consultare sempre per ogni intervento con l'AI.

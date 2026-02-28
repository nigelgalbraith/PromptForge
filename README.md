# PromptForge

A small **Docker-first** prompt workstation:

- A **static web UI** (served by Nginx) for building prompt “profiles” and generating outputs.
- A lightweight **Node/Express API** that:
  - proxies generation requests to **local providers** (Ollama / LocalAI via HTTP), and
  - stores/loads **saved profiles** as JSON files on disk.

This repo is intentionally simple: **vanilla JS modules** on the front-end (no build step) and a minimal Express API.

---

### Web UI (Nginx)
Two pages:

- **Generator** (`index.html`)  
  Fill out details + options + snippets → compile a prompt → send it to a provider → copy/export.
- **Profile Builder** (`profile.html`)  
  Create/edit reusable profiles and save them to the server.

### API (Express)
- `POST /api/generate` – generate text via a provider
- `POST /api/profiles/save` – save a profile to disk (`.json`)
- `GET  /api/profiles/list` – list saved profiles
- `GET  /api/profiles/:name` – load a saved profile

### Optional local services
The default `docker-compose.yml` also starts:

- **Ollama** (local models) + an **ollama-init** job that pulls common models
- **LocalAI** (OpenAI-compatible chat endpoint)
- **Piper** (text-to-speech, used by the “Voice” pane)

---

## Quick start (Docker)

### 1) Requirements
- Docker + Docker Compose

### 2) Start everything
From the repo root:

```bash
docker compose up -d --build
```

Or use the interactive helper:

```bash
bash manage.sh
```

### 3) Open the UI
- Web UI: http://localhost:3000
- LocalAI UI (external link in nav): http://127.0.0.1:8080/
- Ollama API: http://localhost:11434
- Piper docs: http://localhost:5000/docs

---

## How it works

### Containers & routing

- `web` runs Nginx and serves everything under `apps/web/`.
- Nginx proxies:
  - `/api/*` → the `api` container
  - `/ollama/*` → the `ollama` container
  - `/localai/*` → the `localai` container
  - `/piper/*` → the `piper` container

See: `apps/web/nginx.conf`.

### Profiles persistence

The API writes profiles into:

- Container path: `/data/profiles`
- Host path (mounted volume): `apps/web/profiles/saved`

This is defined in `docker-compose.yml`:

```yaml
api:
  volumes:
    - ./apps/web/profiles/saved:/data/profiles
```

So saved profiles survive container rebuilds and show up in the UI “Profiles” dropdown.

---

## Using the app

### 1) Load a profile
Use the **Profiles** pane → **Refresh** → select a file → **Load Profile**.

### 2) Edit details / options / snippets
The UI is pane-driven. Your current profile is kept in shared state and broadcast via an event bus so panes stay in sync.

### 3) Generate text
In the **Preview** pane:

- pick provider + model
- click **Generate**
- copy the output

### 4) Save a profile to the server
In the **Export Profile** pane:

- enter a filename (adds `.json` automatically if you forget)
- click **Save Profile**

---

## API reference

### Health
```http
GET /api/
GET /
```

### Generate
```http
POST /api/generate
Content-Type: application/json

{
  "provider": "ollama",
  "model": "llama3.1:8b",
  "prompt": "Write me a checklist for …",
  "options": { "temperature": 0.3, "timeoutMs": 120000 }
}
```

Response:
```json
{ "provider": "ollama", "model": "llama3.1:8b", "output": "..." }
```

Supported providers (out of the box):
- `ollama` (HTTP)
- `localai` (HTTP)

> Note: `openai`, `gemini`, and `anthropic` exist as **stub/dummy** providers in the API code right now (they return deterministic placeholder output). If you want real calls, you’ll need to implement provider clients + env var keys.

### Profiles
Save:
```http
POST /api/profiles/save
Content-Type: application/json

{ "name": "my-profile.json", "profile": { ... } }
```

List:
```http
GET /api/profiles/list
```

Load:
```http
GET /api/profiles/my-profile.json
```

---

## Project layout

```
promptForge/
  docker-compose.yml
  manage.sh
  apps/
    api/
      Dockerfile
      package.json
      src/
        server.js
        routes/
          generate.js
          profiles.js
        config/
          providers.js
          provider_http.js
        providers/
          http_generic.js
          openai.js (stub)
          anthropic.js (stub)
          gemini.js (stub)
    web/
      Dockerfile
      nginx.conf
      index.html
      profile.html
      css/
      src/
        pages/
        Generator/
        Builder/
        Common/
        core/
        utils/
      profiles/
        models.json
        messages.json
        saved/   <-- persisted JSON profiles (host mount)
```

---

## Configuration

### Environment variables (API)
- `PORT` (default `4000`)
- `PROFILE_DIR` (default `/data/profiles`)

HTTP provider configuration lives in:
- `apps/api/src/config/provider_http.js`

Example (Ollama):
- `baseUrl: http://ollama:11434`
- `path: /api/generate`
- `format: ollama_generate`
- `responsePath: response`

---

## Troubleshooting

### “No saved profiles”
- Ensure the folder exists on the host: `apps/web/profiles/saved/`
- Check API logs:
  ```bash
  docker compose logs -f api
  ```

### Generation errors / timeouts
- Check Ollama is healthy and has models pulled:
  ```bash
  docker compose logs -f ollama
  docker exec -it $(docker compose ps -q ollama) ollama list
  ```
- Increase timeout using `options.timeoutMs` in the request (the UI can be extended to expose this).

### LocalAI not responding
- Verify `localai` is running:
  ```bash
  docker compose ps
  docker compose logs -f localai
  ```

---

## Development notes

### Front-end style
- The UI is built from small “pane” factories (`buildXPane`) that return `{ node, destroy }`.
- Pages wire panes together using:
  - a shared state map (`state.get/set`)
  - a tiny event bus (`events.emit/on`)
  - a page lifecycle collector (`pageLifecycle.add(fn)`)

### Adding a new HTTP provider
1. Add it to `apps/api/src/config/provider_http.js`
2. Ensure `apps/api/src/routes/generate.js` recognizes it via `httpProviders`
3. Update the UI provider list (see generator/provider pane)

---

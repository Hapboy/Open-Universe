# Testing the API: Swagger UI and Postman

Two different tools for the same job — poking `apps/api`'s endpoints by hand
without writing code. Swagger UI is built into the API itself (zero setup,
always in sync with the code); Postman is a separate desktop app better
suited to saving requests, building collections, and switching between
environments (local vs. deployed).

## Swagger UI

1. Start the API (`bun run start:dev` in `apps/api`, or just `npm run dev`
   from the repo root once it's wired into the root scripts).
2. Open **http://localhost:4175/api** in a browser. Once deployed to
   Railway, the same path works on the public URL (e.g.
   `https://<your-app>.up.railway.app/api`).
3. You'll see every endpoint grouped by controller (`scenes`, `health`, ...).
   Click one to expand it — it shows the HTTP method, path, and (for
   POST/PATCH) the expected request body shape, generated straight from the
   DTO classes (`CreateSceneDto`, `UpdateSceneDto`, ...).
4. Click **"Try it out"** on any endpoint. Editable fields/a JSON body editor
   appear.
5. Fill in the body — Swagger pre-fills an example from the DTO's
   `@ApiProperty({ example: ... })` decorators where present.
6. Click **"Execute"**. Swagger shows the actual `curl` command it ran, the
   response status code, response body, and response headers — all inline,
   no separate tool needed.

Worked example — create then fetch a scene:

1. Expand `POST /scenes` → Try it out → replace the body with:
    ```json
    { "title": "Test Scene", "graph": { "nodes": [], "edges": [] } }
    ```
    → Execute. Copy the `"id"` from the response.
2. Expand `GET /scenes/{id}` → Try it out → paste that id → Execute.

The raw machine-readable spec (what Swagger UI is rendering) lives at
**http://localhost:4175/api-json** — that's the URL to hand to Postman below.

## Postman

1. Open Postman → **File → Import**.
2. Choose the **Link** tab, paste `http://localhost:4175/api-json`, and
   import. Postman reads the OpenAPI spec and auto-creates a full collection
   — one request per endpoint, with example bodies already filled in from the
   DTOs.
3. Set up an **environment** so you can switch between local and deployed
   without editing every request:
    - Click the environment dropdown (top-right) → **Add**.
    - Name it e.g. "Local", add a variable `baseUrl` = `http://localhost:4175`.
    - Add a second environment "Railway" with `baseUrl` = your deployed URL.
    - In the imported collection's requests, the base URL is usually already
      templated as `{{baseUrl}}` (Postman does this automatically from an
      OpenAPI import) — if not, edit one request's URL to use `{{baseUrl}}`
      instead of the hardcoded host, then right-click the collection → "Edit"
      → find/replace across all requests.
4. Pick your environment from the dropdown, open any request (e.g.
   `POST /scenes`), check the **Body** tab has the JSON you want, and hit
   **Send**. Response, status, and timing show in the panel below.

Since the collection is generated from the live spec, re-import it (same
Link import, same steps) whenever endpoints change rather than hand-editing
requests to match — keeps it from drifting out of sync with the API.

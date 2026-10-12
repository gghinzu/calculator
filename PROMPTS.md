# AI Prompts Log

This project was built with the help of **Claude (Anthropic, Opus 5.5)** in a single chat session, as allowed by the assignment instructions.

The original prompts were written in Turkish. They are translated to English below as faithfully as possible. Each entry lists what I asked for and what came out of it, so it is clear which decisions were mine and what the AI produced.

---

## 1. Kick-off

**Prompt (translated):**
> Now we're going to do this together. *(pasted the full assignment text)*
> I previously built a project partly as a microservice in Go. I wrote it without AI, but I've forgotten some of it. The assignment says AI tools are allowed anyway. It's going to use React and be a calculator. I've sent you everything, read it. My project was this; the Go part is the microservice: https://github.com/gghinzu/firstGoProject.git

**Outcome:** The AI cloned and read my earlier Go project (Gin + GORM/Postgres + JWT, layered as `handler → service → repository`, with a shared JSON response envelope and centralized error codes).

## 2. Plan before coding

**Prompt (translated):**
> Wait, don't set it up yet. Let's first talk about what to do and how. I think we can take the backend structure from my old project, and we can discuss the frontend design. The coding part should be easy, right? Also they'll ask me for my prompts.

**Outcome:** We discussed a plan instead of generating code. The AI listed the open decisions: framework vs. standard library, endpoint design, UI style, edge cases, Docker, and how to log prompts.

## 3. Design decisions

**Prompt (translated):**
> Let's create the prompts file.
> - Use my old project's **architecture** as the base, but the libraries/frameworks don't have to be the same. If something is outdated or unnecessary, replace it with something newer and actually needed.
> - We can skip a framework on the backend since the project is very small. Not sure if one is needed to show Go knowledge; maybe we can use one for the frontend design part.
> - The instructions say "endpoints for operations", so let's have **separate endpoints** (add, divide, etc.).
> - Edge cases matter: **division by zero, very large numbers, undefined expressions, decimal display**. For example, scientific calculators sometimes show `100/3` as a fraction; ours should show it as `33.333…`.
> - For expressions like `a*b/100`, should we add parentheses or similar? These details may matter.
> - UI: a classic keypad calculator, but I'll look at Pinterest for design and fonts so it's not too generic.
> - We'll write the README at the end.
> - Docker: I've never set it up on my own, but I have it installed. It's listed as a plus, so let's do it, but I'll need your help.

**Outcome:** Decisions recorded:
- Backend uses the layered architecture from my earlier project, implemented with Go's standard library `net/http` (no framework).
- One REST endpoint per operation.
- Explicit handling of edge cases.
- Keypad-style React + TypeScript UI with a custom design.
- Docker added with a step-by-step explanation.

## 4. UI design reference

**Prompt (translated):**
> *(shared a retro, pixel-art calculator window image I found on Pinterest)*
> A retro look like this could work; it looks cute and cartoonish. Also, I'm not sure if this is a web app or a mobile app. Will I need to change the design depending on where they open it?

**Outcome:**
- The frontend will be a **responsive web app** built on the retro pixel-window style of the Pinterest reference. It is inspired by that image, not a copy.
- The AI suggested several additions to the base design:
  - extra keys for the optional operations (√, xʸ)
  - a two-line display (expression and result)
  - pixel-style error and loading states
  - a pixel font and CSS-only pixel borders
  - keyboard support
- The layout uses a single design that adapts to the screen: a centered window on desktop and full width on mobile.

## 5. Scope confirmation

**Prompt (translated):**
> Note in the prompts file that the frontend will follow the design I found on Pinterest. For parentheses and percentage, let's go with what you suggested.

**Outcome:** Scope decisions:
- Parentheses / full expression parsing is **out of scope**, and this is documented as a conscious decision.
- `percentage` is defined as `a × b / 100` ("b percent of a"), and the UI shows exactly what was computed.

## 6. Unit tests

**Prompt (translated):**
> The instructions also mention unit tests. Should they stay in the project, or should we write them but not include them?

**Outcome:** Tests stay in the repository, since they are an explicit deliverable. They sit next to the code they test (`*_test.go`, `*.test.tsx`) and are excluded from production builds. A coverage report will be generated and committed under `docs/coverage/`, with a summary in the README.

## 7. Backend: calculator service

**Prompt:** Implement the backend core based on the decisions above. *(step-by-step implementation request)*

**Outcome:** The AI generated `internal/domain/service`, which I reviewed:
- `CalculatorServicePort` interface plus a stateless `CalculatorService`, following the port pattern of my earlier project.
- Domain errors (`ErrDivisionByZero`, `ErrUndefinedResult`, `ErrResultOutOfRange`, `ErrInvalidOperand`) are kept free of HTTP concerns.
- Results are rounded to 15 significant digits, so `0.1 + 0.2 = 0.3` and `100 / 3 = 33.3333333333333`. Negative zero is normalized to `0`.
- Percentage is computed as `a / 100 * b` to avoid intermediate overflow.
- Table-driven unit tests cover the service at 100%.

## 8. Backend: HTTP API

**Prompt (translated):**
> I merged it. Meanwhile, keep writing the prompts file too, don't forget it when needed.

**Outcome:** The AI built the HTTP layer on the same layered architecture as my earlier project (`cmd → router → handler → service`, plus `dto`, `server` response envelope, and centralized errors). It uses only the standard library:
- Go 1.22+ method-aware `net/http` routing replaces Gin, and `os.Getenv` replaces viper. The old `internal/error` package is renamed to `apperror` so it doesn't shadow Go's built-in `error`.
- One endpoint per operation under `/api/v1/`, plus `GET /health`.
- Strict request decoding:
  - unknown fields, trailing data, wrong types and out-of-range numbers are rejected
  - bodies are capped at 1 KiB
  - missing operands are told apart from `0` with pointer fields
- Status codes: `400`/`413` for malformed requests, `422` for well-formed but mathematically undefined requests, and `500` with internal details hidden.
- Middleware: panic recovery, structured request logging (`slog`), and opt-in CORS.
- HTTP server timeouts and graceful shutdown on SIGINT/SIGTERM.
- Handler, router, middleware, error-mapping and config tests. Total backend coverage is 99.4%.

## 9. Continuous integration

**Prompt:** Add CI before starting the frontend, so every pull request is verified automatically. *(step-by-step implementation request)*

**Outcome:** The AI added a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every pull request and on pushes to `main`. The backend job:
- checks `gofmt` formatting
- runs `go vet`
- runs the tests with the race detector and cross-package coverage
- writes the coverage total to the job summary

A frontend job will be added together with the frontend.

---

*(New prompts will be appended below as the work continues. Only prompts that shaped the project itself are logged; routine Git/tooling questions are omitted.)*

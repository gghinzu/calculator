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

**Prompt:** No new prompt. This step implements the decisions in sections 3–5.

**Outcome:** The AI generated `internal/domain/service`, which I reviewed:
- `CalculatorServicePort` interface plus a stateless `CalculatorService`, following the port pattern of my earlier project.
- Domain errors (`ErrDivisionByZero`, `ErrUndefinedResult`, `ErrResultOutOfRange`, `ErrInvalidOperand`) are kept free of HTTP concerns.
- Results are rounded to 15 significant digits, so `0.1 + 0.2 = 0.3` and `100 / 3 = 33.3333333333333`. Negative zero is normalized to `0`.
- Percentage is computed as `a / 100 * b` to avoid intermediate overflow.
- Table-driven unit tests cover the service at 100%.

## 8. Backend: HTTP API

**Prompt:** No new prompt. This step implements the decisions in sections 3–5.

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

**Prompt:** None from me. The AI suggested adding CI before the frontend so every pull request is verified automatically, and I agreed.

**Outcome:** The AI added a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every pull request and on pushes to `main`. The backend job:
- checks `gofmt` formatting
- runs `go vet`
- runs the tests with the race detector and cross-package coverage
- writes the coverage total to the job summary

A frontend job will be added together with the frontend.

## 10. Review before the frontend

**Prompt (translated):**
> Is everything OK so far? Before moving to the frontend, let's go over everything we did, logically. Is everything correct, sensible and as we discussed? And did CI work?

**Outcome:** The AI checked the merged `main` branch against the decisions above and confirmed CI passed on the pull request. It reported three findings:
1. Some "Prompt" lines in this file described requests I never actually wrote.
2. Unknown routes (404) and wrong methods (405) returned Go's plain-text responses instead of the JSON error envelope.
3. Rounding to 15 significant digits means very long numbers cannot be represented exactly. This is a float64 limitation.

It also raised an open UI question: what `200 + 10 %` should mean.

**Follow-up prompt (translated):**
> The prompts file should be accurate and honest anyway; I only said not to include unnecessary things. Let's fix the second issue too, so it's nice. For the third, OK, it can be a known limitation, but the frontend must never show the user anything nonsensical. For the fourth, let's do what the iPhone does; that made more sense.

**Outcome:**
- This file was corrected so that every "Prompt" entry is either my actual words or explicitly marked as "no new prompt".
- 404 and 405 now return the JSON envelope with `route_not_found` / `method_not_allowed`. The `Allow` header is preserved, and other mux responses (e.g. path-cleanup redirects) pass through unchanged.
- **Precision:** documented as a known limitation. The frontend will format every result so the user never sees float artifacts, overly long numbers, `NaN`/`Infinity`, or `-0`. It will switch to exponent notation when a number does not fit the display.
- **Percentage key, iPhone-style:**
  - In `a + b %` and `a − b %`, `b %` means *b percent of a*, so `200 + 10 % = 220`.
  - In `a × b %` and `a ÷ b %`, `b %` means `b / 100`.
  - On its own, `b %` gives `b / 100`.

## 11. Frontend: project setup and API client

**Prompt:** No new prompt. This step implements the decisions in sections 3–5.

**Outcome:** The AI scaffolded the frontend with Vite, React 19 and TypeScript (strict), then removed the template boilerplate. It added:
- **Testing:** Vitest + React Testing Library + jsdom, with V8 coverage.
- **Dev proxy:** the Vite dev server proxies `/api` and `/health` to the Go backend, so the browser talks to a single origin and CORS stays disabled.
- **Typed API client (`src/api/calculatorApi.ts`):**
  - Every call either resolves with a finite number or rejects with a single `ApiError` type that carries the backend error code and HTTP status.
  - Network failures, timeouts and malformed responses get their own client-side codes.
  - Caller-initiated aborts are passed through, so stale requests can be cancelled.
- **Tests:** unit tests for the API client, with `fetch` mocked.
- **CI:** a second job runs `npm ci`, lint, type-check/build and tests with coverage.
- **Dependency audit:** `npm audit` flagged known vulnerabilities in the scaffolded Vitest 3 dev dependencies, so the AI upgraded Vitest and its coverage plugin to the patched 4.1.11. The audit is now clean.

## 12. Frontend: retro calculator UI

**Prompt:** No new prompt. This step implements the decisions in sections 4, 5 and 10.

**Outcome:** The AI built the UI and checked it in a headless browser at desktop and phone widths. I reviewed the screenshots and the code.
- **Architecture:**
  - A pure reducer (`calculatorReducer.ts`) owns all calculator state but never does arithmetic. When a key needs math, it records an API request.
  - The `useCalculator` hook sends the request and feeds the result or error back.
  - Typing digits, the decimal point, the sign and backspace are plain string edits done locally. Every calculation goes through the backend.
- **Behaviour:**
  - Immediate evaluation, like a pocket calculator: `2 + 3 ×` shows `5`. There is no operator precedence and there are no parentheses (out of scope, see section 5).
  - Repeated `=` repeats the last operation, and pressing a different operator replaces the pending one.
  - The `%` key follows the iPhone rule agreed in section 10.
  - Input is limited to 15 digits, the precision float64 can represent.
- **Display:**
  - Results are formatted to fit the screen with thousands separators, switching to exponent notation (`9.99999998e+17`) when needed.
  - Tiny numbers are never rounded down to `0`, and `NaN`, `Infinity` and `-0` never reach the user.
  - Errors show a short message (`Can't divide by 0`), keep the attempted expression visible, and give the window a brief shake (disabled under reduced motion).
- **Loading:** a blinking block cursor is shown while waiting for the server. Keys are disabled except C, which cancels the request. Late responses to cancelled requests are ignored.
- **Design:**
  - A retro pixel window inspired by the Pinterest reference: periwinkle title bar and screen, bevelled keys with notched pixel corners drawn in CSS (no images), a hard pixel drop shadow and a dithered desktop background.
  - The `=` key is the only accent colour.
  - CSS Modules per component, with design tokens as CSS variables.
- **Font:** the first choice, Pixelify Sans, made `5` look like `S` and `C` look like `0`. After a side-by-side comparison of five pixel fonts, the AI switched to Jersey 10, whose digits are unambiguous. The font is self-hosted through Fontsource, so no external requests are made.
- **Accessibility:**
  - Every key has an accessible name, and the result is announced through an `aria-live` region.
  - Focus is drawn inside the keys, because `clip-path` would cut off a normal outline.
  - Full keyboard support, with the matching on-screen key flashing when pressed.
- **Responsive:** a centred window on desktop and full width on phones, where the keyboard hint is hidden.
- **Tests:** 80 frontend tests in total:
  - formatting
  - every reducer path (chaining, repeat `=`, percent, errors, cancellation)
  - error messages
  - component tests with a mocked API: clicks, keyboard, loading, cancellation and error display

  Frontend coverage is 98% of statements.

## 13. Debugging "Something went wrong" locally

**Prompt (translated):**
> Even after restarting the backend and frontend in the terminal and clearing the browser cache, the calculator doesn't work. For example, when I try 3×9 the screen says "Something went wrong". How do I inspect in Safari? *(followed by the Network panel details of the failing request and the Vite terminal output: `http proxy error: /api/v1/multiply … ECONNREFUSED`)*

**Outcome:** The AI read the response headers:
- The `500` had a `text/plain` empty body and an `Access-Control-Allow-Origin` header.
- Neither can come from the Go backend, which always answers in JSON and has CORS disabled by default.

So the `500` came from the Vite dev proxy, and `ECONNREFUSED` confirmed that nothing was listening on port 8080: the backend wasn't running. There was no bug in the code, but the incident exposed two UX gaps, which were fixed:
- A 5xx response without the API's JSON envelope now means "the server is unreachable" (`network_error`). The user sees **Server offline** instead of a generic message.
- Failed calculations are logged to the browser console with the operation, operands and underlying error, so the cause is visible without guessing.

I reproduced the scenario by stopping the backend, which now shows "Server offline". Tests were added for both cases.

## 14. Palette, animated background and favicon

**Prompt (translated):**
> I checked the functionality as much as I could; I think it works. I think the site should have a background too, and the colour palette shouldn't stay purple, I don't really like purple :) It could be a pixel-art, moving background with relatively lower brightness, so the focus stays on the calculator. Also, let's change the favicon so it isn't the default. The site title can stay as it is, I think. Do you have a suggestion? *(shared a screenshot of my Pinterest board of pastel pixel-art icons)*

**Outcome:**
- **Palette:** taken from the Pinterest board's pastel pixel art.
  - The calculator now has a cream body, a pink title bar and `=` key, a mint LCD screen and operator keys, and butter-yellow function keys.
  - The page behind it is a dim, dithered teal night, so the calculator is the brightest thing on screen.
  - All colours are CSS variables, so the change touched only the design tokens.
- **Animated background (`PixelBackground`):**
  - Pastel pixel hearts, stars, clouds and flowers, drawn as crisp SVG rectangles from small text pixel maps, drift slowly upwards at reduced opacity, with a few twinkling sparkles.
  - Positions and speeds are fixed rather than random, so the layout is identical on every load and in tests.
  - It is decorative only: hidden from screen readers and ignores pointer events.
  - With "reduce motion" enabled, the sprites rest in place.
- **Favicon:** a 16×16 pixel calculator in the same palette. It ships as SVG, with a 32 px PNG fallback and a 180 px Apple touch icon for Safari and iOS, plus a matching `theme-color`.
- **Title:** kept as "Retro Calculator", as I suggested; the AI agreed.
- Background tests were added; 87 frontend tests pass.

## 15. Random themes and pixel icons on every load

**Prompt (translated):**
> Random pixel icons like these could be added *(two more screenshots of my Pinterest board: tea cup, arcade machine, Game Boy, books, envelope, gift, calculator, clock, flowers…)*. In fact, every time the page is refreshed, the colour palette and the icons could change too.

**Outcome:**
- **Themes:** five pastel themes, none of them purple: Strawberry, Matcha, Peach Soda, Lemon Sky and Cherry Cola.
  - Each defines the full set of colour variables in `theme/themes.css`; JavaScript only chooses the theme's name.
  - A theme is picked at random before React renders, so there is no flash of the wrong colours.
  - The same theme never comes twice in a row. The last theme is remembered in `localStorage`, with a safe fallback when storage is blocked.
  - The mobile browser bar colour (`theme-color`) follows the theme.
- **Icon library:** 14 pixel icons drawn as text pixel maps with colour slots, in the spirit of the moodboard: heart, star, cloud, tulip, envelope, tea cup, CD, Game Boy, mini calculator, gift, cat, book, mushroom and clock.
- **Random scene:** every page load builds a new scene from a random seed, with 12 different icons spread across evenly spaced columns (so they never bunch up). Each icon gets a random order of the theme's sprite colours, a random size and a random speed. A seeded generator (mulberry32) makes any scene reproducible from its seed.
- **Tests:**
  - every sprite map is valid
  - scenes are deterministic per seed and vary between seeds
  - theme picking never repeats and works without storage
  - a consistency test parses `themes.css` and checks that every theme defines exactly the same variables
  - a check that no desktop colour is purple

  119 frontend tests in total.

## 16. 3D keys, theme note and favicon cache

**Prompt (translated):**
> Everything is great. As a final touch, maybe we can add depth to the calculator keys and so on; I think that would be cute too, like 3D. Also, the website icon still hasn't changed and I couldn't figure out why. Didn't we add a favicon?
>
> One more thing: let's write a note somewhere in a corner saying the theme changes when you refresh, so people know. Would that be bad?

**Outcome:**
- **3D keycaps:** every key now has a visible front side, a darker band whose colour is mixed from the key's own colour with `color-mix()`, so it works in all five themes.
  - Pressing a key sinks it by its full depth: the side disappears and the label moves down with it.
  - Hover slightly brightens the top face.
- **Depth elsewhere:** the window got a shaded body edge and a deeper drop shadow, and the LCD screen is recessed further.
- **Theme note:** a quiet line names the current theme and says that refreshing gives a new look, e.g. "Peach Soda theme · refresh the page for a new look".
  - On wide screens it sits in the bottom-right corner.
  - On narrow screens it follows the calculator, so it can never cover the keys.
- **Favicon:** the files and `<link>` tags were correct. Safari keeps favicons in its own cache, separate from the page cache, and was still showing the old Vite icon for `localhost`. The favicon URLs now carry a version query (`?v=2`), so browsers fetch the new icon.

---

*(New prompts will be appended below as the work continues. Only prompts that shaped the project itself are logged; routine Git/tooling questions are omitted.)*

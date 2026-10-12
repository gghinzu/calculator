package router

import (
	"net/http"
	"strings"

	"github.com/gghinzu/calculator/backend/internal/handler"
	"github.com/gghinzu/calculator/backend/internal/middleware"
)

// Options configures the router.
type Options struct {
	// CORSOrigin enables CORS for one origin; empty disables it.
	CORSOrigin string
	// StaticDir, when set, serves the built frontend from that directory, so
	// a single process (and a single Docker container) serves the whole app.
	StaticDir string
}

// New wires every route and the middleware stack.
// It uses the standard library's method-aware routing (Go 1.22+), so wrong
// methods get a 405 and unknown paths a 404 without any framework; both are
// returned in the standard JSON error envelope.
func New(h *handler.CalculatorHandler, opts Options) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", handler.Health)

	mux.HandleFunc("POST /api/v1/add", h.Add)
	mux.HandleFunc("POST /api/v1/subtract", h.Subtract)
	mux.HandleFunc("POST /api/v1/multiply", h.Multiply)
	mux.HandleFunc("POST /api/v1/divide", h.Divide)
	mux.HandleFunc("POST /api/v1/power", h.Power)
	mux.HandleFunc("POST /api/v1/sqrt", h.Sqrt)
	mux.HandleFunc("POST /api/v1/percentage", h.Percentage)

	var root http.Handler = jsonRouteErrors(mux)
	if opts.StaticDir != "" {
		root = withStatic(root, opts.StaticDir)
	}

	return middleware.Chain(root,
		middleware.Recover,
		middleware.Logger,
		middleware.CORS(opts.CORSOrigin),
	)
}

// withStatic sends API paths to the API and everything else to the static
// frontend. Keeping the two apart means an unknown /api path is still a JSON
// 404 and never falls through to an HTML page.
func withStatic(api http.Handler, dir string) http.Handler {
	files := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isAPIPath(r.URL.Path) {
			api.ServeHTTP(w, r)
			return
		}
		// Vite puts a content hash in every asset file name, so those files
		// never change and can be cached for good. index.html is not cached,
		// so a new deploy is picked up immediately.
		if strings.HasPrefix(r.URL.Path, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		files.ServeHTTP(w, r)
	})
}

func isAPIPath(path string) bool {
	return path == "/health" || path == "/api" || strings.HasPrefix(path, "/api/")
}

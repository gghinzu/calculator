package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gghinzu/calculator/backend/internal/apperror"
	"github.com/gghinzu/calculator/backend/internal/server"
)

// Middleware wraps an http.Handler with extra behaviour.
type Middleware func(http.Handler) http.Handler

// Chain applies middlewares so that the first one is the outermost:
// Chain(h, A, B) == A(B(h)).
func Chain(h http.Handler, mws ...Middleware) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

// Recover turns a panic in any handler into a JSON 500 instead of dropping
// the connection.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic recovered", "panic", rec, "path", r.URL.Path)
				e := apperror.InternalServerErr
				server.WriteJSON(w, e.Status, e.Response())
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// Logger logs one structured line per request.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration", time.Since(start),
		)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// CORS allows browser requests from allowedOrigin. An empty origin disables
// CORS entirely, which is the default: in development the Vite dev server
// proxies /api, and in Docker the frontend is served from the same origin.
func CORS(allowedOrigin string) Middleware {
	return func(next http.Handler) http.Handler {
		if allowedOrigin == "" {
			return next
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", allowedOrigin)
			h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "Content-Type")
			h.Add("Vary", "Origin")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

package router

import (
	"bytes"
	"net/http"

	"github.com/gghinzu/calculator/backend/internal/apperror"
	"github.com/gghinzu/calculator/backend/internal/server"
)

// jsonRouteErrors makes the mux's own 404 / 405 responses use the same JSON
// envelope as every other API error, instead of net/http's plain-text body.
//
// ServeMux.Handler reports an empty pattern when no route matched. In that
// case the mux's response is captured; 404 and 405 are rewritten as JSON
// (keeping the Allow header), anything else — e.g. a 301 path-cleanup
// redirect — is passed through unchanged.
func jsonRouteErrors(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, pattern := mux.Handler(r); pattern != "" {
			mux.ServeHTTP(w, r)
			return
		}

		captured := newCaptureWriter()
		mux.ServeHTTP(captured, r)

		switch captured.status {
		case http.StatusNotFound:
			writeError(w, apperror.RouteNotFound)
		case http.StatusMethodNotAllowed:
			w.Header().Set("Allow", captured.Header().Get("Allow"))
			writeError(w, apperror.MethodNotAllowed)
		default:
			captured.replay(w)
		}
	})
}

func writeError(w http.ResponseWriter, e apperror.AppError) {
	server.WriteJSON(w, e.Status, e.Response())
}

// captureWriter buffers a response so it can be inspected before sending.
type captureWriter struct {
	header http.Header
	status int
	body   bytes.Buffer
}

func newCaptureWriter() *captureWriter {
	return &captureWriter{header: http.Header{}, status: http.StatusOK}
}

func (c *captureWriter) Header() http.Header         { return c.header }
func (c *captureWriter) Write(b []byte) (int, error) { return c.body.Write(b) }
func (c *captureWriter) WriteHeader(status int)      { c.status = status }

func (c *captureWriter) replay(w http.ResponseWriter) {
	for k, v := range c.header {
		w.Header()[k] = v
	}
	w.WriteHeader(c.status)
	_, _ = w.Write(c.body.Bytes())
}

package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRecover(t *testing.T) {
	panicky := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom") })

	rec := httptest.NewRecorder()
	Recover(panicky).ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"internal_server_error"`) {
		t.Fatalf("expected JSON error body, got %s", rec.Body.String())
	}
}

func TestLoggerPassesThroughStatus(t *testing.T) {
	teapot := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})

	rec := httptest.NewRecorder()
	Logger(teapot).ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))

	if rec.Code != http.StatusTeapot {
		t.Fatalf("status = %d, want 418", rec.Code)
	}
}

func TestChainOrder(t *testing.T) {
	var order []string
	mw := func(name string) Middleware {
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				order = append(order, name)
				next.ServeHTTP(w, r)
			})
		}
	}
	final := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { order = append(order, "handler") })

	Chain(final, mw("first"), mw("second")).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))

	if got := strings.Join(order, ","); got != "first,second,handler" {
		t.Fatalf("order = %s", got)
	}
}

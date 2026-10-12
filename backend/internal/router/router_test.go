package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gghinzu/calculator/backend/internal/domain/service"
	"github.com/gghinzu/calculator/backend/internal/handler"
)

func newTestRouter(corsOrigin string) http.Handler {
	return New(handler.NewCalculatorHandler(service.NewCalculatorService()), corsOrigin)
}

func TestRoutes(t *testing.T) {
	r := newTestRouter("")
	cases := []struct {
		method, path, body string
		wantStatus         int
	}{
		{"GET", "/health", "", http.StatusOK},
		{"POST", "/api/v1/add", `{"a":1,"b":2}`, http.StatusOK},
		{"POST", "/api/v1/subtract", `{"a":1,"b":2}`, http.StatusOK},
		{"POST", "/api/v1/multiply", `{"a":1,"b":2}`, http.StatusOK},
		{"POST", "/api/v1/divide", `{"a":1,"b":2}`, http.StatusOK},
		{"POST", "/api/v1/power", `{"a":1,"b":2}`, http.StatusOK},
		{"POST", "/api/v1/percentage", `{"a":1,"b":2}`, http.StatusOK},
		{"POST", "/api/v1/sqrt", `{"a":4}`, http.StatusOK},
		{"GET", "/api/v1/add", "", http.StatusMethodNotAllowed},
		{"POST", "/api/v1/modulo", `{"a":1,"b":2}`, http.StatusNotFound},
	}
	for _, tc := range cases {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body)))
			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tc.wantStatus, rec.Body.String())
			}
		})
	}
}

func TestCORS(t *testing.T) {
	t.Run("disabled by default", func(t *testing.T) {
		rec := httptest.NewRecorder()
		newTestRouter("").ServeHTTP(rec, httptest.NewRequest("GET", "/health", nil))
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Fatalf("CORS header should not be set, got %q", got)
		}
	})

	t.Run("enabled for the configured origin", func(t *testing.T) {
		rec := httptest.NewRecorder()
		newTestRouter("http://localhost:5173").ServeHTTP(rec, httptest.NewRequest("GET", "/health", nil))
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
			t.Fatalf("Access-Control-Allow-Origin = %q", got)
		}
	})

	t.Run("preflight is answered without reaching handlers", func(t *testing.T) {
		rec := httptest.NewRecorder()
		newTestRouter("http://localhost:5173").ServeHTTP(rec, httptest.NewRequest("OPTIONS", "/api/v1/add", nil))
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
	})
}

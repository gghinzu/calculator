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

func TestRouteErrorsUseJSONEnvelope(t *testing.T) {
	r := newTestRouter("")
	cases := []struct {
		name, method, path  string
		wantStatus          int
		wantCode, wantAllow string
	}{
		{"unknown path", "POST", "/api/v1/modulo", http.StatusNotFound, "route_not_found", ""},
		{"root path", "GET", "/", http.StatusNotFound, "route_not_found", ""},
		{"wrong method", "GET", "/api/v1/add", http.StatusMethodNotAllowed, "method_not_allowed", "POST"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, httptest.NewRequest(tc.method, tc.path, nil))

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tc.wantStatus)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Fatalf("Content-Type = %q, want application/json", ct)
			}
			if !strings.Contains(rec.Body.String(), `"code":"`+tc.wantCode+`"`) {
				t.Fatalf("body = %s, want code %s", rec.Body.String(), tc.wantCode)
			}
			if got := rec.Header().Get("Allow"); got != tc.wantAllow {
				t.Fatalf("Allow = %q, want %q", got, tc.wantAllow)
			}
		})
	}
}

func TestNonErrorUnmatchedResponsesPassThrough(t *testing.T) {
	// The mux answers unclean paths with a redirect rather than a 404.
	rec := httptest.NewRecorder()
	newTestRouter("").ServeHTTP(rec, httptest.NewRequest("GET", "/api//v1/add", nil))

	if rec.Code != http.StatusMovedPermanently {
		t.Fatalf("status = %d, want 301", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/api/v1/add" {
		t.Fatalf("Location = %q, want /api/v1/add", loc)
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

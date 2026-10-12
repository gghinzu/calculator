package router

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gghinzu/calculator/backend/internal/domain/service"
	"github.com/gghinzu/calculator/backend/internal/handler"
)

func newTestRouter(corsOrigin string) http.Handler {
	return New(handler.NewCalculatorHandler(service.NewCalculatorService()), Options{CORSOrigin: corsOrigin})
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

func newStaticRouter(t *testing.T) http.Handler {
	t.Helper()
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	files := map[string]string{
		"index.html":         "<!doctype html><title>Retro Calculator</title>",
		"assets/app-abc1.js": "console.log('hi')",
	}
	for name, body := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return New(handler.NewCalculatorHandler(service.NewCalculatorService()), Options{StaticDir: dir})
}

func TestStaticFrontend(t *testing.T) {
	r := newStaticRouter(t)
	serve := func(method, path, body string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, httptest.NewRequest(method, path, strings.NewReader(body)))
		return rec
	}

	t.Run("serves index.html at the root without caching", func(t *testing.T) {
		rec := serve("GET", "/", "")
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "Retro Calculator") {
			t.Fatalf("got %d %q", rec.Code, rec.Body.String())
		}
		if got := rec.Header().Get("Cache-Control"); got != "no-cache" {
			t.Fatalf("Cache-Control = %q", got)
		}
	})

	t.Run("caches hashed assets for good", func(t *testing.T) {
		rec := serve("GET", "/assets/app-abc1.js", "")
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d", rec.Code)
		}
		if got := rec.Header().Get("Cache-Control"); !strings.Contains(got, "immutable") {
			t.Fatalf("Cache-Control = %q", got)
		}
	})

	t.Run("the API still works next to the frontend", func(t *testing.T) {
		rec := serve("POST", "/api/v1/add", `{"a":1,"b":2}`)
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"result":3`) {
			t.Fatalf("got %d %s", rec.Code, rec.Body.String())
		}
		if serve("GET", "/health", "").Code != http.StatusOK {
			t.Fatal("health check failed")
		}
	})

	t.Run("unknown API paths stay JSON errors, never HTML", func(t *testing.T) {
		for _, tc := range []struct{ method, path, code string }{
			{"POST", "/api/v1/modulo", "route_not_found"},
			{"GET", "/api/v1/add", "method_not_allowed"},
			{"GET", "/api", "route_not_found"},
		} {
			rec := serve(tc.method, tc.path, "")
			if !strings.Contains(rec.Body.String(), `"code":"`+tc.code+`"`) {
				t.Fatalf("%s %s: got %d %s", tc.method, tc.path, rec.Code, rec.Body.String())
			}
		}
	})

	t.Run("missing static files are 404", func(t *testing.T) {
		if rec := serve("GET", "/nope.png", ""); rec.Code != http.StatusNotFound {
			t.Fatalf("status = %d", rec.Code)
		}
	})
}

package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthcheck(t *testing.T) {
	ok := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))
	defer ok.Close()
	failing := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer failing.Close()

	if code := healthcheck(ok.URL); code != 0 {
		t.Fatalf("healthy server: exit code %d, want 0", code)
	}
	if code := healthcheck(failing.URL); code != 1 {
		t.Fatalf("unhealthy server: exit code %d, want 1", code)
	}
	if code := healthcheck("http://127.0.0.1:1/health"); code != 1 {
		t.Fatalf("unreachable server: exit code %d, want 1", code)
	}
}

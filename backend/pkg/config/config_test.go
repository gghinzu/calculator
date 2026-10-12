package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("PORT", "")
	t.Setenv("CORS_ALLOWED_ORIGIN", "")
	t.Setenv("STATIC_DIR", "")

	cfg := Load()

	if cfg.Port != "8080" {
		t.Fatalf("Port = %q, want 8080", cfg.Port)
	}
	if cfg.CORSAllowedOrigin != "" {
		t.Fatalf("CORS should be disabled by default, got %q", cfg.CORSAllowedOrigin)
	}
	if cfg.StaticDir != "" {
		t.Fatalf("static serving should be off by default, got %q", cfg.StaticDir)
	}
}

func TestLoadFromEnv(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("CORS_ALLOWED_ORIGIN", "http://localhost:5173")
	t.Setenv("STATIC_DIR", "/app/public")

	cfg := Load()

	if cfg.Port != "9090" || cfg.CORSAllowedOrigin != "http://localhost:5173" || cfg.StaticDir != "/app/public" {
		t.Fatalf("unexpected config: %+v", cfg)
	}
}

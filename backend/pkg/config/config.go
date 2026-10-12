package config

import "os"

// Config holds runtime settings read from environment variables.
// A few plain env vars do not justify a config library (the earlier project
// used viper), so this stays on the standard library.
type Config struct {
	// Port the HTTP server listens on. Env: PORT (default 8080).
	Port string
	// CORSAllowedOrigin enables CORS for one origin when set.
	// Env: CORS_ALLOWED_ORIGIN (default: disabled).
	CORSAllowedOrigin string
	// StaticDir serves the built frontend from this directory when set.
	// Env: STATIC_DIR (default: API only). Used by the Docker image.
	StaticDir string
}

func Load() Config {
	return Config{
		Port:              getEnv("PORT", "8080"),
		CORSAllowedOrigin: os.Getenv("CORS_ALLOWED_ORIGIN"),
		StaticDir:         os.Getenv("STATIC_DIR"),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

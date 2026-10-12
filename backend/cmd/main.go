package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gghinzu/calculator/backend/internal/domain/service"
	"github.com/gghinzu/calculator/backend/internal/handler"
	"github.com/gghinzu/calculator/backend/internal/router"
	"github.com/gghinzu/calculator/backend/pkg/config"
)

func main() {
	cfg := config.Load()

	calculatorService := service.NewCalculatorService()
	calculatorHandler := handler.NewCalculatorHandler(calculatorService)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router.New(calculatorHandler, cfg.CORSAllowedOrigin),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Stop gracefully on Ctrl+C or `docker stop` (SIGTERM).
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("server starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
}

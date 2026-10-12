package router

import (
	"net/http"

	"github.com/gghinzu/calculator/backend/internal/handler"
	"github.com/gghinzu/calculator/backend/internal/middleware"
)

// New wires every route and the middleware stack.
// It uses the standard library's method-aware routing (Go 1.22+), so wrong
// methods get a 405 and unknown paths a 404 without any framework; both are
// returned in the standard JSON error envelope.
func New(h *handler.CalculatorHandler, corsOrigin string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", handler.Health)

	mux.HandleFunc("POST /api/v1/add", h.Add)
	mux.HandleFunc("POST /api/v1/subtract", h.Subtract)
	mux.HandleFunc("POST /api/v1/multiply", h.Multiply)
	mux.HandleFunc("POST /api/v1/divide", h.Divide)
	mux.HandleFunc("POST /api/v1/power", h.Power)
	mux.HandleFunc("POST /api/v1/sqrt", h.Sqrt)
	mux.HandleFunc("POST /api/v1/percentage", h.Percentage)

	return middleware.Chain(jsonRouteErrors(mux),
		middleware.Recover,
		middleware.Logger,
		middleware.CORS(corsOrigin),
	)
}

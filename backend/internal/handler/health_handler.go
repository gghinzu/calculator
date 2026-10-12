package handler

import (
	"net/http"

	"github.com/gghinzu/calculator/backend/internal/server"
)

// Health is a liveness probe used by Docker and load balancers.
func Health(w http.ResponseWriter, _ *http.Request) {
	server.WriteJSON(w, http.StatusOK, server.SuccessResponse(map[string]string{"status": "ok"}))
}

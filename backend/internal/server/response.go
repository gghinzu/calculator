package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// Response is the envelope every API response uses, so clients can always
// check `success` first and then read either `data` or `error`.
type Response struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   *Error `json:"error,omitempty"`
}

type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func SuccessResponse(data any) Response {
	return Response{Success: true, Data: data}
}

func ErrorResponse(code, message string) Response {
	return Response{Success: false, Error: &Error{Code: code, Message: message}}
}

// WriteJSON serializes body as JSON with the given status code.
func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		// Headers are already sent, so the best we can do is log it.
		slog.Error("failed to encode response", "error", err)
	}
}

package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gghinzu/calculator/backend/internal/apperror"
)

// maxBodyBytes caps request bodies. A valid request is a few dozen bytes,
// so 1 KiB leaves plenty of room while rejecting abusive payloads early.
const maxBodyBytes = 1 << 10

// decodeJSON strictly decodes a single JSON object into dst and translates
// every decoding failure into a specific, client-friendly API error.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) *apperror.AppError {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		appErr := translateDecodeError(err)
		return &appErr
	}

	// Reject trailing data such as `{"a":1}{"a":2}` or `{"a":1} garbage`.
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			return &apperror.RequestTooLarge
		}
		return &apperror.InvalidJSON
	}
	return nil
}

func translateDecodeError(err error) apperror.AppError {
	var (
		typeErr     *json.UnmarshalTypeError
		maxBytesErr *http.MaxBytesError
	)

	switch {
	case errors.Is(err, io.EOF):
		return apperror.EmptyRequestBody
	case errors.As(err, &maxBytesErr):
		return apperror.RequestTooLarge
	case errors.As(err, &typeErr) && typeErr.Field != "":
		// Covers wrong types ({"a": "5"}) and numbers outside the float64
		// range ({"a": 1e400}).
		return apperror.InvalidOperand(typeErr.Field)
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		// encoding/json has no exported type for this error.
		return apperror.UnknownField(strings.TrimPrefix(err.Error(), "json: "))
	default:
		// Syntax errors, truncated bodies, a top-level array, etc.
		return apperror.InvalidJSON
	}
}

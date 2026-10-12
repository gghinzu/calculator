// Package apperror defines the API-level errors: an HTTP status, a stable
// machine-readable code for clients, and a human-readable message.
package apperror

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gghinzu/calculator/backend/internal/domain/service"
	"github.com/gghinzu/calculator/backend/internal/server"
)

type AppError struct {
	Status  int
	Code    string
	Message string
}

func (e AppError) Error() string { return e.Code + ": " + e.Message }

// Response converts the error into the standard API envelope.
func (e AppError) Response() server.Response {
	return server.ErrorResponse(e.Code, e.Message)
}

func New(status int, code, message string) AppError {
	return AppError{Status: status, Code: code, Message: message}
}

// Request errors: the request itself is malformed (400 / 413).
var (
	EmptyRequestBody = New(http.StatusBadRequest, "empty_request_body", "request body is required")
	InvalidJSON      = New(http.StatusBadRequest, "invalid_json", "request body must be a single valid JSON object")
	RequestTooLarge  = New(http.StatusRequestEntityTooLarge, "request_too_large", "request body is too large")
)

// Calculation errors: the request is well-formed but the math is not
// defined for these inputs (422 Unprocessable Entity).
var (
	DivisionByZero    = New(http.StatusUnprocessableEntity, "division_by_zero", "division by zero is undefined")
	UndefinedResult   = New(http.StatusUnprocessableEntity, "undefined_result", "result is not a real number")
	ResultOutOfRange  = New(http.StatusUnprocessableEntity, "result_out_of_range", "result is too large to represent")
	InternalServerErr = New(http.StatusInternalServerError, "internal_server_error", "internal server error")
)

func MissingOperand(field string) AppError {
	return New(http.StatusBadRequest, "missing_operand", fmt.Sprintf("field %q is required", field))
}

func InvalidOperand(field string) AppError {
	return New(http.StatusBadRequest, "invalid_operand", fmt.Sprintf("field %q must be a finite number", field))
}

func UnknownField(detail string) AppError {
	return New(http.StatusBadRequest, "unknown_field", detail)
}

// FromDomain maps service-layer errors to API errors. Unknown errors become
// a generic 500 so internal details never leak to clients.
func FromDomain(err error) AppError {
	switch {
	case errors.Is(err, service.ErrDivisionByZero):
		return DivisionByZero
	case errors.Is(err, service.ErrUndefinedResult):
		return UndefinedResult
	case errors.Is(err, service.ErrResultOutOfRange):
		return ResultOutOfRange
	case errors.Is(err, service.ErrInvalidOperand):
		return New(http.StatusBadRequest, "invalid_operand", "operands must be finite numbers")
	default:
		return InternalServerErr
	}
}

package service

import "errors"

// Domain errors returned by CalculatorService.
//
// They are sentinel values so that callers (e.g. the HTTP layer) can map them
// to transport-specific responses with errors.Is, without the domain knowing
// anything about HTTP.
var (
	// ErrDivisionByZero is returned for x / 0 and for 0 raised to a negative power.
	ErrDivisionByZero = errors.New("division by zero")

	// ErrUndefinedResult is returned when the result is not a real number,
	// e.g. the square root of a negative number or (-8) ^ 0.5.
	ErrUndefinedResult = errors.New("result is not a real number")

	// ErrResultOutOfRange is returned when a result overflows float64
	// (e.g. 1e308 * 10).
	ErrResultOutOfRange = errors.New("result is out of range")

	// ErrInvalidOperand is returned when an operand is NaN or ±Inf.
	// JSON cannot encode these, so this is a defensive check for callers
	// other than the HTTP handler.
	ErrInvalidOperand = errors.New("operand must be a finite number")
)

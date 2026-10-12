package handler

import (
	"net/http"

	"github.com/gghinzu/calculator/backend/internal/apperror"
	"github.com/gghinzu/calculator/backend/internal/domain/service"
	"github.com/gghinzu/calculator/backend/internal/dto"
	"github.com/gghinzu/calculator/backend/internal/server"
)

type CalculatorHandler struct {
	s service.CalculatorServicePort
}

func NewCalculatorHandler(s service.CalculatorServicePort) *CalculatorHandler {
	return &CalculatorHandler{s: s}
}

func (h *CalculatorHandler) Add(w http.ResponseWriter, r *http.Request) {
	h.handleBinary(w, r, "add", h.s.Add)
}

func (h *CalculatorHandler) Subtract(w http.ResponseWriter, r *http.Request) {
	h.handleBinary(w, r, "subtract", h.s.Subtract)
}

func (h *CalculatorHandler) Multiply(w http.ResponseWriter, r *http.Request) {
	h.handleBinary(w, r, "multiply", h.s.Multiply)
}

func (h *CalculatorHandler) Divide(w http.ResponseWriter, r *http.Request) {
	h.handleBinary(w, r, "divide", h.s.Divide)
}

func (h *CalculatorHandler) Power(w http.ResponseWriter, r *http.Request) {
	h.handleBinary(w, r, "power", h.s.Power)
}

func (h *CalculatorHandler) Percentage(w http.ResponseWriter, r *http.Request) {
	h.handleBinary(w, r, "percentage", h.s.Percentage)
}

func (h *CalculatorHandler) Sqrt(w http.ResponseWriter, r *http.Request) {
	var req dto.UnaryOperationRequest
	if appErr := decodeJSON(w, r, &req); appErr != nil {
		writeError(w, *appErr)
		return
	}
	if req.A == nil {
		writeError(w, apperror.MissingOperand("a"))
		return
	}

	result, err := h.s.Sqrt(*req.A)
	writeResult(w, "sqrt", result, err)
}

// handleBinary holds the flow shared by every two-operand endpoint:
// decode -> validate -> calculate -> respond.
func (h *CalculatorHandler) handleBinary(
	w http.ResponseWriter,
	r *http.Request,
	operation string,
	calculate func(a, b float64) (float64, error),
) {
	var req dto.BinaryOperationRequest
	if appErr := decodeJSON(w, r, &req); appErr != nil {
		writeError(w, *appErr)
		return
	}
	if req.A == nil {
		writeError(w, apperror.MissingOperand("a"))
		return
	}
	if req.B == nil {
		writeError(w, apperror.MissingOperand("b"))
		return
	}

	result, err := calculate(*req.A, *req.B)
	writeResult(w, operation, result, err)
}

func writeResult(w http.ResponseWriter, operation string, result float64, err error) {
	if err != nil {
		writeError(w, apperror.FromDomain(err))
		return
	}
	server.WriteJSON(w, http.StatusOK, server.SuccessResponse(dto.OperationResponse{
		Operation: operation,
		Result:    result,
	}))
}

func writeError(w http.ResponseWriter, e apperror.AppError) {
	server.WriteJSON(w, e.Status, e.Response())
}

package apperror

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/gghinzu/calculator/backend/internal/domain/service"
)

func TestFromDomain(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{"division by zero", service.ErrDivisionByZero, http.StatusUnprocessableEntity, "division_by_zero"},
		{"undefined result", service.ErrUndefinedResult, http.StatusUnprocessableEntity, "undefined_result"},
		{"out of range", service.ErrResultOutOfRange, http.StatusUnprocessableEntity, "result_out_of_range"},
		{"invalid operand", service.ErrInvalidOperand, http.StatusBadRequest, "invalid_operand"},
		{"wrapped domain error", fmt.Errorf("divide: %w", service.ErrDivisionByZero), http.StatusUnprocessableEntity, "division_by_zero"},
		{"unknown error", errors.New("boom"), http.StatusInternalServerError, "internal_server_error"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := FromDomain(tc.err)
			if got.Status != tc.wantStatus || got.Code != tc.wantCode {
				t.Fatalf("got %d %s, want %d %s", got.Status, got.Code, tc.wantStatus, tc.wantCode)
			}
		})
	}
}

func TestAppError(t *testing.T) {
	e := MissingOperand("b")

	if e.Error() != `missing_operand: field "b" is required` {
		t.Fatalf("unexpected Error(): %q", e.Error())
	}
	resp := e.Response()
	if resp.Success || resp.Error == nil || resp.Error.Code != "missing_operand" || resp.Data != nil {
		t.Fatalf("unexpected response: %+v", resp)
	}
}

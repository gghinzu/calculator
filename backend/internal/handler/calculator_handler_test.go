package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gghinzu/calculator/backend/internal/domain/service"
)

// apiResponse mirrors server.Response with a concrete data type so tests can
// assert on the decoded body.
type apiResponse struct {
	Success bool `json:"success"`
	Data    *struct {
		Operation string  `json:"operation"`
		Result    float64 `json:"result"`
	} `json:"data"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func call(t *testing.T, fn http.HandlerFunc, body string) (int, apiResponse) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	rec := httptest.NewRecorder()
	fn(rec, req)

	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q, want application/json", ct)
	}
	var resp apiResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response is not valid JSON: %v\nbody: %s", err, rec.Body.String())
	}
	return rec.Code, resp
}

func assertSuccess(t *testing.T, status int, resp apiResponse, wantOp string, want float64) {
	t.Helper()
	if status != http.StatusOK || !resp.Success || resp.Data == nil {
		t.Fatalf("expected success, got status=%d resp=%+v", status, resp)
	}
	if resp.Data.Operation != wantOp || resp.Data.Result != want {
		t.Fatalf("got %s=%v, want %s=%v", resp.Data.Operation, resp.Data.Result, wantOp, want)
	}
	if resp.Error != nil {
		t.Fatalf("success response must not contain an error: %+v", resp.Error)
	}
}

func assertError(t *testing.T, status int, resp apiResponse, wantStatus int, wantCode string) {
	t.Helper()
	if status != wantStatus {
		t.Fatalf("status = %d, want %d", status, wantStatus)
	}
	if resp.Success || resp.Error == nil || resp.Error.Code != wantCode {
		t.Fatalf("expected error code %q, got %+v", wantCode, resp)
	}
	if resp.Error.Message == "" {
		t.Fatal("error message must not be empty")
	}
	if resp.Data != nil {
		t.Fatalf("error response must not contain data: %+v", resp.Data)
	}
}

func newHandler() *CalculatorHandler {
	return NewCalculatorHandler(service.NewCalculatorService())
}

func TestOperations_Success(t *testing.T) {
	h := newHandler()
	cases := []struct {
		name string
		fn   http.HandlerFunc
		body string
		op   string
		want float64
	}{
		{"add", h.Add, `{"a": 2, "b": 3}`, "add", 5},
		{"subtract", h.Subtract, `{"a": 2, "b": 3}`, "subtract", -1},
		{"multiply", h.Multiply, `{"a": 2.5, "b": 4}`, "multiply", 10},
		{"divide", h.Divide, `{"a": 100, "b": 3}`, "divide", 33.3333333333333},
		{"power", h.Power, `{"a": 2, "b": 8}`, "power", 256},
		{"percentage", h.Percentage, `{"a": 200, "b": 10}`, "percentage", 20},
		{"sqrt", h.Sqrt, `{"a": 81}`, "sqrt", 9},
		{"explicit zero is a valid operand", h.Add, `{"a": 0, "b": 0}`, "add", 0},
		{"float noise is rounded", h.Add, `{"a": 0.1, "b": 0.2}`, "add", 0.3},
		{"exponent notation input", h.Multiply, `{"a": 1e3, "b": 2}`, "multiply", 2000},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			status, resp := call(t, tc.fn, tc.body)
			assertSuccess(t, status, resp, tc.op, tc.want)
		})
	}
}

func TestOperations_CalculationErrors(t *testing.T) {
	h := newHandler()
	cases := []struct {
		name     string
		fn       http.HandlerFunc
		body     string
		wantCode string
	}{
		{"divide by zero", h.Divide, `{"a": 5, "b": 0}`, "division_by_zero"},
		{"zero divided by zero", h.Divide, `{"a": 0, "b": 0}`, "division_by_zero"},
		{"zero to a negative power", h.Power, `{"a": 0, "b": -2}`, "division_by_zero"},
		{"sqrt of a negative", h.Sqrt, `{"a": -9}`, "undefined_result"},
		{"negative base, fractional exponent", h.Power, `{"a": -8, "b": 0.5}`, "undefined_result"},
		{"overflow", h.Multiply, `{"a": 1e308, "b": 10}`, "result_out_of_range"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			status, resp := call(t, tc.fn, tc.body)
			assertError(t, status, resp, http.StatusUnprocessableEntity, tc.wantCode)
		})
	}
}

func TestOperations_InvalidRequests(t *testing.T) {
	h := newHandler()
	cases := []struct {
		name       string
		fn         http.HandlerFunc
		body       string
		wantStatus int
		wantCode   string
	}{
		{"empty body", h.Add, ``, http.StatusBadRequest, "empty_request_body"},
		{"malformed JSON", h.Add, `{"a": 1,`, http.StatusBadRequest, "invalid_json"},
		{"syntax error", h.Add, `{a: 1}`, http.StatusBadRequest, "invalid_json"},
		{"top-level array", h.Add, `[1, 2]`, http.StatusBadRequest, "invalid_json"},
		{"trailing data", h.Add, `{"a": 1, "b": 2} {"a": 3}`, http.StatusBadRequest, "invalid_json"},
		{"missing a", h.Add, `{"b": 2}`, http.StatusBadRequest, "missing_operand"},
		{"missing b", h.Divide, `{"a": 2}`, http.StatusBadRequest, "missing_operand"},
		{"null operand", h.Add, `{"a": null, "b": 2}`, http.StatusBadRequest, "missing_operand"},
		{"missing sqrt operand", h.Sqrt, `{}`, http.StatusBadRequest, "missing_operand"},
		{"string operand", h.Add, `{"a": "5", "b": 2}`, http.StatusBadRequest, "invalid_operand"},
		{"boolean operand", h.Sqrt, `{"a": true}`, http.StatusBadRequest, "invalid_operand"},
		{"number out of float64 range", h.Add, `{"a": 1e400, "b": 1}`, http.StatusBadRequest, "invalid_operand"},
		{"unknown field", h.Add, `{"a": 1, "b": 2, "c": 3}`, http.StatusBadRequest, "unknown_field"},
		{"b is not accepted by sqrt", h.Sqrt, `{"a": 4, "b": 2}`, http.StatusBadRequest, "unknown_field"},
		{"body too large", h.Add, `{"a": 1, "b": 2` + strings.Repeat(" ", maxBodyBytes) + `}`, http.StatusRequestEntityTooLarge, "request_too_large"},
		{"body too large after a valid object", h.Add, `{"a": 1, "b": 2}` + strings.Repeat(" ", maxBodyBytes), http.StatusRequestEntityTooLarge, "request_too_large"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			status, resp := call(t, tc.fn, tc.body)
			assertError(t, status, resp, tc.wantStatus, tc.wantCode)
		})
	}
}

// fakeService lets us simulate failures the real service never produces.
type fakeService struct {
	service.CalculatorServicePort
	err error
}

func (f fakeService) Add(_, _ float64) (float64, error) { return 0, f.err }

func TestUnexpectedServiceErrorIsHidden(t *testing.T) {
	h := NewCalculatorHandler(fakeService{err: errors.New("database password is hunter2")})

	status, resp := call(t, h.Add, `{"a": 1, "b": 2}`)

	assertError(t, status, resp, http.StatusInternalServerError, "internal_server_error")
	if strings.Contains(resp.Error.Message, "hunter2") {
		t.Fatal("internal error details leaked to the client")
	}
}

func TestHealth(t *testing.T) {
	rec := httptest.NewRecorder()
	Health(rec, httptest.NewRequest(http.MethodGet, "/health", nil))

	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected health response: %d %s", rec.Code, rec.Body.String())
	}
}

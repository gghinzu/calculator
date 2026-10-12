package service

import (
	"errors"
	"math"
	"testing"
)

type binaryCase struct {
	name    string
	a, b    float64
	want    float64
	wantErr error
}

func runBinary(t *testing.T, op func(a, b float64) (float64, error), cases []binaryCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := op(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func assertResult(t *testing.T, got float64, err error, want float64, wantErr error) {
	t.Helper()
	if wantErr != nil {
		if !errors.Is(err, wantErr) {
			t.Fatalf("expected error %v, got result=%v err=%v", wantErr, got, err)
		}
		return
	}
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Fatalf("got %v, want %v", got, want)
	}
	if math.Signbit(got) && got == 0 {
		t.Fatalf("got negative zero, want +0")
	}
}

var s = NewCalculatorService()

func TestAdd(t *testing.T) {
	runBinary(t, s.Add, []binaryCase{
		{name: "integers", a: 2, b: 3, want: 5},
		{name: "negatives", a: -2, b: -3, want: -5},
		{name: "mixed signs", a: -2.5, b: 10, want: 7.5},
		{name: "float noise is rounded away", a: 0.1, b: 0.2, want: 0.3},
		{name: "overflow", a: math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrResultOutOfRange},
		{name: "NaN operand", a: math.NaN(), b: 1, wantErr: ErrInvalidOperand},
		{name: "Inf operand", a: 1, b: math.Inf(1), wantErr: ErrInvalidOperand},
	})
}

func TestSubtract(t *testing.T) {
	runBinary(t, s.Subtract, []binaryCase{
		{name: "positive result", a: 10, b: 4, want: 6},
		{name: "negative result", a: 4, b: 10, want: -6},
		{name: "float noise is rounded away", a: 0.3, b: 0.1, want: 0.2},
		{name: "same value yields +0", a: 1.5, b: 1.5, want: 0},
		{name: "overflow", a: -math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrResultOutOfRange},
	})
}

func TestMultiply(t *testing.T) {
	runBinary(t, s.Multiply, []binaryCase{
		{name: "integers", a: 6, b: 7, want: 42},
		{name: "by zero", a: 123, b: 0, want: 0},
		{name: "negative times zero is +0", a: -5, b: 0, want: 0},
		{name: "decimals", a: 1.1, b: 1.1, want: 1.21},
		{name: "overflow", a: 1e308, b: 10, wantErr: ErrResultOutOfRange},
	})
}

func TestDivide(t *testing.T) {
	runBinary(t, s.Divide, []binaryCase{
		{name: "exact", a: 10, b: 4, want: 2.5},
		{name: "repeating decimal", a: 100, b: 3, want: 33.3333333333333},
		{name: "negative", a: -9, b: 3, want: -3},
		{name: "zero numerator", a: 0, b: 5, want: 0},
		{name: "by zero", a: 5, b: 0, wantErr: ErrDivisionByZero},
		{name: "zero by zero", a: 0, b: 0, wantErr: ErrDivisionByZero},
		{name: "overflow", a: 1e308, b: 1e-308, wantErr: ErrResultOutOfRange},
		{name: "NaN operand", a: 1, b: math.NaN(), wantErr: ErrInvalidOperand},
	})
}

func TestPower(t *testing.T) {
	runBinary(t, s.Power, []binaryCase{
		{name: "integer exponent", a: 2, b: 10, want: 1024},
		{name: "zero exponent", a: 7, b: 0, want: 1},
		{name: "negative exponent", a: 2, b: -2, want: 0.25},
		{name: "fractional exponent", a: 9, b: 0.5, want: 3},
		{name: "negative base, odd integer exponent", a: -2, b: 3, want: -8},
		{name: "zero to positive power", a: 0, b: 3, want: 0},
		{name: "zero to negative power", a: 0, b: -1, wantErr: ErrDivisionByZero},
		{name: "negative base, fractional exponent", a: -8, b: 0.5, wantErr: ErrUndefinedResult},
		{name: "overflow", a: 10, b: 400, wantErr: ErrResultOutOfRange},
		{name: "Inf operand", a: math.Inf(-1), b: 2, wantErr: ErrInvalidOperand},
	})
}

func TestSqrt(t *testing.T) {
	cases := []struct {
		name    string
		a       float64
		want    float64
		wantErr error
	}{
		{name: "perfect square", a: 16, want: 4},
		{name: "irrational", a: 2, want: 1.4142135623731},
		{name: "zero", a: 0, want: 0},
		{name: "negative", a: -4, wantErr: ErrUndefinedResult},
		{name: "NaN operand", a: math.NaN(), wantErr: ErrInvalidOperand},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := s.Sqrt(tc.a)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestPercentage(t *testing.T) {
	runBinary(t, s.Percentage, []binaryCase{
		{name: "10 percent of 200", a: 200, b: 10, want: 20},
		{name: "50 percent of 3", a: 3, b: 50, want: 1.5},
		{name: "fractional percent", a: 80, b: 12.5, want: 10},
		{name: "over 100 percent", a: 40, b: 250, want: 100},
		{name: "negative percent", a: 200, b: -10, want: -20},
		{name: "large value does not overflow early", a: 1e308, b: 50, want: 5e307},
		{name: "NaN operand", a: math.NaN(), b: 10, wantErr: ErrInvalidOperand},
	})
}

func TestNormalize(t *testing.T) {
	t.Run("value next to MaxFloat64 is kept unrounded", func(t *testing.T) {
		got, err := normalize(math.MaxFloat64)
		assertResult(t, got, err, math.MaxFloat64, nil)
	})
	t.Run("NaN becomes ErrUndefinedResult", func(t *testing.T) {
		_, err := normalize(math.NaN())
		assertResult(t, 0, err, 0, ErrUndefinedResult)
	})
	t.Run("tiny values keep their magnitude", func(t *testing.T) {
		got, err := normalize(1e-300)
		assertResult(t, got, err, 1e-300, nil)
	})
}

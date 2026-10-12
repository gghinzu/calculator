package service

import (
	"math"
	"strconv"
)

// CalculatorServicePort is the contract the HTTP layer depends on.
// Depending on an interface (rather than the concrete type) keeps handlers
// easy to test with a fake implementation.
type CalculatorServicePort interface {
	Add(a, b float64) (float64, error)
	Subtract(a, b float64) (float64, error)
	Multiply(a, b float64) (float64, error)
	Divide(a, b float64) (float64, error)
	Power(base, exponent float64) (float64, error)
	Sqrt(a float64) (float64, error)
	Percentage(a, b float64) (float64, error)
}

// CalculatorService implements the arithmetic operations.
// It is stateless; every method is a pure function of its inputs.
type CalculatorService struct{}

// Compile-time check that CalculatorService satisfies the port.
var _ CalculatorServicePort = (*CalculatorService)(nil)

func NewCalculatorService() *CalculatorService {
	return &CalculatorService{}
}

func (s *CalculatorService) Add(a, b float64) (float64, error) {
	return compute(func() float64 { return a + b }, a, b)
}

func (s *CalculatorService) Subtract(a, b float64) (float64, error) {
	return compute(func() float64 { return a - b }, a, b)
}

func (s *CalculatorService) Multiply(a, b float64) (float64, error) {
	return compute(func() float64 { return a * b }, a, b)
}

func (s *CalculatorService) Divide(a, b float64) (float64, error) {
	if err := validateOperands(a, b); err != nil {
		return 0, err
	}
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return compute(func() float64 { return a / b }, a, b)
}

func (s *CalculatorService) Power(base, exponent float64) (float64, error) {
	if err := validateOperands(base, exponent); err != nil {
		return 0, err
	}
	// 0 ^ -n == 1 / 0^n, which is a division by zero.
	if base == 0 && exponent < 0 {
		return 0, ErrDivisionByZero
	}
	return compute(func() float64 { return math.Pow(base, exponent) }, base, exponent)
}

func (s *CalculatorService) Sqrt(a float64) (float64, error) {
	if err := validateOperands(a); err != nil {
		return 0, err
	}
	if a < 0 {
		return 0, ErrUndefinedResult
	}
	return compute(func() float64 { return math.Sqrt(a) }, a)
}

// Percentage returns b percent of a, i.e. a * b / 100.
// Example: Percentage(200, 10) == 20.
//
// Dividing first (a / 100 * b) avoids an intermediate overflow such as
// 1e308 * 50 overflowing before the division would bring it back in range.
func (s *CalculatorService) Percentage(a, b float64) (float64, error) {
	return compute(func() float64 { return a / 100 * b }, a, b)
}

// compute validates the operands, runs op and normalizes its result.
func compute(op func() float64, operands ...float64) (float64, error) {
	if err := validateOperands(operands...); err != nil {
		return 0, err
	}
	return normalize(op())
}

func validateOperands(operands ...float64) error {
	for _, v := range operands {
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return ErrInvalidOperand
		}
	}
	return nil
}

// significantDigits is the precision results are rounded to.
// float64 reliably represents 15 significant decimal digits, so rounding there
// removes binary floating-point noise (0.1 + 0.2 = 0.30000000000000004 -> 0.3)
// without losing any meaningful precision.
const significantDigits = 15

// normalize turns NaN/Inf into domain errors and rounds away float noise.
func normalize(result float64) (float64, error) {
	switch {
	case math.IsNaN(result):
		return 0, ErrUndefinedResult
	case math.IsInf(result, 0):
		return 0, ErrResultOutOfRange
	}

	rounded, err := strconv.ParseFloat(strconv.FormatFloat(result, 'g', significantDigits, 64), 64)
	if err != nil {
		// Rounding a value next to math.MaxFloat64 up can overflow;
		// the unrounded value is still a valid, finite result.
		rounded = result
	}

	// Avoid returning "-0" (e.g. -5 * 0) to clients.
	if rounded == 0 {
		return 0, nil
	}
	return rounded, nil
}

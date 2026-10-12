package dto

// Operands are pointers so that a missing field can be told apart from an
// explicit 0: {"a": 5} is rejected instead of being treated as {"a": 5, "b": 0}.

// BinaryOperationRequest is the body for add, subtract, multiply, divide,
// power (a = base, b = exponent) and percentage (b percent of a).
type BinaryOperationRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

// UnaryOperationRequest is the body for sqrt.
type UnaryOperationRequest struct {
	A *float64 `json:"a"`
}

package dto

// OperationResponse is the `data` payload of a successful calculation.
type OperationResponse struct {
	Operation string  `json:"operation"`
	Result    float64 `json:"result"`
}

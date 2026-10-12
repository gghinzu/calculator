# Shortcuts for the common tasks. Run `make help` to list them.

.PHONY: help install dev-backend dev-frontend test test-backend test-frontend lint coverage docker-build docker-run

COVERAGE_DIR := docs/coverage

help: ## List the available commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-14s %s\n", $$1, $$2}'

install: frontend/node_modules ## Install frontend dependencies (the backend has none)

# Installed automatically by the targets that need them, so `make test` works
# on a fresh clone. Re-runs only when the lockfile changes.
frontend/node_modules: frontend/package-lock.json
	cd frontend && npm ci
	@touch $@

dev-backend: ## Run the API on http://localhost:8080
	cd backend && go run ./cmd

dev-frontend: frontend/node_modules ## Run the UI on http://localhost:5173 (proxies /api to :8080)
	cd frontend && npm run dev

test: test-backend test-frontend ## Run all tests

test-backend: ## Backend: gofmt, vet and tests with the race detector
	cd backend && test -z "$$(gofmt -l .)" && go vet ./... && go test -race ./...

test-frontend: frontend/node_modules ## Frontend: lint, type-check/build and tests
	cd frontend && npm run lint && npm run build && npm test

lint: frontend/node_modules ## Lint both layers
	cd backend && test -z "$$(gofmt -l .)" && go vet ./...
	cd frontend && npm run lint

coverage: frontend/node_modules ## Regenerate the coverage reports in docs/coverage
	mkdir -p $(COVERAGE_DIR)
	cd backend && go test -coverpkg=./internal/...,./pkg/... -coverprofile=coverage.out ./... \
		&& go tool cover -html=coverage.out -o ../$(COVERAGE_DIR)/backend.html \
		&& go tool cover -func=coverage.out > ../$(COVERAGE_DIR)/backend.txt \
		&& rm coverage.out
	cd frontend && npx vitest run --coverage | sed -n '/% Coverage report/,$$p' > ../$(COVERAGE_DIR)/frontend.txt
	rm -rf $(COVERAGE_DIR)/frontend && cp -r frontend/coverage $(COVERAGE_DIR)/frontend
	@tail -n 1 $(COVERAGE_DIR)/backend.txt
	@grep 'Statements' $(COVERAGE_DIR)/frontend.txt

docker-build: ## Build the full-stack image
	docker build -t retro-calculator .

docker-run: ## Run the image on http://localhost:8080
	docker run --rm -p 8080:8080 retro-calculator

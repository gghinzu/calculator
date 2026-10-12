# Builds the whole app into one small image: the Go server serves both the
# REST API and the built React frontend from the same origin.
#
#   docker build -t retro-calculator .
#   docker run --rm -p 8080:8080 retro-calculator
#
# Three stages: two throwaway build stages (Node, Go) and a minimal runtime
# stage that only receives their outputs.

# --- 1. Frontend: install dependencies, then build static files -------------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
# Copy only the manifests first, so the slow `npm ci` layer is reused from
# cache until the dependencies themselves change.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- 2. Backend: compile a static Go binary --------------------------------
FROM golang:1.24-alpine AS backend
WORKDIR /app/backend
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
# CGO off gives a fully static binary that runs without libc.
# -trimpath and -s -w drop local paths and debug info for a smaller binary.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd

# --- 3. Runtime: just the binary and the static files -----------------------
# Distroless has no shell or package manager: a smaller image with almost
# nothing to attack. The ":nonroot" variant runs as an unprivileged user.
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=backend /out/server /app/server
COPY --from=frontend /app/frontend/dist /app/public

ENV PORT=8080 \
    STATIC_DIR=/app/public
EXPOSE 8080

# No curl in this image, so the server binary checks its own /health.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/app/server", "healthcheck"]

ENTRYPOINT ["/app/server"]

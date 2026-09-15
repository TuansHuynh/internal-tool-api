# =============================================================================
# Dockerfile — Internal API Client (API Tester Pro)
# Build môi trường để biên dịch ứng dụng Desktop Wails v2
#
# Đây là BUILD IMAGE, không phải runtime image.
# Desktop App (Wails) không thể chạy trong container — Docker được dùng
# để tạo môi trường build nhất quán, output là file .exe / binary.
#
# Hỗ trợ build:
#   - Linux  (amd64)  : mặc định
#   - Windows (amd64) : dùng ARG TARGET=windows
# =============================================================================

# ─── Stage 1: Base image với Go + Node.js ────────────────────────────────────
FROM golang:1.25-bookworm AS base

ARG NODE_VERSION=18
ARG WAILS_VERSION=v2.12.0
ARG TARGET=linux

LABEL maintainer="TuansHuynh <nkoc.nho.17.04@gmail.com>"
LABEL description="Build environment for Internal API Client — API Tester Pro"
LABEL version="1.3.3"

# Cài đặt Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && node -v && npm -v

# Cài đặt dependencies cho Wails build trên Linux (webkit2gtk)
RUN apt-get install -y --no-install-recommends \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    gcc \
    pkg-config \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Wails CLI
RUN go install github.com/wailsapp/wails/v2/cmd/wails@${WAILS_VERSION}

# ─── Stage 2: Fetch Go dependencies (cache layer) ────────────────────────────
FROM base AS deps

WORKDIR /app

# Copy go.mod + go.sum trước để tận dụng Docker layer cache
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy frontend package files để cache npm install
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci --prefer-offline

# ─── Stage 3: Build ──────────────────────────────────────────────────────────
FROM deps AS builder

ARG TARGET=linux

# Copy toàn bộ source code
COPY . .

# Build frontend (Vite)
RUN cd frontend && npm run build

# Build ứng dụng Wails
# Không dùng -clean vì build/bin có thể là bind-mount từ host
# (unlinkat error nếu dùng -clean trên mounted volume)
# - linux/amd64  : default (dùng trong CI/CD Linux)
# - windows/amd64: cross-compile ra .exe (CGO-free nhờ modernc.org/sqlite)
RUN if [ "$TARGET" = "windows" ]; then \
        CGO_ENABLED=0 GOOS=windows GOARCH=amd64 \
        wails build -platform windows/amd64 -s; \
    else \
        wails build -platform linux/amd64; \
    fi

# ─── Stage 4: Export — chỉ giữ lại binary output ────────────────────────────
FROM scratch AS export

COPY --from=builder /app/build/bin/ /output/

# Internal API Client — API Tester Pro

> **Ứng dụng Desktop kiểm thử & đo tải RESTful API** được xây dựng trên kiến trúc hiện đại **Go + React 18 + Wails v2**, hướng đến trải nghiệm IDE chuẩn Postman / Insomnia.

<p align="center">
  <img src="https://img.shields.io/badge/version-v1.3.3-blue?style=for-the-badge" alt="version"/>
  <img src="https://img.shields.io/badge/Go-1.25.0-00ADD8?style=for-the-badge&logo=go" alt="go"/>
  <img src="https://img.shields.io/badge/Wails-v2.12.0-red?style=for-the-badge" alt="wails"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" alt="react"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="typescript"/>
  <img src="https://img.shields.io/badge/SQLite-pure_Go-003B57?style=for-the-badge&logo=sqlite" alt="sqlite"/>
</p>

---

## 📖 Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Thông tin dự án](#2-thông-tin-dự-án)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Tech Stack](#4-tech-stack)
5. [Tính năng](#5-tính-năng)
6. [Cấu trúc thư mục](#6-cấu-trúc-thư-mục)
7. [Cài đặt & Chạy ứng dụng](#7-cài-đặt--chạy-ứng-dụng)
8. [Version Automation](#8-version-automation)
9. [Hướng dẫn sử dụng](#9-hướng-dẫn-sử-dụng)
10. [Bảo trì & Phát triển](#10-bảo-trì--phát-triển)

---

## 1. Giới thiệu

**Internal API Client** (API Tester Pro v2.0) là ứng dụng Desktop hiệu năng cao chuyên biệt cho việc **kiểm thử, quản lý và đo tải (Load & Stress Testing)** các hệ thống RESTful API.

Điểm khác biệt cốt lõi so với các công cụ tương tự:

- 🚀 **Backend Go thuần túy** — Engine HTTP tự xây dựng với `net/http/httptrace`, bóc tách chi tiết từng giai đoạn mạng (DNS → TCP → TLS → TTFB → Download).
- ⚡ **Goroutine Stress Test** — Tận dụng đa luồng bất đồng bộ của Go để giả lập hàng nghìn request/giây với nút hủy tức thì.
- 💾 **Embedded SQLite (pure Go)** — Lưu trữ vĩnh viễn Projects, Folders, Requests, Environments mà không cần CGO hay GCC.
- 🎨 **Dark IDE Experience** — Monaco Editor, tab kéo thả, splitter co dãn, phím tắt toàn cục.

---

## 2. Thông tin dự án

| Trường | Giá trị |
|---|---|
| **Tác giả** | Huỳnh Tuấn (Tunas) |
| **Email** | tuanhuynh170424@gmail.com |
| **Phiên bản** | `v1.3.3` |
| **Build date** | 2026-09-14 |
| **Repository** | https://github.com/TuansHuynh/internal-tool-api |
| **License** | MIT |

---

## 3. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│              TẦNG GIAO DIỆN (React 18 + TypeScript + Vite)      │
│                                                                 │
│  MainLayout ──► Sidebar ──► RequestPanel ──► ResponsePanel      │
│       │                                                         │
│  AppContext ◄── StressTestModal ── EnvironmentModal             │
│       │                                                         │
│  curlParser.ts (Import cURL / Code Generator)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │  Wails IPC Bridge (wailsjs/go/main/App)
┌─────────────────────────▼───────────────────────────────────────┐
│                   TẦNG BACKEND (Go 1.25.0)                      │
│                                                                 │
│  app.go (IPC Controller)                                        │
│     ├── core/client.go  ──► HTTP Engine + httptrace Timing      │
│     ├── core/client.go  ──► Goroutine Stress Engine + Cancel    │
│     └── db.go           ──► SQLite DBManager (Auto-migration)   │
│                                   │                             │
│                         api_client.db (SQLite local)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack

### Backend

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Ngôn ngữ | Go | 1.25.0 |
| Desktop Framework | Wails v2 | v2.12.0 |
| Database Driver | modernc.org/sqlite (pure Go, no CGO) | v1.53.0 |
| HTTP Tracing | net/http/httptrace | stdlib |
| Concurrency | Goroutines + Channels + context.Cancel | stdlib |

### Frontend

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Framework | React | 18 |
| Ngôn ngữ | TypeScript | 5 |
| Bundler | Vite | latest |
| Code Editor | @monaco-editor/react | latest |
| State Management | React Context API (AppContext) | — |

---

## 5. Tính năng

### 🌐 HTTP Client Engine

- **Phương thức:** `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`
- **Cấu hình URL:** Base URL + Port động (bật/tắt) + Endpoint Path
- **Query Params 2 chiều:** Bảng Key-Value tự đồng bộ với thanh Omnibar (gõ `?key=val` → bảng cập nhật; sửa bảng → URL cập nhật)
- **Headers:** Bảng Key-Value có checkbox bật/tắt từng header riêng lẻ

### 🔐 Xác thực đa dạng (Multi-Auth)

| Loại Auth | Mô tả |
|---|---|
| **No Auth** | Không xác thực |
| **Bearer Token** | Hỗ trợ token hoặc `{{token}}` kèm JWT Inspector giải mã claims và kiểm tra thời hạn |
| **Basic Auth** | Nhập Username & Password, tự động mã hóa Base64 → `Authorization: Basic ...` |
| **API Key** | Tên key + giá trị, tùy chọn gắn vào Header hoặc Query Params |

### 📦 Body Types

| Loại | Mô tả |
|---|---|
| **JSON** | Monaco Editor với nút `✨ Format JSON` (Beautifier) |
| **Raw** | Monaco Editor hỗ trợ plaintext / XML |
| **x-www-form-urlencoded** | Bảng Key-Value, tự động gán `Content-Type` tương ứng |
| **None** | Không gửi body |

### 📡 Network Timing Breakdown

Phân tích chi tiết độ trễ mạng qua `net/http/httptrace`:

| Pha | Mô tả |
|---|---|
| **DNS Lookup** | Thời gian phân giải tên miền |
| **TCP Connect** | Thời gian thiết lập kết nối TCP |
| **TLS Handshake** | Thời gian bắt tay SSL/TLS |
| **TTFB** | Time to First Byte — từ khi gửi đến byte phản hồi đầu tiên |
| **Content Download** | Thời gian đọc body response |
| **Total** | Tổng thời gian hoàn thành request |

### ⚡ Goroutine Stress / Load Testing

- Cấu hình **VUs (Virtual Users)** và **Total Requests**
- Metrics real-time: **RPS (Throughput)**, **Average Latency**, **Success Rate**, **Error Count**
- **Nút "🛑 Dừng Đo Tải"** — hủy toàn bộ Goroutine an toàn qua `context.CancelFunc`

### 📥 Import / Export & Code Generator

- **Import cURL:** Dán lệnh `curl ...` → tự động điền Method, URL, Headers, Body, Auth
- **Export cURL:** 1 click copy request hiện tại thành lệnh `curl` chạy được trong Terminal
- **Code Snippets Generator** (6 ngôn ngữ):
  - `cURL` · `JavaScript Fetch` · `Axios` · `Python Requests` · `Go net/http` · `Node.js https`

### 💾 SQLite — Lưu trữ vĩnh viễn

Dữ liệu lưu tại máy cục bộ:

- **Windows:** `%APPDATA%\internal-api-client\api_client.db`
- **macOS / Linux:** `~/.config/internal-api-client/api_client.db`

Schema tự động migration gồm: `projects` · `folders` · `requests` · `environments` · `env_variables`

### 🌍 Biến môi trường (Environment Variables)

- Quản lý nhiều môi trường (Local, Dev, Staging, Production)
- Cú pháp `{{variable}}` dùng trong URL, Headers, Body, Auth
- Duplicate môi trường, Export JSON
- Lưu vĩnh viễn vào SQLite (không mất dữ liệu khi restart)

### ⌨️ Phím tắt toàn cục

| Phím tắt | Hành động |
|---|---|
| `Ctrl + Enter` | Gửi request ngay lập tức |
| `Ctrl + T` | Mở Tab Request mới |
| `Ctrl + W` | Đóng Tab hiện tại |

### 🗂️ Sidebar & Collections

- Cây phân cấp: **Project → Folder → Request**
- Tab **History** theo dõi lịch sử các request đã gửi
- Thanh Search nhanh
- Import / Export JSON tương thích định dạng Postman Workspace

---

## 6. Cấu trúc thư mục

```text
internal-api-client/
├── build/                          # Cấu hình icon, metadata và binary output
│   └── bin/                        # File thực thi production (.exe)
├── core/
│   └── client.go                   # HTTP Engine + httptrace + Goroutine Stress Test + Cancel
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── EnvironmentModal/   # Modal quản lý biến môi trường (SQLite-backed)
│   │   │   ├── RequestPanel/       # Omnibar, Params 2-way, Headers, Body, Auth, cURL, CodeGen
│   │   │   ├── ResponsePanel/      # Status, Timing Breakdown, Pretty/Raw/HTML Preview
│   │   │   ├── Sidebar/            # Collections Tree, History, Search, Import/Export JSON
│   │   │   ├── StressTestModal/    # Console đo tải real-time + nút Cancel
│   │   │   └── common/             # Button, Modal — UI primitives tái sử dụng
│   │   ├── context/
│   │   │   └── AppContext.tsx      # State trung tâm, Auto-Save, Global Keybindings
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx      # Edge-to-edge IDE (Sidebar 280px + Workspace)
│   │   ├── pages/
│   │   │   └── Workspace/          # Tab bar Postman-style, Vertical Splitter
│   │   ├── utils/
│   │   │   └── curlParser.ts       # Parser cURL & Code Generator đa ngôn ngữ
│   │   ├── App.tsx                 # Root — bọc AppProvider & MainLayout
│   │   ├── main.tsx                # React DOM entry point
│   │   └── style.css               # Design tokens, Dark theme, typography, scrollbar
│   ├── wailsjs/                    # Go → TypeScript bindings (tự động sinh bởi Wails)
│   │   ├── go/main/App.js          # JS bindings
│   │   ├── go/main/App.d.ts        # TypeScript types
│   │   └── go/models.ts            # Shared model types
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   ├── bump-version.js             # SemVer automation (patch/minor/major + build)
│   └── sync-version.js             # Đồng bộ version qua các file config
├── app.go                          # IPC Controller — kết nối Frontend ↔ Core Engine ↔ DB
├── db.go                           # SQLite DBManager — Auto-migration, CRUD toàn bộ entities
├── main.go                         # Entry point — khởi động Wails window
├── go.mod / go.sum                 # Go module dependencies
├── wails.json                      # Cấu hình Wails project
├── package.json                    # npm scripts (bump:patch, bump:minor, release...)
├── version.json                    # Single source of truth cho version metadata
├── MOTA-ALL.md                     # Tài liệu kiến trúc chi tiết đầy đủ
└── README.md                       # Tài liệu này
```

---

## 7. Cài đặt & Chạy ứng dụng

### Yêu cầu tiên quyết

| Công cụ | Phiên bản tối thiểu | Cài đặt |
|---|---|---|
| **Go** | 1.21+ (khuyến nghị 1.25.0) | https://go.dev/dl |
| **Node.js** | 16 LTS+ | https://nodejs.org |
| **Wails CLI** | v2.x | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` |

> **Lưu ý:** Driver SQLite dùng `modernc.org/sqlite` (pure Go) — **không cần CGO, không cần GCC/mingw**.

### Chế độ Development (Hot Reload)

```bash
# Clone repository
git clone https://github.com/TuansHuynh/internal-tool-api.git
cd internal-tool-api

# Khởi chạy với live reload (tự động cài npm dependencies)
wails dev
```

### Build Production

```bash
wails build
```

Output: `build/bin/internal-api-client-v1.3.3.exe` (Windows)

---

## 8. Version Automation

Hệ thống tự động đồng bộ SemVer qua tất cả file cấu hình (`wails.json`, `package.json`, `version.json`, `app.go`):

```bash
# Nâng Patch:  1.3.3 → 1.3.4
npm run bump:patch

# Nâng Minor:  1.3.3 → 1.4.0
npm run bump:minor

# Nâng Major:  1.3.3 → 2.0.0
npm run bump:major

# Chỉ định version cụ thể
node scripts/bump-version.js 2.0.0

# Nâng version + đổi tên app
node scripts/bump-version.js minor --name="API Tester Ultimate"

# Nâng version + tự động wails build
npm run release
# hoặc
node scripts/bump-version.js patch --build
```

---

## 9. Hướng dẫn sử dụng

### Bước 1 — Quản lý Workspace (Collections)

1. **Tạo Project** → nhấn `+` trên Sidebar, đặt tên dự án.
2. **Tạo Folder** → click chuột phải vào Project → *Add Folder* để phân nhóm API theo module.
3. **Tạo Request** → click `+` trong Folder, chọn HTTP Method và đặt tên.

### Bước 2 — Xây dựng Request

- **Omnibar:** Nhập method, Base URL, Port (bật/tắt), Endpoint path.
- **Params tab:** Nhập query params theo bảng hoặc gõ trực tiếp `?key=val` trên URL — tự đồng bộ 2 chiều.
- **Headers tab:** Thêm headers dạng Key-Value, checkbox bật/tắt từng header.
- **Body tab:** Chọn `JSON` / `Raw` / `form-urlencoded` / `None`, soạn thảo qua Monaco Editor.
- **Auth tab:** Chọn loại xác thực (Bearer / Basic / API Key / No Auth).
- **Import cURL:** Nhấn nút `Import cURL`, dán lệnh curl → tự động điền toàn bộ cấu hình.

### Bước 3 — Gửi & Phân tích Response

Nhấn `Send` hoặc `Ctrl + Enter`. **Response Panel** hiển thị:

- Status Code (badge màu sắc), thời gian phản hồi (ms), dung lượng (bytes)
- **Timing Breakdown:** DNS / TCP / TLS / TTFB / Download (thanh progress trực quan)
- Body với 3 chế độ: `Pretty` (Monaco) · `Raw` · `Preview` (HTML iframe)
- Response Headers dạng bảng

### Bước 4 — Stress / Load Testing

1. Nhấn nút **⚡ Stress Test** trên tab request.
2. Cấu hình: **Virtual Users (VUs)** và **Total Requests**.
3. Nhấn **Start Test** → theo dõi real-time console:
   - RPS, Average Latency, Success / Failure count
4. Nhấn **🛑 Dừng** bất kỳ lúc nào để cancel an toàn tất cả Goroutines.

### Bước 5 — Biến môi trường

1. Mở **Environment Modal** (biểu tượng `{}` trên toolbar).
2. Tạo môi trường (Dev, Staging, Production...), thêm biến `key = value`.
3. Sử dụng trong URL / Headers / Body / Auth: `{{base_url}}`, `{{token}}`.
4. Chuyển đổi môi trường active từ dropdown.

---

## 10. Bảo trì & Phát triển

| Nhiệm vụ | File cần chỉnh sửa |
|---|---|
| Thêm/sửa API endpoint Go | `app.go` + regenerate bindings bằng `wails generate module` |
| Cập nhật schema DB | Hàm `InitDB()` trong `db.go` |
| Tính năng HTTP Client / Stress Engine | `core/client.go` |
| Thêm UI Component | `frontend/src/components/` |
| Sửa state / business logic | `frontend/src/context/AppContext.tsx` |
| Cập nhật cURL parser / Code Generator | `frontend/src/utils/curlParser.ts` |
| Cập nhật styles / design tokens | `frontend/src/style.css` |

---

<p align="center">
  Made with ❤️ by <strong>Huỳnh Tuấn (Tunas)</strong> &nbsp;·&nbsp; v1.3.3
</p>

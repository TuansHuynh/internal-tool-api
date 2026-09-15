# TÀI LIỆU KIẾN TRÚC & MÔ TẢ TOÀN BỘ DỰ ÁN (INTERNAL API CLIENT - API TESTER PRO v2.0)

---

## 📖 1. TỔNG QUAN DỰ ÁN

**Internal API Client (API Tester Pro v2.0)** là ứng dụng máy tính (Desktop Application) hiệu năng cao chuyên biệt cho việc kiểm thử, quản lý và đo tải (Load & Stress Testing) các hệ thống RESTful API.

Ứng dụng được xây dựng dựa trên kiến trúc hiện đại kết hợp giữa **Go (Golang)** ở tầng Backend xử lý mạng / đa luồng và **React 18 + TypeScript + Vite + Monaco Editor** ở tầng Frontend giao diện, đóng gói thông qua framework **Wails v2**.

### 🎯 Mục Tiêu & Giá Trị Cốt Lõi
1. **Kiểm thử API Toàn Diện**: Hỗ trợ đầy đủ các phương thức HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`), cấu hình Base URL, Port động, Endpoint Path, Query Params 2 chiều, Headers, Payload Body (JSON, Raw text, x-www-form-urlencoded), Đa dạng Auth (Bearer Token + JWT Inspector, Basic Auth, API Key).
2. **Nhập / Xuất cURL & Sinh Mã Nguồn (Code Generator)**: 1 click Import cURL để tự động điền cấu hình, hoặc sinh mã nguồn thực thi độc lập bằng cURL, Python Requests, JavaScript Fetch, Axios, Go, Node.js.
3. **Phân Tích Độ Trễ Mạng Chuyên Sâu (Network Timing Breakdown)**: Bóc tách chi tiết thời gian DNS Lookup, TCP Connect, TLS Handshake, TTFB (Time to First Byte) và Content Download thông qua Go `httptrace`.
4. **Đo Tải Đa Luồng Goroutine (Stress / Load Testing)**: Tận dụng sức mạnh đa luồng bất đồng bộ của Go để thực thi hàng nghìn requests/giây, đo đạc RPS (Throughput), Độ trễ trung bình (Latency), Tỷ lệ thành công và hỗ trợ nút Dừng đo tải tức thì (Cancel).
5. **Lưu Trữ CSDL Nhúng Vĩnh Viễn (Embedded SQLite)**: Tự động lưu trữ cấu trúc Dự án (Projects), Thư mục (Folders), Request sessions và Biến Môi Trường (Environments) vào tệp CSDL SQLite cục bộ trên máy tính người dùng (`modernc.org/sqlite` pure Go).
6. **Trải Nghiệm IDE Chuẩn Postman / Insomnia**: Giao diện Dark theme cao cấp, thanh tab ngang kéo thả, thanh chia co dãn chiều dọc (Vertical Resizable Splitter), Response Preview HTML, hỗ trợ phím tắt toàn cục (`Ctrl+Enter`, `Ctrl+T`, `Ctrl+W`).

---

## 🏗️ 2. KIẾN TRÚC HỆ THỐNG TỔNG THỂ

```mermaid
graph TD
    subgraph Frontend [TẦNG GIAO DIỆN (React 18 + TypeScript + Vite)]
        UI[MainLayout / Workspace]
        Sidebar[Sidebar: Collections, History, Import/Export JSON]
        ReqPanel[RequestPanel: Omnibar, Params 2-way, Headers, Body types, Multi-Auth, Import cURL, Code Gen]
        ResPanel[ResponsePanel: Status, Timing Breakdown, Pretty/Raw/Preview HTML, Headers]
        EnvModal[Environment Modal: SQLite Saved {{var}}]
        StressModal[Stress Test Modal: Đo tải VUs/RPS + Nút Hủy]
        Context[AppContext: State Management & Auto-Save & Keybindings]
        CurlUtil[curlParser.ts: Import/Export cURL & Code Generator]
    end

    subgraph IPC [CẦU NỐI TRUYỀN THÔNG (Wails IPC Bridge)]
        WailsJS[wailsjs/go/main/App]
    end

    subgraph Backend [TẦNG XỬ LÝ BACKEND (Golang Core)]
        AppController[app.go: App Controller]
        HttpEngine[core/client.go: HttpClientEngine + httptrace]
        StressEngine[core/client.go: Goroutine Load Tester + Cancel]
        DBManager[db.go: SQLite Pure Go DBManager]
    end

    subgraph Storage [LƯU TRỮ CỤC BỘ (Local Storage)]
        SQLiteDB[(SQLite: api_client.db)]
    end

    UI --> Context
    Sidebar --> Context
    ReqPanel --> Context
    ResPanel --> Context
    EnvModal --> Context
    StressModal --> Context
    Context --> CurlUtil
    Context --> WailsJS

    WailsJS --> AppController
    AppController --> HttpEngine
    AppController --> StressEngine
    AppController --> DBManager
    DBManager --> SQLiteDB
```

---

## 📂 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
internal-api-client/
├── build/                        # Cấu hình icon, metadata và thư mục build nhị phân (bin)
│   └── bin/                      # Chứa file thực thi production (.exe)
├── core/                         # Module xử lý HTTP Client & Stress Engine thuần Go
│   └── client.go                 # Struct Request/Response, Timing Breakdown, Goroutine Stress Test + Cancel
├── frontend/                     # Toàn bộ mã nguồn giao diện React + TS + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── EnvironmentModal/ # Modal quản lý biến môi trường lưu SQLite
│   │   │   ├── RequestPanel/     # Omnibar, Params 2-way, Headers, Body types, Multi-Auth, Import cURL, Code Generator
│   │   │   ├── ResponsePanel/    # Khung Response co dãn 100%, Timing Breakdown, HTML Preview, Pretty/Raw
│   │   │   ├── Sidebar/          # Collections Tree, History tab, Search bar, Import/Export Postman & Workspace
│   │   │   └── StressTestModal/  # Console đo tải Goroutine có nút Dừng tức thì
│   │   ├── context/
│   │   │   └── AppContext.tsx    # State trung tâm, 2-way sync Params, Multi-Auth, SQLite sync, Global Shortcuts
│   │   ├── utils/
│   │   │   └── curlParser.ts     # Bộ phân tích cURL và sinh mã nguồn đa ngôn ngữ
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx    # Bố cục Edge-to-edge IDE (Sidebar 280px + Workspace)
│   │   ├── pages/
│   │   │   └── Workspace/        # Tab bar Postman-style, Vertical Splitter, điều phối panel
│   │   ├── App.tsx               # Root App bọc AppProvider & MainLayout
│   │   ├── main.tsx              # Điểm gắn React DOM (#root)
│   │   └── style.css             # Design tokens, Dark theme, typography & scrollbar
│   ├── wailsjs/                  # Go-to-TypeScript bindings tự động sinh bởi Wails
│   ├── package.json              # Khai báo thư viện: React, Monaco Editor React
│   └── vite.config.ts            # Cấu hình Vite bundler
├── app.go                        # Controller kết nối IPC Wails với Core Engine & DB
├── db.go                         # Khởi tạo SQLite, Auto-Migration, CRUD Projects/Folders/Requests/Environments
├── main.go                       # Khởi động ứng dụng Desktop Wails, cấu hình Window
├── go.mod / go.sum               # Khai báo Go dependencies (Wails v2, SQLite driver)
├── wails.json                    # Cấu hình dự án Wails
├── README.md                     # Hướng dẫn tổng quan
└── MOTA-ALL.md                   # Tài liệu mô tả chi tiết toàn bộ dự án
```

---

## ⚙️ 4. CHI TIẾT CÁC TÍNH NĂNG MỚI ĐÃ NÂNG CẤP

### 4.1. Tab Query Params Đồng Bộ 2 Chiều (2-Way Sync)
- Khi nhập/sửa ở bảng **Params** (Key, Value, Description, Checkbox bật/tắt), thanh URL Omnibar sẽ tự động cập nhật chuỗi `?key=value`.
- Ngược lại, khi người dùng gõ trực tiếp `?page=2&limit=50` trên thanh Endpoint Path, bảng Params sẽ tự động bóc tách và hiển thị danh sách tương ứng.

### 4.2. Nhập / Xuất cURL & Sinh Mã Nguồn Đa Ngôn Ngữ
- **Import cURL**: Người dùng mở modal, dán lệnh `curl ...` (copy từ DevTools hoặc tài liệu) ➔ App tự động phân tích Method, Headers, URL, Body, Auth và điền sẵn vào tab.
- **Copy cURL**: 1 click sao chép toàn bộ request hiện tại dưới dạng câu lệnh cURL sẵn sàng chạy trong Terminal.
- **Code Snippets Generator**: Sinh mã nguồn độc lập cho **cURL, JavaScript Fetch, Axios, Python Requests, Go net/http, Node.js https**.

### 4.3. Đa Dạng Hóa Loại Body & Phương Thức Xác Thực (Auth)
- **Body Types**:
  - `JSON`: Monaco Editor với tính năng `✨ Format JSON` (Beautifier).
  - `Raw (Text / XML)`: Monaco Editor hỗ trợ plaintext/XML.
  - `x-www-form-urlencoded`: Bảng Key-Value trực quan, tự động gán header `Content-Type: application/x-www-form-urlencoded`.
  - `None`: Không gửi body.
- **Auth Types**:
  - `No Auth`: Không xác thực tự động.
  - `Bearer Token`: Hỗ trợ token hoặc `{{token}}` kèm bộ giải mã **JWT Inspector** hiển thị claims và cảnh báo thời hạn token.
  - `Basic Auth`: Nhập Username & Password, tự động mã hóa Base64 và chèn header `Authorization: Basic ...`.
  - `API Key`: Nhập Tên Key & Giá trị, tùy chọn gắn vào **Request Headers** hoặc **Query Params**.

### 4.4. Phân Tích Độ Trễ Mạng (Network Timing Breakdown)
- Tích hợp `net/http/httptrace` trong Go Backend để đo đạc và trả về:
  - **DNS Lookup**: Thời gian phân giải tên miền.
  - **TCP Connection**: Thời gian thiết lập kết nối TCP.
  - **TLS Handshake**: Thời gian bắt tay bảo mật SSL/TLS.
  - **TTFB (Time to First Byte)**: Thời gian từ lúc gửi request tới byte phản hồi đầu tiên.
  - **Content Download**: Thời gian đọc nội dung body.
  - **Total Duration**: Tổng thời gian hoàn thành.

### 4.5. Lưu Trữ Vĩnh Viễn Biến Môi Trường (Environments) Vào SQLite
- Toàn bộ Environments và biến môi trường được lưu vào SQLite Database cục bộ (`environments`, `env_variables`), không lo bị mất dữ liệu khi khởi động lại ứng dụng.
- Hỗ trợ nhân bản môi trường (Duplicate) và xuất file JSON (Export).

### 4.6. Nâng Cấp Console Đo Tải (Stress Testing)
- Thêm nút **"🛑 Dừng Đo Tải (Cancel)"** giúp người dùng chủ động ngắt tiến trình kiểm thử tải nặng bất kỳ lúc nào một cách an toàn.

### 4.7. Phím Tắt Toàn Cục (Global Keybindings)
- `Ctrl + Enter` (hoặc `Cmd + Enter`): Thực thi gửi API ngay lập tức.
- `Ctrl + T`: Mở Tab Request mới.
- `Ctrl + W`: Đóng Tab Request hiện tại.

---

## 💻 5. HƯỚNG DẪN CÀI ĐẶT & BIÊN DỊCH

### 5.1. Chạy Ứng Dụng Trong Chế Độ Phát Triển (Development)
```bash
wails dev
```

### 5.2. Đóng Gói Ứng Dụng (Production Build)
```bash
wails build
```
File thực thi độc lập sẽ được tạo tại `build/bin/internal-api-client-vX.Y.Z.exe`.

### 5.3. Tự Động Nâng Cấp Version & Đặt Tên Ứng Dụng (Version Automation)

Hệ thống cung cấp công cụ tự động hóa toàn bộ việc cập nhật phiên bản (SemVer) và đổi tên ứng dụng đồng bộ qua các tệp cấu hình (`wails.json`, `package.json`, `version.json`, `app.go` runtime):

```bash
# Nâng cấp Patch Version: 1.3.1 -> 1.3.2
npm run bump:patch

# Nâng cấp Minor Version: 1.3.1 -> 1.4.0
npm run bump:minor

# Nâng cấp Major Version: 1.3.1 -> 2.0.0
npm run bump:major

# Chỉ định chính xác version mong muốn:
node scripts/bump-version.js 2.1.0

# Nâng cấp version kèm đổi tên ứng dụng:
node scripts/bump-version.js minor --name="API Tester Ultimate"

# Nâng cấp version và tự động đóng gói ứng dụng (Build Binary):
npm run release
# hoặc
node scripts/bump-version.js patch --build
```

```bash
# 2. Commit + tag + push
git add .

git commit -m "chore: release v1.3.4"

git tag v1.3.4

git push origin master --tags
```
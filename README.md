# TÀI LIỆU ĐẶC TẢ VÀ HƯỚNG DẪN SỬ DỤNG - INTERNAL API CLIENT

## 1. Giới thiệu chung
**Internal API Client** là một ứng dụng máy tính (Desktop Application) nhẹ, hiệu năng cao, được thiết kế để quản lý và kiểm thử các API HTTP. Ứng dụng này giúp lập trình viên gửi các yêu cầu HTTP (API Requests), quản lý tài nguyên theo Dự án (Projects) / Thư mục (Folders), quản lý các biến môi trường (Environment Variables) và đặc biệt tích hợp công cụ kiểm thử hiệu năng / đo tải hệ thống (Stress/Load Testing) bằng cơ chế song song (Goroutines) mạnh mẽ của ngôn ngữ Go.

## 2. Thông tin tác giả
- **Tác giả:**  Huỳnh Tuấn (Tunas)
- **Email:** tuanhuynh170424@gmail.com
- **Phiên bản:** `v1.3.1`

## 3. Kiến trúc & Công nghệ (Tech Stack)
Ứng dụng được xây dựng trên mô hình kết hợp giữa giao diện web hiện đại và hiệu năng backend mạnh mẽ của Go:

### Backend (Go 1.25.0)
- **Framework:** **Wails v2** (`v2.12.0`) - Hỗ trợ liên kết trực tiếp (Binding) mã nguồn Go với giao diện frontend thông qua giao thức IPC siêu nhẹ.
- **Engine HTTP:** Tự xây dựng trong thư viện [core/client.go](file:///c:/Users/nkocn/OneDrive/Desktop/Plan/internal-tool/internal-api-client/core/client.go), sử dụng `net/http` tiêu chuẩn của Go kết hợp với cấu hình `http.Transport` tối ưu (hỗ trợ bỏ qua kiểm tra chứng chỉ SSL/TLS không an toàn, tuỳ chỉnh Timeout, Header mặc định và đo lường kích thước/thời gian phản hồi chuẩn xác).
- **Stress Test Engine:** Tận dụng cơ chế **Goroutines** và **Channels** của Go để giả lập hàng trăm/hàng nghìn yêu cầu đồng thời (Concurrency) gửi đến server đích mà không làm treo UI, tính toán thời gian phản hồi trung bình và tỷ lệ thành công/thất bại chính xác.
- **Database:** **SQLite** sử dụng driver **`modernc.org/sqlite`** (phiên bản SQLite viết 100% bằng Go, không cần CGO, giúp quá trình cài đặt và biên dịch trên mọi hệ điều hành vô cùng đơn giản và không phụ thuộc vào GCC/mingw).

### Frontend (React + TypeScript)
- **Bộ dựng dự án:** **Vite** (nhanh và tối ưu hóa tốt).
- **Ngôn ngữ:** **TypeScript** giúp kiểm soát chặt chẽ kiểu dữ liệu.
- **UI Framework:** **React 18** sử dụng cấu trúc Context API (`AppContext`) quản lý trạng thái tập trung (Tab hoạt động, danh sách Projects, Biến môi trường, Lịch sử request và Kết quả Stress Test).
- **Code Editor:** **`@monaco-editor/react`** mang lại trải nghiệm viết Body (JSON/Text) và xem phản hồi giống như Visual Studio Code, hỗ trợ highlight cú pháp chuyên nghiệp.

### Cơ sở dữ liệu (SQLite Schema)
Dữ liệu dự án được lưu cục bộ tại máy tính của người dùng tại đường dẫn:
- **Windows:** `%APPDATA%\internal-api-client\api_client.db`
- **macOS / Linux:** `~/.config/internal-api-client/api_client.db`

Cấu trúc gồm 3 bảng chính (khởi tạo tại [db.go](file:///c:/Users/nkocn/OneDrive/Desktop/Plan/internal-tool/internal-api-client/db.go)):
1. `projects`: Lưu trữ thông tin dự án (`id`, `name`).
2. `folders`: Quản lý cấu trúc thư mục phân cấp (`id`, `project_id`, `parent_id`, `name`).
3. `requests`: Lưu trữ thông tin chi tiết từng API Request (`id`, `project_id`, `folder_id`, `name`, `method`, `base_url`, `port`, `use_port`, `api_path`, `req_body`, `headers_json`).

---

## 4. Cấu trúc thư mục dự án

Cấu trúc cây thư mục của dự án **Internal API Client** được tổ chức như sau:

```text
internal-api-client/
├── build/                # Chứa các file build, icon và cấu hình cho từng nền tảng (Windows, macOS)
│   ├── bin/              # Chứa file thực thi sau khi build hoàn tất (.exe, .app)
│   ├── darwin/           # Các file cấu hình riêng cho hệ điều hành macOS (Info.plist)
│   └── windows/          # Các file cấu hình và manifest cho hệ điều hành Windows
├── core/                 # Thư viện core xử lý logic nghiệp vụ bằng Go
│   ├── client.go         # Định nghĩa cấu trúc dữ liệu Request/Response, client HTTP và stress test engine
│   ├── models.go         # Khai báo package core, chưa có code
│   └── stress_test.go    # Khai báo package core, chưa có code
├── frontend/             # Chứa toàn bộ mã nguồn giao diện (React + TypeScript + Vite)
│   ├── dist/             # Tài nguyên frontend được biên dịch (HTML/JS/CSS), Go tự động embed vào file thực thi
│   ├── src/              # Mã nguồn React
│   │   ├── assets/       # Tài nguyên tĩnh (ảnh, logo...)
│   │   ├── components/   # Các UI Component chính (Sidebar, RequestPanel, ResponsePanel, common)
│   │   ├── context/      # React Context (AppContext.tsx) quản lý state và IPC của ứng dụng
│   │   ├── hooks/        # Các custom hooks của React
│   │   ├── layouts/      # Bố cục giao diện chính
│   │   └── pages/        # Trang giao diện chính (Workspace.tsx)
│   ├── index.html        # File template HTML chính cho frontend
│   ├── package.json      # Quản lý dependency và script chạy của frontend (React, Monaco Editor)
│   ├── tsconfig.json     # Cấu hình TypeScript
│   └── vite.config.ts    # Cấu hình build Vite
├── app.go                # Tầng API kết nối (Binding) giữa frontend React và backend Go, xử lý DB & Client
├── db.go                 # Quản lý SQLite database (InitDB, các phương thức CRUD Project, Folder, Request)
├── go.mod / go.sum       # Quản lý các dependencies của backend Go (modernc.org/sqlite, wails)
├── main.go               # Hàm khởi chạy ứng dụng (main entry), cấu hình cửa sổ ứng dụng và đăng ký các binding
├── wails.json            # Cấu hình chung của dự án Wails (tên, file output, lệnh build frontend)
└── README.md             # Tài liệu hướng dẫn sử dụng và đặc tả dự án
```

---

## 5. Cách cài đặt & Chạy ứng dụng

### Yêu cầu tiên quyết (Prerequisites)
Để cài đặt và biên dịch dự án, máy tính của bạn cần cài đặt sẵn:
1. **Go:** Phiên bản `1.18` trở lên (Khuyến nghị sử dụng Go `1.25.0`).
2. **Node.js & npm:** Phiên bản LTS (`v16` hoặc mới hơn).
3. **Wails CLI:** Cài đặt bằng cách chạy lệnh sau trên Terminal/PowerShell:
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

### Cài đặt môi trường phát triển (Development)
1. **Clone mã nguồn dự án về máy.**
2. **Di chuyển vào thư mục gốc của dự án.**
3. **Chạy ứng dụng trong chế độ Development:**
   ```bash
   wails dev
   ```
   *Lưu ý:* Lệnh này sẽ tự động cài đặt các thư viện npm ở frontend (thông qua lệnh `npm install`), biên dịch backend Go và khởi chạy một cửa sổ ứng dụng desktop kèm tính năng Live Reload (Hot Reload). Mọi thay đổi ở cả Go và React sẽ được áp dụng ngay lập tức.

### Biên dịch bản phân phối (Build Production)
Để tạo ra file thực thi chạy độc lập (`.exe` trên Windows, `.app` trên macOS):
Chạy lệnh biên dịch sau tại thư mục gốc:
```bash
wails build
```
File thực thi sau khi build thành công sẽ nằm trong thư mục:
- `build/bin/internal-api-client-v1.3.1.exe` (đối với Windows).

---

## 6. Hướng dẫn sử dụng chi tiết

### Bước 1: Khởi tạo và Quản lý Không gian làm việc (Workspace)
- **Tạo Dự án (Project):** Trên thanh Sidebar bên trái, nhấn biểu tượng dấu cộng để thêm một Project mới. Bạn có thể Tạo, Đổi tên hoặc Xoá dự án dễ dàng.
- **Tạo Thư mục (Folder):** Nhấp chuột phải hoặc nhấn nút tùy chọn tại Project tương ứng để thêm thư mục nhằm phân loại các API cần gọi theo từng module chức năng.
- **Tạo Request:** Tạo các HTTP Request mới nằm trong thư mục hoặc trực tiếp dưới Project. Ứng dụng hỗ trợ các Method phổ biến như `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`.

### Bước 2: Cấu hình Yêu cầu HTTP (Request Builder)
- **URL & Port:** Nhập địa chỉ API đích. Hỗ trợ bật/tắt sử dụng Port tùy chỉnh nhanh chóng.
- **Xác thực Bearer Token (Auth):**
  - Cung cấp tab chuyên biệt **"Auth"** hỗ trợ xác thực **Bearer Token**.
  - Tự động gắn header `Authorization: Bearer <token>` khi gửi request và khi chạy kiểm thử tải (Stress Test).
  - Hỗ trợ sử dụng biến môi trường: nhập token trực tiếp hoặc sử dụng `{{token}}`.
  - Tích hợp công cụ **JWT Payload Inspector**: Tự động giải mã các claims (JSON payload) của JWT token, hiển thị trạng thái hạn dùng (còn hạn / đã hết hạn) trực tiếp trên giao diện.
- **Headers:** Nhập các khóa và giá trị tiêu đề (HTTP Headers) dưới dạng bảng danh sách khóa-giá trị trực quan.
- **Request Body:** Sử dụng trình soạn thảo Monaco tích hợp để viết Request Body (hỗ trợ viết JSON, Raw Text, v.v.).
- **Biến môi trường (Environment Variables):**
  - Mặc định ứng dụng có sẵn `Local Environment`. Bạn có thể thêm các môi trường khác (Dev, Staging, Prod).
  - Khai báo các cặp biến key-value (Ví dụ: `base_url = https://api.example.com`, `token = Bearer xyz`).
  - Sử dụng biến môi trường trong URL, Headers, Body hoặc Bearer Token bằng cú pháp dấu ngoặc nhọn hai lớp: `{{base_url}}` hoặc `{{token}}`. Ứng dụng sẽ tự động thay thế giá trị tương ứng trước khi gửi request.

### Bước 3: Gửi và Phân tích phản hồi (Send & Analyze Response)
- Nhấn nút **"Send"** để gửi yêu cầu.
- Giao diện bên phải sẽ hiển thị:
  - **Status Code:** Mã trạng thái phản hồi (ví dụ: `200 OK`, `400 Bad Request`, `500 Internal Server Error`).
  - **Thời gian phản hồi:** Tính bằng mili-giây (ms).
  - **Dung lượng phản hồi:** Kích thước dữ liệu nhận về tính bằng Byte.
  - **Headers:** Danh sách headers nhận về từ Server.
  - **Body Preview:** Dữ liệu Body trả về được định dạng đẹp đẽ thông qua Monaco Editor (Read-only).

### Bước 4: Kiểm thử chịu tải / Stress Testing (Goroutine Stress Test)
Đây là tính năng đặc biệt của công cụ, cho phép đo đạc khả năng chịu tải của API đích bằng cách gửi các yêu cầu song song:
1. Chọn Request cần thực hiện đo tải.
2. Cuộn xuống phần **"Goroutine Stress Test"** (nằm ở góc dưới cùng hoặc tab kiểm thử tải tùy thiết kế UI).
3. Cấu hình các thông số:
   - **Concurrency (Số luồng song song):** Số lượng Goroutine chạy đồng thời (Ví dụ: `10`, `50`, `100` kết nối).
   - **Total Requests (Tổng số yêu cầu):** Số lượng yêu cầu HTTP cần gửi (Ví dụ: `100`, `1000` requests).
4. Nhấn nút **"Kích Hoạt Tải"** (hoặc **"Start Test"**).
5. Theo dõi kết quả trả về ngay sau khi hoàn thành:
   - **Tổng số request thành công:** hiển thị tổng số và phân loại chi tiết:
     - **Thành công (Success):** HTTP Status `< 400` và không bị lỗi kết nối mạng.
     - **Thất bại (Failure / Lỗi kết nối):** HTTP Status `>= 400` hoặc lỗi TLS, Timeout, Rớt mạng.
   - **Thời gian phản hồi trung bình (Average Response Time):** Thời gian trung bình của các kết nối thành công (tính theo ms).

---

## 7. Hướng dẫn Bảo trì & Phát triển thêm
- **Thay đổi Schema Database:** Cập nhật các câu lệnh SQL khởi tạo trong hàm `InitDB()` tại file [db.go](file:///c:/Users/nkocn/OneDrive/Desktop/Plan/internal-tool/internal-api-client/db.go).
- **Thêm tính năng cho Client HTTP:** Bổ sung cấu hình hoặc tính năng (như HTTP/2, Client Certificate, Cookie Jar) trong file [core/client.go](file:///c:/Users/nkocn/OneDrive/Desktop/Plan/internal-tool/internal-api-client/core/client.go).
- **Chỉnh sửa UI/UX:** Chỉnh sửa hoặc thêm các component React trong thư mục [frontend/src/components](file:///c:/Users/nkocn/OneDrive/Desktop/Plan/internal-tool/internal-api-client/frontend/src/components) và quản lý state tại [frontend/src/context/AppContext.tsx](file:///c:/Users/nkocn/OneDrive/Desktop/Plan/internal-tool/internal-api-client/frontend/src/context/AppContext.tsx).

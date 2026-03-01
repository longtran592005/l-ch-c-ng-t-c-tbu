# Hướng Dẫn Cài Đặt Chi Tiết — Hệ Thống Quản Lý Lịch Công Tác TBU

> Tài liệu hướng dẫn **từng bước** cài đặt toàn bộ hệ thống trên một máy chủ Ubuntu **hoàn toàn mới**.
>
> Phù hợp cho: **Ubuntu 22.04 / 24.04 LTS** · Domain sử dụng **Cloudflare** (SSL miễn phí)

---

## Mục Lục

- [1. Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
- [2. Yêu cầu phần cứng](#2-yêu-cầu-phần-cứng)
- [3. Cách 1 — Triển khai bằng Docker (Khuyến nghị)](#3-cách-1--triển-khai-bằng-docker-khuyến-nghị)
- [4. Cách 2 — Cài đặt thủ công (không Docker)](#4-cách-2--cài-đặt-thủ-công-không-docker)
- [5. Cấu hình biến môi trường (.env)](#5-cấu-hình-biến-môi-trường-env)
- [6. Khởi tạo cơ sở dữ liệu](#6-khởi-tạo-cơ-sở-dữ-liệu)
- [7. Chạy hệ thống](#7-chạy-hệ-thống)
- [8. Cấu hình HTTPS với Cloudflare](#8-cấu-hình-https-với-cloudflare)
- [9. Kiểm tra hệ thống](#9-kiểm-tra-hệ-thống)
- [10. Xử lý lỗi thường gặp](#10-xử-lý-lỗi-thường-gặp)
- [11. Các lệnh quản trị hữu ích](#11-các-lệnh-quản-trị-hữu-ích)

---

## 1. Tổng Quan Kiến Trúc

Hệ thống gồm **6 thành phần**:

| # | Thành phần | Công nghệ | Port | Vai trò |
|---|---|---|---|---|
| 1 | **Nginx** | Nginx Alpine | 80 / 443 | Reverse proxy, phục vụ frontend, SSL |
| 2 | **Frontend** | React 18 + Vite + Tailwind CSS + Shadcn/UI | — (static) | Giao diện người dùng |
| 3 | **Backend API** | Node.js 20 + Express + Prisma ORM | 3000 | REST API, xác thực JWT, logic nghiệp vụ |
| 4 | **Database** | PostgreSQL 16 | 5432 | Lưu trữ dữ liệu |
| 5 | **Python TTS** | FastAPI + Edge-TTS | 8003 | Chuyển văn bản → giọng nói |
| 6 | **Python AI** *(tuỳ chọn)* | FastAPI + Whisper + Qwen | 8001 | Nhận dạng giọng nói (STT), chatbot AI |

```
     Internet
        │
    Cloudflare (SSL)
        │
        ▼
  ┌───────────┐
  │   Nginx   │ :80
  │           │──────▶ Frontend (static HTML/JS/CSS)
  │           │──────▶ Backend API :3000 ──▶ PostgreSQL :5432
  │           │──────▶ Python TTS  :8003
  │           │──────▶ Python AI   :8001 (tuỳ chọn)
  └───────────┘
```

---

## 2. Yêu Cầu Phần Cứng

| | Tối thiểu | Khuyến nghị (có AI) |
|---|---|---|
| **CPU** | 2 core | 4+ core |
| **RAM** | 4 GB | 8–16 GB |
| **Ổ cứng** | 20 GB SSD | 50+ GB SSD |
| **GPU** | Không cần | NVIDIA + CUDA (cho Whisper nhanh hơn) |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

---

## 3. Cách 1 — Triển Khai Bằng Docker (Khuyến Nghị)

> Docker sẽ **tự động cài toàn bộ** Node.js, PostgreSQL, Python, Nginx bên trong container.
> Bạn chỉ cần cài Docker rồi chạy 1 lệnh.

### 3.1. Cài đặt Docker & Docker Compose

```bash
# === Cập nhật hệ thống ===
sudo apt-get update -y && sudo apt-get upgrade -y

# === Cài các gói cần thiết ===
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

# === Thêm Docker GPG key ===
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# === Thêm Docker repository ===
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# === Cài Docker Engine + Compose plugin ===
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# === Khởi động Docker ===
sudo systemctl start docker
sudo systemctl enable docker

# === Cho user hiện tại chạy Docker không cần sudo ===
sudo usermod -aG docker $USER
newgrp docker

# === Kiểm tra ===
docker --version          # Docker version 27.x.x
docker compose version    # Docker Compose version v2.x.x
```

### 3.2. Clone mã nguồn

```bash
cd ~
git clone <repo-url> l-ch-c-ng-t-c-tbu
cd l-ch-c-ng-t-c-tbu
```

### 3.3. Tạo file `.env`

```bash
cp .env.deploy.example .env
nano .env
```

Chỉnh sửa các giá trị quan trọng:

```env
# === Domain ===
DOMAIN=lichcongtactbu.site

# === PostgreSQL ===
POSTGRES_DB=tbu_schedule_db
POSTGRES_USER=prisma_user
POSTGRES_PASSWORD=DoiMatKhauManh2024!         # ← BẮT BUỘC đổi

# === JWT (BẮT BUỘC đổi thành chuỗi ngẫu nhiên ≥ 32 ký tự) ===
JWT_SECRET=chuoi_ngau_nhien_rat_dai_32_ky_tu_abc123
JWT_REFRESH_SECRET=chuoi_ngau_nhien_khac_cung_rat_dai_xyz789

# === CORS ===
CORS_ORIGIN=https://lichcongtactbu.site

# === AI Services (tuỳ chọn, để trống nếu không dùng) ===
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=
GROQ_MODEL=llama3-70b-8192
POLLINATIONS_API_KEY=
POLLINATIONS_BASE_URL=https://gen.pollinations.ai
POLLINATIONS_MODEL=openai
POLLINATIONS_STT_MODEL=whisper-large-v3
```

> 💡 Tạo JWT secret ngẫu nhiên: `openssl rand -base64 48`

### 3.4. Build & khởi động

```bash
# Build tất cả images (lần đầu ~5-10 phút)
docker compose build --no-cache

# Khởi động tất cả services
docker compose up -d
```

**Docker sẽ tự động tải & cài:**

| Container | Những gì được cài tự động |
|---|---|
| `tbu_frontend` | Node.js 20 → `npm ci` (tải ~50 thư viện React/Radix/Tailwind) → `npm run build` |
| `tbu_backend` | Node.js 20 → `npm install` (tải ~20 thư viện Express/Prisma/JWT) → `npx prisma generate` → `tsc` |
| `tbu_postgres` | PostgreSQL 16 Alpine (tự tạo database) |
| `tbu_python_tts` | Python 3.10 + `ffmpeg` → `pip install edge-tts fastapi uvicorn pydantic python-multipart` |
| `tbu_nginx` | Nginx Alpine (reverse proxy) |

### 3.5. Migration & Seed database

```bash
# Tạo bảng trong database
docker compose exec backend npx prisma migrate deploy

# Nếu lỗi migrate, dùng:
docker compose exec backend npx prisma db push

# Seed dữ liệu mẫu (tài khoản admin)
docker compose exec backend npx prisma db seed
```

### 3.6. Kiểm tra

```bash
docker compose ps
```

Kết quả mong đợi:

```
NAME              STATUS
tbu_nginx         Up
tbu_backend       Up (healthy)
tbu_postgres      Up (healthy)
tbu_python_tts    Up
tbu_frontend      Exited (0)      ← bình thường, chỉ copy file rồi dừng
```

### 3.7. Triển khai nhanh bằng script (tuỳ chọn)

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

Script tự động: cài Docker → tạo `.env` → build → migration → seed → HTTPS.

---

## 4. Cách 2 — Cài Đặt Thủ Công (Không Docker)

### 4.1. Cài Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node --version    # v20.x.x
npm --version     # 10.x.x
```

### 4.2. Cài PostgreSQL 16

```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-16 postgresql-contrib-16
sudo systemctl start postgresql && sudo systemctl enable postgresql
```

**Tạo database:**

```bash
sudo -u postgres psql
```

```sql
CREATE USER prisma_user WITH PASSWORD 'DoiMatKhauManh2024!';
CREATE DATABASE tbu_schedule_db OWNER prisma_user;
GRANT ALL PRIVILEGES ON DATABASE tbu_schedule_db TO prisma_user;
\q
```

**Cho phép kết nối bằng mật khẩu:**

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Tìm: local all all peer
# Đổi: local all all md5
sudo systemctl restart postgresql
```

### 4.3. Cài Python 3.10 + ffmpeg

```bash
sudo apt-get install -y python3.10 python3.10-venv python3-pip ffmpeg libsndfile1
python3.10 --version    # Python 3.10.x
```

### 4.4. Cài Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl start nginx && sudo systemctl enable nginx
```

### 4.5. Clone mã nguồn

```bash
cd /opt
sudo git clone <repo-url> tbu-schedule
sudo chown -R $USER:$USER tbu-schedule
cd tbu-schedule
```

---

### 4.6. Cài thư viện Frontend

```bash
cd /opt/tbu-schedule
npm install
```

Lệnh này sẽ tải **tất cả thư viện** trong `package.json`:

<details>
<summary><strong>📦 Danh sách đầy đủ thư viện Frontend (bấm để mở)</strong></summary>

#### Thư viện chính (dependencies)

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| `react` | ^18.3.1 | Framework UI chính |
| `react-dom` | ^18.3.1 | Render React vào DOM |
| `react-router-dom` | ^6.30.1 | Điều hướng trang SPA |
| `@tanstack/react-query` | ^5.83.0 | Quản lý data fetching, cache API |
| `@radix-ui/react-accordion` | ^1.2.11 | Accordion collapse/expand |
| `@radix-ui/react-alert-dialog` | ^1.1.14 | Dialog cảnh báo |
| `@radix-ui/react-aspect-ratio` | ^1.1.7 | Tỷ lệ khung hình |
| `@radix-ui/react-avatar` | ^1.1.10 | Avatar người dùng |
| `@radix-ui/react-checkbox` | ^1.3.2 | Checkbox |
| `@radix-ui/react-collapsible` | ^1.1.11 | Panel thu gọn |
| `@radix-ui/react-context-menu` | ^2.2.15 | Menu chuột phải |
| `@radix-ui/react-dialog` | ^1.1.14 | Dialog/Modal |
| `@radix-ui/react-dropdown-menu` | ^2.1.15 | Dropdown menu |
| `@radix-ui/react-hover-card` | ^1.1.14 | Card hiện khi hover |
| `@radix-ui/react-label` | ^2.1.7 | Label cho form |
| `@radix-ui/react-menubar` | ^1.1.15 | Menu bar ngang |
| `@radix-ui/react-navigation-menu` | ^1.2.13 | Navigation menu |
| `@radix-ui/react-popover` | ^1.1.14 | Popover popup |
| `@radix-ui/react-progress` | ^1.1.7 | Progress bar |
| `@radix-ui/react-radio-group` | ^1.3.7 | Radio buttons |
| `@radix-ui/react-scroll-area` | ^1.2.9 | Custom scrollbar |
| `@radix-ui/react-select` | ^2.2.5 | Select dropdown |
| `@radix-ui/react-separator` | ^1.1.7 | Đường phân cách |
| `@radix-ui/react-slider` | ^1.3.5 | Range slider |
| `@radix-ui/react-slot` | ^1.2.3 | Slot component |
| `@radix-ui/react-switch` | ^1.2.5 | Toggle switch |
| `@radix-ui/react-tabs` | ^1.1.12 | Tab navigation |
| `@radix-ui/react-toast` | ^1.2.14 | Toast notification |
| `@radix-ui/react-toggle` | ^1.1.9 | Toggle button |
| `@radix-ui/react-toggle-group` | ^1.1.10 | Nhóm toggle |
| `@radix-ui/react-tooltip` | ^1.2.7 | Tooltip |
| `@hookform/resolvers` | ^3.10.0 | Kết nối form với Zod |
| `react-hook-form` | ^7.61.1 | Quản lý form |
| `zod` | ^3.25.76 | Schema validation |
| `class-variance-authority` | ^0.7.1 | Component variants |
| `clsx` | ^2.1.1 | Conditional CSS classes |
| `tailwind-merge` | ^2.6.0 | Gộp Tailwind classes thông minh |
| `tailwindcss-animate` | ^1.0.7 | Animation cho Tailwind |
| `lucide-react` | ^0.462.0 | 1000+ icon SVG |
| `date-fns` | ^3.6.0 | Xử lý ngày tháng |
| `react-day-picker` | ^8.10.1 | Lịch chọn ngày |
| `recharts` | ^2.15.4 | Biểu đồ/chart |
| `sonner` | ^1.7.4 | Toast notification đẹp |
| `embla-carousel-react` | ^8.6.0 | Carousel/slider |
| `cmdk` | ^1.1.1 | Command palette (Ctrl+K) |
| `vaul` | ^0.9.9 | Drawer bottom sheet |
| `react-resizable-panels` | ^2.1.9 | Kéo resize panel |
| `next-themes` | ^0.3.0 | Dark/Light mode |
| `input-otp` | ^1.4.2 | OTP input |

#### Thư viện dev (devDependencies)

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| `vite` | ^5.4.19 | Build tool + dev server |
| `@vitejs/plugin-react-swc` | ^3.11.0 | React Fast Refresh (SWC) |
| `typescript` | ^5.8.3 | TypeScript compiler |
| `typescript-eslint` | ^8.38.0 | Lint cho TypeScript |
| `tailwindcss` | ^3.4.17 | CSS utility framework |
| `postcss` | ^8.5.6 | CSS post-processor |
| `autoprefixer` | ^10.4.21 | Vendor CSS prefix |
| `@tailwindcss/typography` | ^0.5.16 | Typography plugin |
| `eslint` | ^9.32.0 | Linter |
| `eslint-plugin-react-hooks` | ^5.2.0 | Lint React hooks |
| `eslint-plugin-react-refresh` | ^0.4.20 | Lint React Refresh |
| `globals` | ^15.15.0 | ESLint global vars |
| `concurrently` | ^8.2.2 | Chạy nhiều lệnh song song |
| `@types/node` | ^22.16.5 | Type definitions |
| `@types/react` | ^18.3.23 | Type definitions |
| `@types/react-dom` | ^18.3.7 | Type definitions |
| `@vitejs/plugin-basic-ssl` | ^1.1.0 | SSL cho dev |
| `vite-plugin-mkcert` | ^1.17.9 | Tạo cert cho dev |
| `lovable-tagger` | ^1.1.13 | Component tagging |

</details>

---

### 4.7. Cài thư viện Backend

```bash
cd /opt/tbu-schedule/backend
npm install
```

<details>
<summary><strong>📦 Danh sách đầy đủ thư viện Backend (bấm để mở)</strong></summary>

#### Thư viện chính (dependencies)

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| `express` | ^4.19.2 | Web framework |
| `@prisma/client` | ^5.19.1 | ORM kết nối PostgreSQL |
| `bcrypt` | ^5.1.1 | Hash mật khẩu |
| `jsonwebtoken` | ^9.0.2 | JWT xác thực |
| `cors` | ^2.8.5 | Cross-Origin middleware |
| `helmet` | ^7.1.0 | Security headers |
| `express-rate-limit` | ^7.2.0 | Giới hạn request (chống DDoS) |
| `express-validator` | ^7.0.1 | Validate đầu vào |
| `dotenv` | ^16.4.5 | Đọc file .env |
| `multer` | ^1.4.5-lts.1 | Upload file |
| `exceljs` | ^4.4.0 | Đọc/ghi Excel |
| `axios` | ^1.13.2 | HTTP client |
| `node-fetch` | ^3.3.2 | Fetch API |
| `form-data` | ^4.0.5 | Multipart form |
| `puppeteer` | ^21.11.0 | Render HTML → PDF |
| `@google/generative-ai` | ^0.24.1 | Google Gemini AI SDK |
| `zod` | ^3.23.8 | Schema validation |
| `date-fns` | ^2.30.0 | Xử lý ngày tháng |

#### Thư viện dev (devDependencies)

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| `prisma` | ^5.19.1 | Prisma CLI |
| `tsx` | ^4.16.2 | Chạy TypeScript trực tiếp |
| `typescript` | ^5.5.4 | TypeScript compiler |
| `vitest` | ^1.6.0 | Testing framework |
| `eslint` | ^8.57.0 | Linter |
| `@typescript-eslint/eslint-plugin` | ^7.15.0 | ESLint TS plugin |
| `@typescript-eslint/parser` | ^7.15.0 | TypeScript parser |
| `@types/bcrypt` | ^5.0.2 | Type definitions |
| `@types/cors` | ^2.8.17 | Type definitions |
| `@types/express` | ^4.17.21 | Type definitions |
| `@types/jsonwebtoken` | ^9.0.6 | Type definitions |
| `@types/multer` | ^1.4.11 | Type definitions |
| `@types/node` | ^20.14.12 | Type definitions |

</details>

**Sau đó generate Prisma Client:**

```bash
npx prisma generate
```

> ⚠️ **Puppeteer** tải Chromium (~170MB). Nếu lỗi, cài thêm:
> ```bash
> sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 \
>     libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
>     libgbm1 libpango-1.0-0 libasound2
> ```

---

### 4.8. Cài thư viện Python TTS

```bash
cd /opt/tbu-schedule/python_tts_service
python3.10 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

<details>
<summary><strong>📦 Danh sách thư viện Python TTS (bấm để mở)</strong></summary>

| Thư viện | Vai trò |
|---|---|
| `edge-tts` | Microsoft Edge Text-to-Speech (miễn phí, hỗ trợ tiếng Việt) |
| `fastapi` | Web framework tạo REST API |
| `uvicorn` | ASGI server chạy FastAPI |
| `pydantic` | Data validation |
| `python-multipart` | Xử lý upload file |

> Dịch vụ TTS rất **nhẹ**, không cần GPU.

</details>

---

### 4.9. Cài thư viện Python AI Service (tuỳ chọn)

> ⚠️ **Bỏ qua nếu không dùng STT (nhận dạng giọng nói) hoặc AI Chatbot.**

```bash
cd /opt/tbu-schedule/python_service
python3.10 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

<details>
<summary><strong>📦 Danh sách thư viện Python AI (bấm để mở)</strong></summary>

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| **Web** | | |
| `fastapi` | 0.109.0 | REST API framework |
| `uvicorn[standard]` | 0.27.0 | ASGI server |
| `python-multipart` | 0.0.9 | Upload file |
| **Âm thanh** | | |
| `faster-whisper` | 1.0.0 | STT dùng CTranslate2 (nhanh) |
| `pydub` | 0.25.1 | Cắt/ghép audio |
| `librosa` | >=0.10.1 | Phân tích tín hiệu |
| `soundfile` | 0.12.1 | Đọc/ghi WAV, FLAC |
| `av` | 10.0.0 | Decode audio (Windows) |
| **Deep Learning** | | |
| `torch` | 2.1.2 | PyTorch framework |
| `torchaudio` | 2.1.2 | Audio + PyTorch |
| `transformers` | >=4.36.0 | Hugging Face (Whisper, Qwen) |
| `accelerate` | >=0.24.0 | Tăng tốc inference |
| `scipy` | >=1.10.0 | Signal processing |
| `tokenizers` | >=0.15.0 | Tokenize văn bản |
| `bitsandbytes` | >=0.41.0 | Quantization 4-bit (Linux only) |
| **RAG Chatbot** | | |
| `httpx` | >=0.25.0 | HTTP client (Ollama API) |
| `pyodbc` | >=5.0.0 | Kết nối SQL Server |
| `python-docx` | >=1.0.0 | Đọc file .docx |
| **Tiện ích** | | |
| `numpy` | >=1.24.0 | Mảng số |
| `pandas` | >=2.0.0 | Xử lý dữ liệu bảng |
| `python-dotenv` | >=1.0.0 | Đọc .env |
| `pyyaml` | >=6.0 | YAML config |
| `colorlog` | >=6.7.0 | Log có màu |
| `psutil` | >=5.9.0 | Giám sát hệ thống |
| `tqdm` | 4.66.0 | Progress bar |

</details>

> ⚠️ **PyTorch + GPU NVIDIA:**
> ```bash
> # Nếu có GPU CUDA 11.8:
> pip uninstall torch torchaudio -y
> pip install torch==2.1.2+cu118 torchaudio==2.1.2+cu118 --index-url https://download.pytorch.org/whl/cu118
>
> # Nếu có GPU CUDA 12.1:
> pip install torch==2.1.2+cu121 torchaudio==2.1.2+cu121 --index-url https://download.pytorch.org/whl/cu121
>
> # Kiểm tra CUDA:
> python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
> ```

---

## 5. Cấu Hình Biến Môi Trường (.env)

### 5.1. Frontend — `.env` (thư mục gốc)

```bash
cp .env.example .env
nano .env
```

```env
VITE_API_PORT=3000
VITE_PYTHON_API_PORT=8081
VITE_API_BASE_URL=https://lichcongtactbu.site/api
VITE_PYTHON_API_URL=http://lichcongtactbu.site:8081
```

### 5.2. Backend — `backend/.env`

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

```env
DATABASE_URL="postgresql://prisma_user:DoiMatKhauManh2024!@localhost:5432/tbu_schedule_db"
JWT_SECRET="chuoi_ngau_nhien_it_nhat_32_ky_tu"
JWT_REFRESH_SECRET="chuoi_ngau_nhien_khac_it_nhat_32_ky_tu"
PORT=3000
CORS_ORIGIN=https://lichcongtactbu.site

# AI (tuỳ chọn)
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=your_key
GROQ_MODEL=llama3-70b-8192
```

### 5.3. Python AI — `python_service/.env` (tuỳ chọn)

```bash
cp python_service/.env.example python_service/.env
nano python_service/.env
```

```env
PORT=8001
HOST=0.0.0.0
WHISPER_MODEL=vinai/PhoWhisper-small
DEVICE=cpu                    # "cuda" nếu có GPU
COMPUTE_TYPE=int8             # "float16" nếu GPU
DEFAULT_LANGUAGE=vi
LOG_LEVEL=INFO
CORS_ORIGINS=*
```

---

## 6. Khởi Tạo Cơ Sở Dữ Liệu

```bash
cd /opt/tbu-schedule/backend   # hoặc dùng docker compose exec backend ...

# Tạo bảng
npx prisma migrate deploy
# Nếu lỗi: npx prisma db push

# Seed dữ liệu mẫu
npx prisma db seed

# Xem database (tuỳ chọn)
npx prisma studio    # → http://localhost:5555
```

**Tài khoản mặc định:**

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `admin@tbu.edu.vn` | `123456` | Admin |
| `bgh@tbu.edu.vn` | `123456` | Ban giám hiệu |
| `staff@tbu.edu.vn` | `123456` | Nhân viên |

> ⚠️ **Đổi mật khẩu ngay** sau khi đăng nhập lần đầu!

---

## 7. Chạy Hệ Thống

### Cách A: Docker (production)

```bash
cd ~/l-ch-c-ng-t-c-tbu
docker compose up -d --build
docker compose logs -f                # Xem logs
```

### Cách B: Thủ công (development) — mở 4 terminal

```bash
# Terminal 1 — Backend
cd /opt/tbu-schedule/backend && npm run dev

# Terminal 2 — Frontend
cd /opt/tbu-schedule && npm run dev:frontend

# Terminal 3 — Python TTS
cd /opt/tbu-schedule/python_tts_service && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8003

# Terminal 4 — Python AI (tuỳ chọn)
cd /opt/tbu-schedule/python_service && source .venv/bin/activate && python main.py
```

---

## 8. Cấu Hình HTTPS Với Cloudflare

> Vì domain dùng **Cloudflare**, không cần cài Certbot. Cloudflare cấp SSL miễn phí.

### 8.1. Trên Cloudflare Dashboard

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) → chọn `lichcongtactbu.site`

2. **SSL/TLS → Overview** → chọn: **Flexible**
   | Chế độ | Ý nghĩa |
   |---|---|
   | `Flexible` | Cloudflare ↔ Server = HTTP ← **Chọn cái này (đơn giản nhất)** |
   | `Full` | Cloudflare ↔ Server = HTTPS (cần self-signed cert trên server) |
   | `Full (Strict)` | Cần cert hợp lệ trên server |

3. **SSL/TLS → Edge Certificates** → bật **Always Use HTTPS** = ON

4. *(Tuỳ chọn)* **Rules → Page Rules**:
   - URL: `http://lichcongtactbu.site/*`
   - Setting: **Always Use HTTPS**

### 8.2. Trên server — Không cần đổi gì

Với chế độ **Flexible**, Cloudflare xử lý SSL → gửi HTTP đến server.
Nginx config hiện tại (`nginx.nossl.conf`) đã **đủ dùng**.

### 8.3. (Tuỳ chọn) Nâng lên chế độ Full

Nếu muốn dùng **Full** (bảo mật hơn), tạo self-signed cert:

```bash
mkdir -p ~/l-ch-c-ng-t-c-tbu/certbot/conf/live/lichcongtactbu.site

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout ~/l-ch-c-ng-t-c-tbu/certbot/conf/live/lichcongtactbu.site/privkey.pem \
  -out ~/l-ch-c-ng-t-c-tbu/certbot/conf/live/lichcongtactbu.site/fullchain.pem \
  -subj "/CN=lichcongtactbu.site"

# Đổi nginx config sang có SSL
sed -i 's|nginx.nossl.conf|nginx.conf|g' ~/l-ch-c-ng-t-c-tbu/docker-compose.yml

# Restart nginx
docker compose up -d nginx
```

Sau đó trên Cloudflare: **SSL/TLS → Overview → Full**.

---

## 9. Kiểm Tra Hệ Thống

```bash
# Backend health check
curl -s http://localhost:3000/api/health
# → {"status":"ok"}

# PostgreSQL
docker compose exec postgres pg_isready
# → accepting connections

# Python TTS
curl -s http://localhost:8003/health
# → {"status":"ok"}

# Trạng thái Docker containers
docker compose ps

# CPU/RAM usage
docker stats --no-stream
```

Mở trình duyệt: **https://lichcongtactbu.site** → phải hiển thị trang web.

---

## 10. Xử Lý Lỗi Thường Gặp

### ❌ `npm ci` — thiếu `package-lock.json`

```
The `npm ci` command can only install with an existing package-lock.json
```

**Sửa:** Trong Dockerfile, đổi `RUN npm ci` → `RUN npm install`. *(Backend Dockerfile đã được sửa)*

---

### ❌ `npm warn deprecated` — puppeteer, eslint

```
npm warn deprecated puppeteer@21.11.0: < 24.15.0 is no longer supported
npm warn deprecated eslint@8.57.1: This version is no longer supported
```

**Không phải lỗi.** Chỉ là cảnh báo phiên bản cũ, build vẫn chạy bình thường.

---

### ❌ `ECONNREFUSED 127.0.0.1:5432` — không kết nối được DB

```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
# Kiểm tra lại DATABASE_URL trong backend/.env
```

---

### ❌ `npm install` thất bại

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

---

### ❌ `prisma migrate` thất bại

```bash
npx prisma db push          # Push trực tiếp
npx prisma migrate reset    # Reset hoàn toàn (⚠️ xoá data)
```

---

### ❌ `Address already in use` — port bị chiếm

```bash
sudo lsof -i :3000          # Tìm process
sudo kill -9 <PID>          # Kill
```

---

### ❌ Docker container không start

```bash
docker compose logs backend  # Xem lỗi chi tiết
docker compose down
docker compose build --no-cache backend
docker compose up -d
```

---

### ❌ CORS — `Access-Control-Allow-Origin missing`

Kiểm tra `CORS_ORIGIN` trong `.env` phải khớp URL frontend (ví dụ: `https://lichcongtactbu.site`).

---

### ❌ Python — thư viện không cài được

```bash
sudo apt-get install -y build-essential python3.10-dev libffi-dev ffmpeg

# PyTorch trên máy không GPU:
pip install torch==2.1.2+cpu torchaudio==2.1.2+cpu --index-url https://download.pytorch.org/whl/cpu
```

---

### ❌ Puppeteer — thiếu Chromium dependencies

```bash
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libpango-1.0-0 libasound2
```

---

## 11. Các Lệnh Quản Trị Hữu Ích

### Docker

```bash
docker compose up -d                    # Khởi động
docker compose down                     # Tắt
docker compose restart backend          # Restart 1 service
docker compose up -d --build            # Rebuild + chạy
docker compose logs -f                  # Logs realtime
docker compose logs --tail=100 backend  # 100 dòng log cuối
docker compose exec backend sh          # Vào shell container
docker compose exec postgres psql -U prisma_user -d tbu_schedule_db  # Vào DB
docker stats --no-stream                # Xem tài nguyên
docker compose down -v --rmi all        # Xoá tất cả
```

### Database

```bash
npx prisma studio                        # Giao diện web quản lý DB
npx prisma migrate dev --name ten_mig    # Tạo migration mới
npx prisma migrate deploy               # Chạy migration (production)
npx prisma migrate status               # Xem trạng thái
npx prisma db push                      # Push schema trực tiếp
npx prisma db seed                      # Seed dữ liệu
npx prisma generate                     # Generate client
```

### Backup & Restore

```bash
# Backup
docker compose exec postgres pg_dump -U prisma_user tbu_schedule_db > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U prisma_user tbu_schedule_db < backup_20260301.sql
```

### Firewall

```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
sudo ufw status
```

> ⚠️ Production chỉ mở **22, 80, 443**. Các port 3000, 5432, 8001, 8003 chỉ dùng nội bộ.

---

### Tóm tắt các port

| Service | Port | Mở ra ngoài? |
|---|---|---|
| Nginx HTTP | 80 | ✅ |
| Nginx HTTPS | 443 | ✅ |
| SSH | 22 | ✅ |
| Backend API | 3000 | ❌ Nội bộ |
| PostgreSQL | 5432 | ❌ Nội bộ |
| Python AI | 8001 | ❌ Nội bộ |
| Python TTS | 8003 | ❌ Nội bộ |

---

*Tài liệu cập nhật: Tháng 3/2026*
*Dự án: Hệ thống Quản lý Lịch Công tác — Trường Đại học Thái Bình*

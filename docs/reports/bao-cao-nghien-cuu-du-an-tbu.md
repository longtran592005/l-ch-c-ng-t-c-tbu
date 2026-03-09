# BAO CAO NGHIEN CUU KHOA HOC CHI TIET VE DU AN
## He thong Quan ly Lich cong tac Truong Dai hoc Thai Binh (TBU)

Ngay lap bao cao: 08/03/2026

Tac gia bao cao: Codex ho tro tong hop tu codebase, tai lieu va cau truc trien khai thuc te cua du an.

## Tom tat

De tai tap trung nghien cuu, phan tich va he thong hoa du an "He thong Quan ly Lich cong tac Truong Dai hoc Thai Binh". Day la mot he thong web full-stack phuc vu quan ly, cong bo va tra cuu lich cong tac; dong thoi mo rong theo huong ung dung tri tue nhan tao vao bai toan nhan dang giong noi, tong hop giong noi, chatbot hoi dap va ho tro tao bien ban cuoc hop. Diem dac biet cua du an la mo hinh da dich vu: frontend React cho nguoi dung va quan tri; backend Express + Prisma cho nghiep vu va API; PostgreSQL cho du lieu giao tac; Python service cho STT, RAG, Qwen va TTS.

Qua nghien cuu codebase, co the thay du an khong chi giai bai toan "hien thi lich", ma da tien den mot nen tang van hanh noi bo cho nha truong, co kha nang tiep nhan lich tu Excel, phan quyen nguoi dung, luu vet xac thuc, tao va duyet lich, quan ly tin tuc thong bao, ghi am cuoc hop, chuyen audio thanh van ban, sinh audio doc lich va chatbot hoi dap theo ngon ngu tu nhien.

## Tu khoa

- Quan ly lich cong tac
- React
- Express
- Prisma
- PostgreSQL
- Speech-to-Text
- Text-to-Speech
- RAG Chatbot
- Gemini
- Pollinations
- Viettel AI
- OpenCode
- Ollama

## 1. Dat van de va boi canh nghien cuu

Trong moi truong dai hoc, lich cong tac cua ban giam hieu, cac phong ban va don vi chuyen mon la du lieu co tan suat cap nhat cao, lien quan den nhieu doi tuong va doi hoi do chinh xac, kip thoi. Neu van hanh bang file roi rac, viec tong hop, duyet, cong bo va tim kiem thong tin thuong gay ton thoi gian, kho theo doi lich su va kho mo rong.

Du an TBU Schedule Management duoc xay dung de giai quyet cac bai toan thuc tien sau:

- So hoa quy trinh tao, duyet, cong bo lich cong tac.
- Hien thi lich cong tac theo tuan va thang tren giao dien web.
- Phuc vu tra cuu thong tin cho nguoi dung cong khai va can bo noi bo.
- Ho tro quan ly tin tuc, thong bao va noi dung cuoc hop.
- Tich hop AI de giam thao tac thu cong, dac biet voi du lieu giong noi va tra cuu bang ngon ngu tu nhien.

## 2. Muc tieu nghien cuu

Bao cao nay huong den cac muc tieu:

- Lam ro kien truc ky thuat tong the cua du an.
- Phan tich cac phan he nghiep vu chinh duoc cai dat trong code.
- Liet ke va danh gia cac service, model, thu vien va dich vu AI da duoc su dung.
- Xac dinh diem manh, han che va huong phat trien tiep theo.
- Cung cap cho giang vien mot tai lieu de hieu chi tiet du an dua tren implementation thuc te, khong chi dua tren mo ta y tuong.

## 3. Pham vi va phuong phap nghien cuu

Pham vi nghien cuu bao gom toan bo monorepo tai thu muc goc cua du an, gom:

- Frontend tai `src/`
- Backend Node.js tai `backend/src/`
- Python AI service tai `python_service/`
- Python TTS service tai `python_tts_service/`
- Tai lieu kien truc, setup va feature tai `docs/`
- Cau hinh trien khai tai `docker-compose.yml`, `Dockerfile`, `nginx/`, `deploy.sh`

Phuong phap nghien cuu:

- Doc cau truc thu muc va dependency tu `package.json`, `backend/package.json`.
- Phan tich schema du lieu tai `backend/prisma/schema.prisma`.
- Phan tich route, controller, service va context de truy vet luong nghiep vu.
- Doi chieu code voi tai lieu kien truc, setup va feature da co san.
- Tong hop thanh mo hinh nghien cuu he thong va danh gia ky thuat.

## 4. Tong quan he thong

He thong duoc to chuc theo mo hinh monorepo voi nhieu thanh phan phoi hop:

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui.
- Backend: Node.js + Express + TypeScript.
- ORM va CSDL: Prisma + PostgreSQL.
- AI services: Python FastAPI cho STT, Qwen, RAG va Python FastAPI rieng cho Edge-TTS.
- Trien khai: Docker Compose + Nginx + Certbot.

Kien truc nay cho thay du an duoc thiet ke theo huong tach biet trach nhiem:

- Lop giao dien xu ly trai nghiem nguoi dung, route va state.
- Lop API xu ly nghiep vu, phan quyen, xac thuc, CRUD va ket noi service.
- Lop AI chuyen biet cho cac bai toan STT, TTS, sinh noi dung va RAG.

## 5. Kien truc frontend

Frontend duoc to chuc theo mo hinh component-based hien dai. File `src/App.tsx` cho thay he thong route duoc chia thanh 2 mien:

- Mien cong khai: trang chu, lich cong tac, gioi thieu, tin tuc, thong bao.
- Mien quan tri duoc bao ve boi `ProtectedRoute`: dashboard, quan ly lich, quan ly nguoi dung, thong bao, tin tuc, cau hinh AI, ghi chu tuan va noi dung cuoc hop.

Nhung diem ky thuat noi bat:

- Su dung `React Router DOM` de dinh tuyen.
- Su dung `TanStack Query` de quan ly fetch/caching du lieu.
- Su dung nhieu `Context` gom `AuthContext`, `ScheduleContext`, `NewsContext`, `AnnouncementsContext`, `NotificationsContext`, `MeetingRecordsContext`, `ScheduleHighlightContext`.
- Giao dien xay dung bang `Tailwind CSS` va he component `shadcn/ui`.
- Cac trang duoc lazy-load bang `React.lazy` + `Suspense`, giup toi uu tai tai nguyen.

### 5.1 Cac module frontend chinh

- Module lich cong tac: `ScheduleViewer`, `WeeklyScheduleTable`, `MonthlyScheduleView`, `VoiceGuidedScheduleForm`, `ExcelImportDialog`.
- Module cuoc hop: `MeetingRecordList`, `MeetingRecordDetail`, `AudioRecorder`, `AudioUploader`, `AudioToTextConverter`, `MeetingMinutesGenerator`, `RealtimeTranscriber`.
- Module chatbot: `ChatbotButton`, `ChatbotWindow`, `ChatbotWindowRAG`, `ChatMessage`.
- Module auth va layout: `ProtectedRoute`, `MainLayout`, `Header`, `TopBar`, `UserAuth`.

### 5.2 Dich vu frontend

Frontend co lop service rieng trong `src/services/`:

- `api.ts`: wrapper tong quat cho `fetch`, tu dong them `Authorization`, xu ly loi 401 va xac dinh `API_BASE_URL`.
- `meetingRecords.api.ts`: API cho bien ban, upload audio, cap nhat noi dung, tao minutes.
- `chatbotService.ts`: giao tiep chatbot.
- `stt.service.ts`, `voiceAI.service.ts`, `audioToText.service.ts`, `whisperSimple.api.ts`: nhom service cho giong noi.
- `aiService.ts`: giao tiep cac API AI tong quat.

## 6. Kien truc backend

Backend duoc xay dung theo mo hinh `Routes -> Controllers -> Services`, la mo hinh ro rang, phu hop voi he thong nghiep vu co nhieu module.

File `backend/src/app.ts` cho thay backend da tich hop:

- `helmet` de tang cuong bao mat header HTTP.
- `cors` cho phep da origin.
- `express-rate-limit` de gioi han tan suat goi API.
- `express.json` va `urlencoded` de xu ly body.
- Static file `/uploads` de phuc vu audio va tep da sinh ra.

File `backend/src/routes/index.ts` cho thay cac nhom API hien co:

- `auth`
- `schedule`
- `news`
- `announcement`
- `meeting-record`
- `chatbot`
- `weekly-note`
- `user`
- `tts`
- `stt`
- `whisper`
- `proxy`
- `ai`
- `health`

### 6.1 Cac service backend chinh

- `auth.service.ts`: dang ky, dang nhap, tao access token va refresh token, luu refresh token vao DB.
- `schedule.service.ts`: CRUD lich, chuyen doi date/time de tranh lech mui gio, tu dong goi TTS khi lich da duyet.
- `meetingRecord.service.ts`: quan ly bien ban, noi dung cuoc hop, audio dinh kem.
- `news.service.ts`, `announcement.service.ts`, `weeklyNote.service.ts`, `user.service.ts`.
- `excelImport.service.ts`: doc file Excel mau, tach ngay, buoi, gio, thanh phan, don vi chuan bi, don vi phoi hop va danh dau lich bo sung.
- `chatbot.service.ts`: chatbot kieu agentic, co the chuyen provider giua Gemini, OpenCode va Pollinations.
- `tts.service.ts`: goi Python TTS service de sinh audio nam/nu mien Bac.
- `sttConfig.service.ts`: quan ly cau hinh provider STT cho voice form va meeting transcription.

## 7. Thiet ke co so du lieu

Schema Prisma cho thay he thong da duoc chuan hoa thanh nhieu bang quan he:

- `User`
- `Schedule`
- `ScheduleApproval`
- `MeetingRecord`
- `News`
- `Announcement`
- `Notification`
- `RefreshToken`
- `VectorEmbedding`
- `ChatHistory`
- `WeeklyNote`

### 7.1 Y nghia nghiep vu cua cac bang

- `User`: quan ly tai khoan, vai tro, phong ban, chuc vu, trang thai.
- `Schedule`: thuc the trung tam cua du an, luu ngay, gio, noi dung, dia diem, lanh dao, thanh phan, don vi chuan bi, don vi phoi hop, trang thai duyet.
- `ScheduleApproval`: luu vet qua trinh phe duyet lich.
- `MeetingRecord`: lien ket voi lich, luu thong tin cuoc hop, file ghi am, noi dung va bien ban.
- `News` va `Announcement`: phuc vu cong bo thong tin.
- `Notification`: thong bao noi bo theo nguoi dung.
- `RefreshToken`: phuc vu xac thuc JWT refresh.
- `VectorEmbedding`: luu vector embedding cho RAG.
- `ChatHistory`: luu hoi thoai chatbot theo session.
- `WeeklyNote`: luu ghi chu theo tuan.

## 8. Phan tich cac phan he chuc nang

### 8.1 Phan he quan ly lich cong tac

Day la phan he trong tam, ho tro:

- Tao moi lich.
- Cap nhat, xoa lich.
- Duyet lich va cong bo lich.
- Hien thi theo tuan/thang.
- Phan biet lich thuong va lich bo sung.
- Gan thong tin lanh dao, thanh phan, dia diem, don vi chuan bi.

Service `schedule.service.ts` dac biet chu y xu ly date/time theo UTC de tranh loi lech mui gio giua frontend, backend va PostgreSQL.

### 8.2 Nhap lich tu Excel

`excelImport.service.ts` la mot diem gia tri cao cua du an. Service nay khong chi doc file Excel, ma con:

- Tu dong nhan dien nam tu header.
- Tach chuoi "Thu Hai ngay 26/01".
- Trich gio bat dau, gio ket thuc tu cot noi dung.
- Suy dien gio mac dinh theo buoi sang/chieu.
- Tach danh sach thanh phan, don vi phoi hop.
- Nhan dien dong duoc to mau vang de danh dau lich bo sung.

### 8.3 Tin tuc, thong bao va ghi chu tuan

Du an khong chi phuc vu lich cong tac ma da mo rong thanh cong thong tin noi bo. Cac bang `News`, `Announcement`, `WeeklyNote` va cac trang quan tri tuong ung cho thay he thong duoc dinh huong thanh mot cong thong tin van hanh.

### 8.4 Quan ly noi dung cuoc hop

Phan he `MeetingRecord` cho phep:

- Tao ban ghi cuoc hop gan voi lich.
- Ghi am truc tiep tren trinh duyet.
- Tai file audio len server.
- Phat lai audio.
- Chuyen audio thanh van ban.
- Chinh sua noi dung cuoc hop.
- Tao bien ban bang AI.

## 9. Cac service, model va nen tang da su dung

### 9.1 Service nen tang va framework

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Express.js
- Prisma ORM
- PostgreSQL
- FastAPI
- Docker Compose
- Nginx
- Certbot

### 9.2 Service xac thuc va bao mat

- JWT access token
- JWT refresh token
- bcrypt
- helmet
- cors
- express-rate-limit
- multer

### 9.3 Service AI, STT, TTS va chatbot

1. Whisper local qua `whisperSimple.service.ts`
- Backend goi truc tiep script Python `whisper/vinai.py`.
- Model mac dinh la `suzii/vi-whisper-large-v3-turbo-v1-ct2`.

2. Python AI service `python_service/main.py`
- FastAPI service cho STT va cac tac vu Qwen.
- Co endpoint `/transcribe`, `/generate-summary`, `/generate-minutes`, `/extract-action-items`, `/deep-analysis`, `/meeting-insights`, `/realtime-transcribe`.

3. Qwen
- Su dung trong Python service cho tong hop, phan tich va sinh bien ban.
- Su dung Qwen embedding trong RAG (`Qwen/Qwen3-Embedding-0.6B`).

4. RAG service `python_service/rag_service.py`
- Luu vector embedding.
- Chat voi context tu lich, tin tuc, thong bao va tai lieu `info.docx`.
- Co chuc nang reindex toan bo hoac tung nguon du lieu.

5. Gemini
- Dung cho speech-to-text qua `geminiSTT.service.ts`.
- Dung cho chatbot agentic voi function calling trong `chatbot.service.ts`.

6. Pollinations.ai
- Dung nhu provider LLM thay the qua endpoint OpenAI-compatible.
- Dung cho audio transcription trong mot so luong chat audio.

7. Viettel AI ASR
- Duoc tich hop trong `viettelSTT.service.ts`.
- Chuyen giong noi tieng Viet thanh van ban.
- Co xu ly convert webm/ogg sang wav bang ffmpeg neu can.

8. OpenCode Zen
- Duoc tich hop qua `llm.service.ts` va `chatbot.service.ts`.
- Model mac dinh trong code la `gpt-5-nano`.

9. Ollama
- Duoc ho tro trong RAG config voi model `qwen2.5:7b`.

10. Edge-TTS
- Python TTS service su dung `edge_tts`.
- Hai giong doc tieng Viet mien Bac: `vi-VN-NamMinhNeural` va `vi-VN-HoaiMyNeural`.

## 10. Chatbot va tri tue nhan tao trong du an

`chatbot.service.ts` cho thay chatbot co cac nang luc:

- Nhan dien cau hoi ve lich.
- Pre-search lich tu message nguoi dung.
- Su dung function calling voi Gemini de goi cong cu tra lich, tin tuc, thong bao.
- Chuyen provider giua Gemini, Pollinations va OpenCode.
- Luu lich su chat vao bang `ChatHistory`.

Trong huong RAG, service Python co the:

- Index lich, tin tuc, thong bao.
- Index tai lieu `.docx`.
- Tao embedding.
- Truy hoi top-k van ban lien quan.
- Sinh cau tra loi co context.

## 11. Text-to-Speech va tro ly doc lich

`tts.service.ts` va `python_tts_service/main.py` cho thay he thong co kha nang doc lich cong tac thanh audio.

Gia tri cua module nay:

- Ho tro can bo nghe nhanh lich cong tac.
- Phuc vu nguoi dung tren thiet bi di dong.
- Co xu ly viet tat de doc tu nhien hon.
- Co co che dong bo lai audio cho nhieu tuan lich.

## 12. Trien khai va van hanh

`docker-compose.yml` cho thay mo hinh production gom:

- `nginx`
- `frontend`
- `backend`
- `postgres`
- `python_tts`
- `certbot`

Mo hinh nay giup tach biet frontend, API, database va TTS service, de quan tri va mo rong.

## 13. Danh gia diem manh cua du an

- Co kien truc ro rang, phan lop tot giua frontend, backend va AI service.
- Co schema du lieu kha day du cho van hanh thuc.
- Da tich hop nhieu tinh nang phuc vu nghiep vu that: nhap Excel, duyet lich, bien ban, chatbot, TTS.
- Co tinh mo rong cao nho cach thiet ke da provider cho AI.
- Co can nhac bao mat co ban: auth, rate limit, helmet, refresh token.
- Co huong den trien khai thuc te qua Docker, Nginx va SSL.

## 14. Han che va van de can luu y

- He thong AI dang o trang thai da provider, nhung can dong bo them de tranh phan manh cau hinh.
- RAG config van con dau vet cau hinh SQL Server lich su, trong khi backend hien tai su dung PostgreSQL; can ra soat de dong nhat.
- Mot so service cu da deprecate nhung van con file, can don dep dan de giam do phuc tap nhan thuc.

## 15. Dinh huong phat trien tiep theo

- Dong nhat hoan toan cau hinh AI/STT/TTS tren mot trang admin trung tam.
- Them dashboard theo doi suc khoe tung service.
- Hoan thien pipeline reindex tu dong cho RAG sau moi thay doi du lieu.
- Tang cuong logging, metrics, audit trail va backup.
- Nang cap phan tich cuoc hop thanh danh sach hanh dong, giao viec va theo doi tien do.

## 16. Ket luan

Qua nghien cuu codebase, co the ket luan day la mot du an co muc do hoan thien cao hon mot de tai demo thong thuong. Du an ket hop duoc ba lop gia tri:

- So hoa quy trinh quan ly lich cong tac.
- Ho tro van hanh noi bo thong qua tin tuc, thong bao, bien ban.
- Ung dung AI de nang cao kha nang nhap lieu, tra cuu, tong hop va phat thanh thong tin.

Neu duoc tiep tuc hoan thien, day co the tro thanh nen tang chuyen doi so noi bo co tinh ung dung cao cho Truong Dai hoc Thai Binh va co the mo rong sang cac don vi giao duc co nhu cau tuong tu.

## 17. Tai lieu va tep ma nguon da doi chieu khi lap bao cao

- `package.json`
- `backend/package.json`
- `README.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/AUDIO_ARCHITECTURE.md`
- `docker-compose.yml`
- `src/App.tsx`
- `src/services/api.ts`
- `backend/prisma/schema.prisma`
- `backend/src/app.ts`
- `backend/src/routes/index.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/services/schedule.service.ts`
- `backend/src/services/excelImport.service.ts`
- `backend/src/services/chatbot.service.ts`
- `backend/src/services/llm.service.ts`
- `backend/src/services/geminiSTT.service.ts`
- `backend/src/services/viettelSTT.service.ts`
- `backend/src/services/whisperSimple.service.ts`
- `backend/src/services/sttConfig.service.ts`
- `backend/src/services/tts.service.ts`
- `backend/src/controllers/tts.controller.ts`
- `python_service/main.py`
- `python_service/rag_service.py`
- `python_service/rag_config.py`
- `python_tts_service/main.py`

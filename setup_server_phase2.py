"""
Phase 2: Clone repo, cài dependencies, chạy migration & seed
"""
import paramiko
import time

HOST = "103.131.85.182"
PORT = 22
USERNAME = "root"
PASSWORD = "Anhlong1!"
REPO_URL = "https://github.com/longtran592005/l-ch-c-ng-t-c-tbu.git"
APP_DIR = "/root/tbu-schedule"

def create_ssh_client():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"🔗 Đang kết nối SSH tới {USERNAME}@{HOST}...")
    client.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    print("✅ Kết nối SSH thành công!")
    return client

def run_command(client, command, timeout=300, show_output=True):
    print(f"\n📌 Chạy: {command}")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    exit_code = stdout.channel.recv_exit_status()
    
    if show_output and out:
        # Giới hạn output dài
        lines = out.split('\n')
        if len(lines) > 30:
            print(f"   📤 (showing last 30 of {len(lines)} lines)")
            print("   " + "\n   ".join(lines[-30:]))
        else:
            print(f"   📤 {out}")
    if err and exit_code != 0:
        err_lines = err.split('\n')
        if len(err_lines) > 20:
            print(f"   ⚠️  (showing last 20 of {len(err_lines)} error lines)")
            print("   " + "\n   ".join(err_lines[-20:]))
        else:
            print(f"   ⚠️  {err}")
    
    return out, err, exit_code

def main():
    client = None
    try:
        client = create_ssh_client()
        
        # ========================================
        # STEP 1: Clone hoặc pull repo
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 1: Clone repository")
        print("="*50)
        
        # Kiểm tra thư mục đã tồn tại chưa
        _, _, code = run_command(client, f"test -d {APP_DIR}")
        
        if code == 0:
            print("   📂 Thư mục đã tồn tại, pull code mới nhất...")
            run_command(client, f"cd {APP_DIR} && git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || git pull", timeout=120)
        else:
            print("   📥 Clone repository...")
            out, err, code = run_command(client, f"git clone {REPO_URL} {APP_DIR}", timeout=180)
            if code != 0:
                print(f"   ❌ Clone thất bại! {err}")
                return
            print("   ✅ Clone thành công!")
        
        # Kiểm tra cấu trúc
        run_command(client, f"ls -la {APP_DIR}/")
        run_command(client, f"ls -la {APP_DIR}/backend/")
        
        # ========================================
        # STEP 2: Cài dependencies backend
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 2: Cài đặt dependencies backend")
        print("="*50)
        
        out, err, code = run_command(client, f"cd {APP_DIR}/backend && npm install", timeout=300)
        if code != 0:
            print(f"   ⚠️  npm install có lỗi, thử lại với --legacy-peer-deps...")
            run_command(client, f"cd {APP_DIR}/backend && npm install --legacy-peer-deps", timeout=300)
        
        print("   ✅ Dependencies đã cài xong!")
        
        # ========================================
        # STEP 3: Tạo file .env cho backend
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 3: Tạo file .env cho backend")
        print("="*50)
        
        env_content = """DATABASE_URL="postgresql://prisma_user:StrongPassword123!@localhost:5432/tbu_schedule_db"
JWT_SECRET="tbu_schedule_jwt_secret_key_very_strong_2024_prod"
JWT_REFRESH_SECRET="tbu_schedule_jwt_refresh_secret_key_very_strong_2024_prod"
PORT=3000
CORS_ORIGIN=http://lichcongtactbu.site
NODE_ENV=production
"""
        
        # Kiểm tra .env đã có chưa
        _, _, env_exists = run_command(client, f"test -f {APP_DIR}/backend/.env")
        if env_exists == 0:
            print("   📄 File .env đã tồn tại, backup và tạo mới...")
            run_command(client, f"cp {APP_DIR}/backend/.env {APP_DIR}/backend/.env.backup")
        
        # Ghi file .env
        run_command(client, f"""cat > {APP_DIR}/backend/.env << 'ENVEOF'
{env_content}
ENVEOF""")
        
        print("   ✅ File .env đã tạo!")
        run_command(client, f"cat {APP_DIR}/backend/.env")
        
        # ========================================
        # STEP 4: Generate Prisma Client
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 4: Generate Prisma Client")
        print("="*50)
        
        out, err, code = run_command(client, f"cd {APP_DIR}/backend && npx prisma generate", timeout=120)
        if code == 0:
            print("   ✅ Prisma Client generated!")
        else:
            print(f"   ⚠️  Prisma generate có vấn đề: {err}")
        
        # ========================================
        # STEP 5: Chạy Migration
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 5: Chạy Prisma Migration")
        print("="*50)
        
        out, err, code = run_command(client, f"cd {APP_DIR}/backend && npx prisma migrate deploy", timeout=120)
        if code == 0:
            print("   ✅ Migration chạy thành công!")
        else:
            print(f"   ⚠️  Migration lỗi, thử db push...")
            out, err, code = run_command(client, f"cd {APP_DIR}/backend && npx prisma db push", timeout=120)
            if code == 0:
                print("   ✅ DB push thành công!")
            else:
                print(f"   ❌ DB push thất bại: {err}")
        
        # ========================================
        # STEP 6: Seed Database
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 6: Seed Database")
        print("="*50)
        
        # Kiểm tra tsx đã cài chưa
        _, _, tsx_code = run_command(client, f"cd {APP_DIR}/backend && npx tsx --version", timeout=30)
        
        out, err, code = run_command(client, f"cd {APP_DIR}/backend && npx tsx prisma/seed.ts", timeout=120)
        if code == 0:
            print("   ✅ Seed database thành công!")
        else:
            print(f"   ⚠️  Seed lỗi: {err}")
            # Thử cách khác
            print("   🔄 Thử cách khác...")
            run_command(client, f"cd {APP_DIR}/backend && npm run prisma:seed", timeout=120)
        
        # ========================================
        # STEP 7: Kiểm tra kết quả
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 7: Kiểm tra kết quả")
        print("="*50)
        
        # Kiểm tra tables
        out, _, _ = run_command(client, 
            """PGPASSWORD='StrongPassword123!' psql -U prisma_user -d tbu_schedule_db -h 127.0.0.1 -c "\\dt" """)
        
        # Kiểm tra users
        out, _, _ = run_command(client, 
            """PGPASSWORD='StrongPassword123!' psql -U prisma_user -d tbu_schedule_db -h 127.0.0.1 -c "SELECT email, name, role FROM users;" """)
        
        # ========================================
        # KẾT QUẢ
        # ========================================
        print("\n" + "="*50)
        print("🎉 HOÀN TẤT SETUP!")
        print("="*50)
        print(f"""
📂 App directory: {APP_DIR}
📂 Backend: {APP_DIR}/backend

🗄️  Database:
   URL: postgresql://prisma_user:StrongPassword123!@localhost:5432/tbu_schedule_db

🚀 Để chạy backend trên server:
   cd {APP_DIR}/backend
   npm run dev          # Development
   npm run build && npm run start  # Production

👤 Tài khoản mặc định:
   admin@tbu.edu.vn / 123456
   bgh@tbu.edu.vn / 123456
   staff@tbu.edu.vn / 123456
""")
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        if client:
            client.close()
            print("🔌 Đã đóng kết nối SSH.")

if __name__ == "__main__":
    main()

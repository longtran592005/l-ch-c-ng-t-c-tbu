"""
Script để SSH vào server và cài đặt PostgreSQL + setup database
cho TBU Schedule Management System
"""
import paramiko
import time
import sys

# SSH Configuration
HOST = "103.131.85.182"
PORT = 22
USERNAME = "root"
PASSWORD = "Anhlong1!"

def create_ssh_client():
    """Tạo kết nối SSH"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"🔗 Đang kết nối SSH tới {USERNAME}@{HOST}...")
    client.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    print("✅ Kết nối SSH thành công!")
    return client

def run_command(client, command, timeout=120, show_output=True):
    """Chạy lệnh trên server và trả về output"""
    print(f"\n📌 Chạy: {command}")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    
    # Đọc output
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    exit_code = stdout.channel.recv_exit_status()
    
    if show_output and out:
        print(f"   📤 {out}")
    if err and exit_code != 0:
        print(f"   ⚠️  {err}")
    
    return out, err, exit_code

def main():
    client = None
    try:
        client = create_ssh_client()
        
        # ========================================
        # STEP 1: Kiểm tra hệ điều hành
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 1: Kiểm tra server")
        print("="*50)
        
        out, _, _ = run_command(client, "cat /etc/os-release | head -5")
        out2, _, _ = run_command(client, "uname -a")
        out3, _, _ = run_command(client, "free -h | head -2")
        out4, _, _ = run_command(client, "df -h / | tail -1")
        
        # Kiểm tra PostgreSQL đã cài chưa
        _, _, pg_code = run_command(client, "which psql")
        pg_installed = pg_code == 0
        
        # Kiểm tra Node.js
        node_out, _, node_code = run_command(client, "node --version 2>/dev/null")
        node_installed = node_code == 0
        
        # Kiểm tra Git
        git_out, _, git_code = run_command(client, "git --version 2>/dev/null")
        git_installed = git_code == 0
        
        print(f"\n📊 Trạng thái:")
        print(f"   PostgreSQL: {'✅ Đã cài' if pg_installed else '❌ Chưa cài'}")
        print(f"   Node.js: {'✅ ' + node_out if node_installed else '❌ Chưa cài'}")
        print(f"   Git: {'✅ ' + git_out if git_installed else '❌ Chưa cài'}")
        
        # ========================================
        # STEP 2: Cài đặt PostgreSQL
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 2: Cài đặt PostgreSQL")
        print("="*50)
        
        if not pg_installed:
            # Detect OS
            os_out, _, _ = run_command(client, "cat /etc/os-release | grep ^ID=")
            
            if "ubuntu" in os_out.lower() or "debian" in os_out.lower():
                cmds = [
                    "apt-get update -y",
                    "apt-get install -y postgresql postgresql-contrib",
                    "systemctl start postgresql",
                    "systemctl enable postgresql",
                ]
            elif "centos" in os_out.lower() or "rhel" in os_out.lower() or "rocky" in os_out.lower() or "alma" in os_out.lower():
                cmds = [
                    "dnf install -y postgresql-server postgresql",
                    "postgresql-setup --initdb",
                    "systemctl start postgresql",
                    "systemctl enable postgresql",
                ]
            else:
                print(f"   ⚠️  OS không xác định: {os_out}")
                print("   Thử cài bằng apt...")
                cmds = [
                    "apt-get update -y",
                    "apt-get install -y postgresql postgresql-contrib",
                    "systemctl start postgresql",
                    "systemctl enable postgresql",
                ]
            
            for cmd in cmds:
                out, err, code = run_command(client, cmd, timeout=300)
                if code != 0 and "already" not in err.lower() and "already" not in out.lower():
                    print(f"   ⚠️  Lệnh '{cmd}' exit code: {code}")
        else:
            print("   ✅ PostgreSQL đã được cài đặt, bỏ qua.")
            # Đảm bảo PostgreSQL đang chạy
            run_command(client, "systemctl start postgresql 2>/dev/null || service postgresql start 2>/dev/null")
        
        # Kiểm tra PostgreSQL chạy chưa
        _, _, pg_status = run_command(client, "systemctl is-active postgresql")
        print(f"   PostgreSQL status: {'✅ Running' if pg_status == 0 else '⚠️ Checking...'}")
        
        if pg_status != 0:
            run_command(client, "pg_lsclusters")
            run_command(client, "pg_ctlcluster $(pg_lsclusters -h | head -1 | awk '{print $1, $2}') start 2>/dev/null")
        
        # ========================================
        # STEP 3: Tạo database và user
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 3: Tạo database và user PostgreSQL")
        print("="*50)
        
        # Tạo user
        run_command(client, 
            """sudo -u postgres psql -c "DO \\$\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'prisma_user') THEN CREATE ROLE prisma_user WITH LOGIN PASSWORD 'StrongPassword123!' CREATEDB; END IF; END \\$\\$;" """)
        
        # Đặt password (đề phòng user đã tồn tại)
        run_command(client, 
            """sudo -u postgres psql -c "ALTER USER prisma_user WITH PASSWORD 'StrongPassword123!';" """)
        
        # Tạo database
        out, err, code = run_command(client, 
            """sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = 'tbu_schedule_db';" """)
        
        if "1" not in out:
            run_command(client, 
                """sudo -u postgres psql -c "CREATE DATABASE tbu_schedule_db OWNER prisma_user;" """)
            print("   ✅ Database tbu_schedule_db đã được tạo!")
        else:
            print("   ✅ Database tbu_schedule_db đã tồn tại!")
        
        # Grant privileges
        run_command(client, 
            """sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tbu_schedule_db TO prisma_user;" """)
        
        # Cấu hình pg_hba.conf cho phép password auth
        print("   🔧 Cấu hình PostgreSQL authentication...")
        # Tìm pg_hba.conf
        hba_out, _, _ = run_command(client, "find /etc/postgresql -name pg_hba.conf 2>/dev/null | head -1")
        if not hba_out:
            hba_out, _, _ = run_command(client, "find /var/lib/pgsql -name pg_hba.conf 2>/dev/null | head -1")
        
        if hba_out:
            # Kiểm tra đã có config chưa
            check_out, _, _ = run_command(client, f"grep 'prisma_user' {hba_out}")
            if not check_out:
                # Thêm rule cho local connection với md5
                run_command(client, f"""sed -i '1i local   tbu_schedule_db  prisma_user                     md5' {hba_out}""")
                run_command(client, f"""sed -i '2i host    tbu_schedule_db  prisma_user  127.0.0.1/32        md5' {hba_out}""")
                run_command(client, "systemctl reload postgresql 2>/dev/null || service postgresql reload 2>/dev/null")
                print("   ✅ Cấu hình pg_hba.conf thành công!")
            else:
                print("   ✅ pg_hba.conf đã được cấu hình!")
        
        # Test kết nối
        out, err, code = run_command(client, 
            """PGPASSWORD='StrongPassword123!' psql -U prisma_user -d tbu_schedule_db -h 127.0.0.1 -c "SELECT 'Connection OK';" """)
        if code == 0:
            print("   ✅ Kết nối database thành công!")
        else:
            print("   ⚠️  Test kết nối thất bại, thử cấu hình lại...")
            # Thử sửa md5 cho tất cả local connections
            if hba_out:
                run_command(client, f"sed -i 's/peer/md5/g' {hba_out}")
                run_command(client, f"sed -i 's/ident/md5/g' {hba_out}")
                run_command(client, "systemctl reload postgresql 2>/dev/null || service postgresql reload 2>/dev/null")
                time.sleep(2)
                out, err, code = run_command(client, 
                    """PGPASSWORD='StrongPassword123!' psql -U prisma_user -d tbu_schedule_db -h 127.0.0.1 -c "SELECT 'Connection OK';" """)
                if code == 0:
                    print("   ✅ Kết nối database thành công sau khi cấu hình lại!")
                else:
                    print(f"   ❌ Vẫn không kết nối được: {err}")
        
        # ========================================
        # STEP 4: Cài Node.js (nếu chưa có)
        # ========================================
        print("\n" + "="*50)
        print("📋 BƯỚC 4: Cài đặt Node.js")
        print("="*50)
        
        if not node_installed:
            # Cài Node.js 20 LTS
            run_command(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", timeout=120)
            run_command(client, "apt-get install -y nodejs", timeout=180)
            out, _, _ = run_command(client, "node --version")
            print(f"   ✅ Node.js đã cài: {out}")
            out, _, _ = run_command(client, "npm --version")
            print(f"   ✅ npm: {out}")
        else:
            print(f"   ✅ Node.js đã có: {node_out}")
        
        # ========================================
        # STEP 5: Cài Git (nếu chưa có)
        # ========================================
        if not git_installed:
            print("\n📋 Cài Git...")
            run_command(client, "apt-get install -y git", timeout=120)
        
        # ========================================
        # STEP 6: Hiển thị kết quả
        # ========================================
        print("\n" + "="*50)
        print("🎉 HOÀN TẤT CÀI ĐẶT DATABASE!")
        print("="*50)
        print(f"""
📋 Thông tin database:
   Host:     127.0.0.1 (localhost)
   Port:     5432
   Database: tbu_schedule_db
   User:     prisma_user
   Password: StrongPassword123!
   
   DATABASE_URL="postgresql://prisma_user:StrongPassword123!@localhost:5432/tbu_schedule_db"

📋 Bước tiếp theo (chạy trên server):
   1. git clone <repo_url> /root/tbu-schedule
   2. cd /root/tbu-schedule/backend
   3. npm install
   4. npm run prisma:generate
   5. npm run prisma:migrate:deploy
   6. npm run prisma:seed
   
   Tài khoản mặc định sau seed:
   - admin@tbu.edu.vn / 123456
   - bgh@tbu.edu.vn / 123456
   - staff@tbu.edu.vn / 123456
""")
        
    except paramiko.AuthenticationException:
        print("❌ Sai mật khẩu SSH!")
    except paramiko.SSHException as e:
        print(f"❌ Lỗi SSH: {e}")
    except TimeoutError:
        print("❌ Kết nối bị timeout!")
    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        if client:
            client.close()
            print("\n🔌 Đã đóng kết nối SSH.")

if __name__ == "__main__":
    main()

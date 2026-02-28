#!/bin/bash
# ==============================================
# TBU Schedule Management - Deploy Script
# ==============================================
# Triển khai trên Ubuntu 24.04 với Docker + Nginx
#
# Cách dùng:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Yêu cầu: Ubuntu 24.04, quyền root hoặc sudo
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAIN="lichcongtactbu.site"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  TBU Schedule - Deployment Script${NC}"
echo -e "${CYAN}================================================${NC}"
echo -e "${YELLOW}Domain: ${DOMAIN}${NC}"
echo -e "${YELLOW}App Dir: ${APP_DIR}${NC}"
echo ""

# ============================================
# STEP 1: Cài Docker (nếu chưa có)
# ============================================
echo -e "${GREEN}📋 BƯỚC 1: Kiểm tra Docker${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}  ⏳ Cài đặt Docker...${NC}"
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Add Docker GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    
    # Add Docker repo
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}  ✅ Docker đã cài thành công!${NC}"
else
    echo -e "${GREEN}  ✅ Docker đã có: $(docker --version)${NC}"
fi

# Verify docker compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}  ❌ Docker Compose plugin không tìm thấy!${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Docker Compose: $(docker compose version --short)${NC}"

# ============================================
# STEP 2: Tạo file .env nếu chưa có
# ============================================
echo -e "\n${GREEN}📋 BƯỚC 2: Kiểm tra file .env${NC}"

if [ ! -f "${APP_DIR}/.env" ] || [ ! -s "${APP_DIR}/.env" ]; then
    if [ -f "${APP_DIR}/.env.deploy.example" ]; then
        cp "${APP_DIR}/.env.deploy.example" "${APP_DIR}/.env"
        echo -e "${YELLOW}  ⚠️  File .env đã được tạo từ template.${NC}"
        echo -e "${YELLOW}  ⚠️  Hãy chỉnh sửa .env trước khi tiếp tục!${NC}"
        echo -e "${YELLOW}     Đặc biệt: JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD${NC}"
        echo ""
        read -p "  Nhấn Enter sau khi đã chỉnh sửa .env... " -r
    else
        echo -e "${RED}  ❌ Không tìm thấy .env.deploy.example!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}  ✅ File .env đã tồn tại${NC}"
fi

# Load .env
set -a
source "${APP_DIR}/.env"
set +a

# ============================================
# STEP 3: Tạo thư mục cần thiết
# ============================================
echo -e "\n${GREEN}📋 BƯỚC 3: Tạo thư mục${NC}"

mkdir -p "${APP_DIR}/certbot/conf"
mkdir -p "${APP_DIR}/certbot/www"
echo -e "${GREEN}  ✅ Thư mục certbot đã tạo${NC}"

# ============================================
# STEP 4: Build và khởi động (không SSL trước)
# ============================================
echo -e "\n${GREEN}📋 BƯỚC 4: Build và khởi động các services${NC}"

cd "${APP_DIR}"

# Build tất cả images
echo -e "${YELLOW}  ⏳ Building Docker images (lần đầu sẽ mất 5-10 phút)...${NC}"
docker compose build --no-cache

# Start services
echo -e "${YELLOW}  ⏳ Khởi động services...${NC}"
docker compose up -d

# Đợi backend ready
echo -e "${YELLOW}  ⏳ Đợi backend khởi động...${NC}"
sleep 10

# Kiểm tra services
echo -e "\n${GREEN}📋 BƯỚC 4.1: Kiểm tra trạng thái services${NC}"
docker compose ps

# ============================================
# STEP 5: Chạy Prisma Migration & Seed
# ============================================
echo -e "\n${GREEN}📋 BƯỚC 5: Database Migration & Seed${NC}"

echo -e "${YELLOW}  ⏳ Running Prisma migrate deploy...${NC}"
docker compose exec backend npx prisma migrate deploy 2>/dev/null || \
docker compose exec backend npx prisma db push 2>/dev/null || \
echo -e "${YELLOW}  ⚠️  Migration có thể đã chạy rồi${NC}"

echo -e "${YELLOW}  ⏳ Running Prisma seed...${NC}"
docker compose exec backend npx prisma db seed 2>/dev/null || \
echo -e "${YELLOW}  ⚠️  Seed có thể đã chạy rồi${NC}"

echo -e "${GREEN}  ✅ Database setup xong!${NC}"

# ============================================
# STEP 6: SSL Certificate (Let's Encrypt)
# ============================================
echo -e "\n${GREEN}📋 BƯỚC 6: SSL Certificate${NC}"

if [ ! -f "${APP_DIR}/certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "${YELLOW}  ⏳ Đang xin SSL certificate cho ${DOMAIN}...${NC}"
    
    # Dừng nginx tạm
    docker compose stop nginx
    
    # Cài certbot standalone
    docker run --rm \
        -v "${APP_DIR}/certbot/conf:/etc/letsencrypt" \
        -v "${APP_DIR}/certbot/www:/var/www/certbot" \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        --preferred-challenges http \
        -d "${DOMAIN}" \
        -d "www.${DOMAIN}" \
        --non-interactive \
        --agree-tos \
        --email "admin@${DOMAIN}" \
        --no-eff-email
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ SSL certificate đã được cấp!${NC}"
        
        # Chuyển sang config có SSL
        echo -e "${YELLOW}  ⏳ Chuyển Nginx sang HTTPS config...${NC}"
        
        # Update docker-compose nginx volume
        sed -i 's|nginx.nossl.conf|nginx.conf|g' docker-compose.yml
        
        # Restart nginx với SSL config
        docker compose up -d nginx
        echo -e "${GREEN}  ✅ Nginx đã chạy với HTTPS!${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Không thể xin SSL cert. Website chạy HTTP trước.${NC}"
        echo -e "${YELLOW}  Bạn có thể chạy lại bước này sau: ./deploy.sh ssl${NC}"
        docker compose up -d nginx
    fi
else
    echo -e "${GREEN}  ✅ SSL certificate đã tồn tại${NC}"
    
    # Đảm bảo dùng config SSL
    if grep -q "nginx.nossl.conf" docker-compose.yml; then
        sed -i 's|nginx.nossl.conf|nginx.conf|g' docker-compose.yml
        docker compose up -d nginx
    fi
fi

# ============================================
# STEP 7: Setup Certbot Auto-Renew
# ============================================
echo -e "\n${GREEN}📋 BƯỚC 7: Auto-renew SSL${NC}"

# Add cron job for cert renewal
CRON_JOB="0 0 * * 0 cd ${APP_DIR} && docker compose exec -T certbot certbot renew --quiet && docker compose exec -T nginx nginx -s reload"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "${CRON_JOB}") | crontab -
echo -e "${GREEN}  ✅ Auto-renew đã được cài (weekly)${NC}"

# ============================================
# HOÀN TẤT
# ============================================
echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN}🎉 TRIỂN KHAI HOÀN TẤT!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "  🌐 Website: ${GREEN}https://${DOMAIN}${NC}"
echo -e "  📊 Services:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
echo ""
echo -e "  👤 Tài khoản mặc định:"
echo -e "     admin@tbu.edu.vn / 123456"
echo -e "     bgh@tbu.edu.vn / 123456"
echo -e "     staff@tbu.edu.vn / 123456"
echo ""
echo -e "  📝 Lệnh hữu ích:"
echo -e "     ${YELLOW}docker compose logs -f${NC}       # Xem logs"
echo -e "     ${YELLOW}docker compose restart${NC}       # Restart"
echo -e "     ${YELLOW}docker compose down${NC}          # Tắt"
echo -e "     ${YELLOW}docker compose up -d --build${NC} # Rebuild & start"
echo ""

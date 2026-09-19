#!/bin/bash
# ==============================================================================
# TradeNexus EC2 Bootstrap Script (Ubuntu 22.04 / 24.04 LTS)
# Installs: 4GB Swap, PostgreSQL 16, Node.js 20 LTS, PM2, Nginx, & S3 DB Backup
# ==============================================================================

set -e

echo ">>> [1/6] Setting up 4GB Swap Space (Crucial for 1GB Free Tier RAM)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created and enabled successfully."
else
    echo "Swap file already exists."
fi

echo ">>> [2/6] Updating packages & Installing Essentials..."
sudo apt-get update -y
sudo apt-get install -y curl wget git build-essential nginx

echo ">>> [3/6] Installing PostgreSQL 16..."
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

echo "Configuring PostgreSQL database 'tradex'..."
sudo -u postgres psql -c "CREATE DATABASE tradex;" || true
sudo -u postgres psql -c "CREATE USER tradex_user WITH ENCRYPTED PASSWORD 'tradex_secure_pass_2026';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tradex TO tradex_user;" || true
sudo -u postgres psql -c "ALTER DATABASE tradex OWNER TO tradex_user;" || true

echo ">>> [4/6] Installing Node.js 20 LTS & PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo ">>> [5/6] Configuring Nginx Reverse Proxy..."
sudo tee /etc/nginx/sites-available/tradex << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/tradex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo ">>> [6/6] Setting up Daily PostgreSQL Backup to AWS S3..."
sudo mkdir -p /opt/backups
sudo tee /opt/backups/backup_to_s3.sh << 'EOF'
#!/bin/bash
BACKUP_DATE=$(date +'%Y-%m-%d_%H%M%S')
BACKUP_FILE="/opt/backups/tradex_db_${BACKUP_DATE}.sql.gz"
BUCKET_NAME="tradex-media-419819288573"

# Dump DB and compress
PGPASSWORD="tradex_secure_pass_2026" pg_dump -U tradex_user -h localhost tradex | gzip > "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "s3://${BUCKET_NAME}/backups/tradex_db_${BACKUP_DATE}.sql.gz"

# Remove local backup older than 3 days
find /opt/backups -type f -name "*.sql.gz" -mtime +3 -delete
EOF

sudo chmod +x /opt/backups/backup_to_s3.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backups/backup_to_s3.sh >> /var/log/db_backup.log 2>&1") | crontab -

echo "==============================================================="
echo "✅ EC2 Server Setup Complete!"
echo "Database: PostgreSQL (database: tradex, user: tradex_user)"
echo "Memory: 1GB RAM + 4GB Swap enabled"
echo "Reverse Proxy: Nginx listening on port 80 -> forwarding to port 5001"
echo "Daily DB Backups: Configured to upload to s3://tradex-media-419819288573/backups/"
echo "==============================================================="

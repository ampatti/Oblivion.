#!/bin/bash
# ============================================
#   OBLIVION PROXY — SERVER SETUP SCRIPT
#   Run this on your server: 165.232.97.74
# ============================================

set -e

echo ""
echo "  ██████  ██████  ██      ██ ██    ██ ██  ██████  ███    ██"
echo " ██    ██ ██   ██ ██      ██ ██    ██ ██ ██    ██ ████   ██"
echo " ██    ██ ██████  ██      ██ ██    ██ ██ ██    ██ ██ ██  ██"
echo " ██    ██ ██   ██ ██      ██  ██  ██  ██ ██    ██ ██  ██ ██"
echo "  ██████  ██████  ███████ ██   ████   ██  ██████  ██   ████"
echo ""
echo "  Oblivion Proxy Setup"
echo "============================================"

# 1. Install Node.js (LTS) if not present
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "✅ Node.js $(node -v) already installed"
fi

# 2. Install npm dependencies
echo ""
echo "📦 Installing Oblivion dependencies..."
npm install

# 3. Allow node to bind to port 80 without root (Linux only)
echo ""
echo "🔧 Configuring port 80 permissions..."
sudo setcap 'cap_net_bind_service=+ep' $(which node) 2>/dev/null || echo "   (setcap skipped — may need to run as root or use port 8080)"

# 4. Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
  echo ""
  echo "📦 Installing PM2 (process manager)..."
  sudo npm install -g pm2
fi

# 5. Start with PM2
echo ""
echo "🚀 Starting Oblivion with PM2..."
pm2 delete oblivion 2>/dev/null || true
pm2 start server.js --name oblivion
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "============================================"
echo "  ✅ Oblivion is running!"
echo "  🌐 Open: http://165.232.97.74"
echo "  📊 Logs: pm2 logs oblivion"
echo "  🔄 Restart: pm2 restart oblivion"
echo "  ⛔ Stop: pm2 stop oblivion"
echo "============================================"
echo ""

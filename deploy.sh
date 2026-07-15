#!/bin/bash
set -e

echo "=== Browser Auto Deployment ==="

# Install dependencies
echo "Installing backend dependencies..."
cd /home/browser-auto/backend && npm install --production=false

echo "Installing frontend dependencies..."
cd /home/browser-auto/frontend && npm install

# Build frontend
echo "Building frontend..."
npm run build

# Run database migrations
echo "Running database migrations..."
cd /home/browser-auto/backend && npx prisma generate && npx prisma db push

# Restart PM2 processes
echo "Restarting PM2 processes..."
pm2 delete browser-auto-backend 2>/dev/null || true
pm2 delete browser-auto-frontend 2>/dev/null || true

cd /home/browser-auto/backend && pm2 start "npx tsx src/index.ts" --name browser-auto-backend
cd /home/browser-auto/frontend && pm2 start "npm run dev" --name browser-auto-frontend

# Setup Nginx
echo "Setting up Nginx..."
sudo cp /home/browser-auto/nginx/browser-auto.conf /etc/nginx/sites-available/browser-auto
sudo ln -sf /etc/nginx/sites-available/browser-auto /etc/nginx/sites-enabled/browser-auto
sudo nginx -t && sudo nginx -s reload

echo "=== Deployment Complete ==="
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3002"

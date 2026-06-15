# AWS Deployment Runbook

Target Domain: `https://splitwise.yashkhurana.dev`
Target OS: Ubuntu 24.04 LTS (AWS EC2)

## 1. EC2 Setup & Node Installation
SSH into your EC2 instance and run:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
```

## 2. Clone Repository
```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <your-repo-url> splitwise
cd splitwise
```

## 3. Environment Variables
```bash
nano backend/.env
```
Paste the following:
```env
PORT=5001
NODE_ENV=production
DATABASE_URL="postgresql://<user>:<pass>@ep-...neon.tech/splitwise?sslmode=require&pgbouncer=true"
JWT_SECRET="<generate-random-string>"
```

```bash
nano frontend/.env.production
```
Paste:
```env
VITE_API_URL=https://splitwise.yashkhurana.dev/api
```

## 4. Prisma Migration & Backend PM2 Setup
```bash
cd /var/www/splitwise/backend
npm ci
npx prisma generate
npx prisma db push

sudo npm install -g pm2
pm2 start src/index.js --name "splitwise-api"
pm2 save
pm2 startup
```

## 5. React Build
```bash
cd /var/www/splitwise/frontend
npm ci
npm run build
```

## 6. Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/splitwise
```
Paste:
```nginx
server {
    listen 80;
    server_name splitwise.yashkhurana.dev;

    root /var/www/splitwise/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addres_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/splitwise /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7. DNS Configuration
In your DNS provider (e.g., Route53, Cloudflare, Namecheap):
* Create an `A` record.
* Name: `splitwise`
* Value: `<Your EC2 Public IP>`
* TTL: Auto / 300s

## 8. SSL Setup (Let's Encrypt)
Wait 5 minutes for DNS to propagate, then:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d splitwise.yashkhurana.dev
```

## 9. Verification Commands
* View logs: `pm2 logs splitwise-api`
* Health check: `curl https://splitwise.yashkhurana.dev/api/groups` (Should return 401 Unauthorized, proving backend is alive).

## 10. Rollback Procedure
If the UI crashes after a git pull:
```bash
cd /var/www/splitwise
git checkout <previous-commit-hash>
cd frontend && npm run build
cd ../backend && pm2 reload splitwise-api
```

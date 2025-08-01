# ai-msme-honeypot
@echo off
echo ========================================
echo   AI-Driven Honeypot System Setup
echo   For MSME Hackathon Project
echo ========================================
echo.

REM Check if Docker is running
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Docker is not installed or not running!
    echo Please install Docker Desktop for Windows first.
    echo Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker is available

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is available

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Python is not installed!
    echo Please install Python 3.9+ from: https://python.org/
    pause
    exit /b 1
)

echo ✅ Python is available
echo.

echo 🏗️ Setting up project structure...

REM Create project directories
mkdir backend\routes 2>nul
mkdir backend\services 2>nul
mkdir backend\ai-engine 2>nul
mkdir backend\config 2>nul
mkdir frontend\src\components 2>nul
mkdir frontend\src\services 2>nul
mkdir honeypots\ssh-honeypot 2>nul
mkdir honeypots\web-honeypot 2>nul
mkdir honeypots\ftp-honeypot 2>nul
mkdir honeypots\smb-honeypot 2>nul
mkdir config 2>nul

echo ✅ Project directories created
echo.

echo 📦 Installing backend dependencies...
cd backend

REM Create package.json if it doesn't exist
if not exist package.json (
    echo {^
  "name": "ai-honeypot-backend",^
  "version": "1.0.0",^
  "description": "AI-driven honeypot system backend",^
  "main": "app.js",^
  "scripts": {^
    "start": "node app.js",^
    "dev": "nodemon app.js"^
  },^
  "dependencies": {}^
} > package.json
)

call npm install express cors helmet morgan body-parser
call npm install @elastic/elasticsearch redis ioredis
call npm install dockerode ws socket.io
call npm install dotenv bcryptjs jsonwebtoken
call npm install nodemailer twilio
call npm install js-yaml

echo ✅ Backend dependencies installed
cd ..

echo 🐍 Installing Python dependencies...

pip install pandas scikit-learn tensorflow
pip install elasticsearch redis
pip install docker python-dotenv flask
pip install requests numpy scipy
pip install joblib pyyaml

echo ✅ Python dependencies installed
echo.

echo ⚛️ Setting up React frontend...
cd frontend

if not exist package.json (
    call npx create-react-app . --template minimal
)

call npm install axios socket.io-client
call npm install recharts leaflet react-leaflet
call npm install lucide-react
call npm install tailwindcss @tailwindcss/forms
call npx tailwindcss init

echo ✅ Frontend setup completed
cd ..

echo 🐳 Setting up Docker environment...

REM Create .env file with default values
echo # AI Honeypot System Configuration > .env
echo NODE_ENV=development >> .env
echo PORT=5000 >> .env
echo ELASTICSEARCH_URL=http://localhost:9200 >> .env
echo REDIS_URL=redis://localhost:6379 >> .env
echo FRONTEND_URL=http://localhost:3000 >> .env
echo. >> .env
echo # Email Configuration (Optional) >> .env
echo EMAIL_USER=your-email@gmail.com >> .env
echo EMAIL_PASS=your-app-password >> .env
echo. >> .env
echo # Twilio SMS Configuration (Optional) >> .env
echo TWILIO_SID=your-twilio-sid >> .env
echo TWILIO_TOKEN=your-twilio-token >> .env
echo TWILIO_FROM=+1234567890 >> .env

echo ✅ Environment configuration created
echo.

echo 🔧 Creating basic honeypot configurations...

REM Create SSH honeypot config
mkdir honeypots\ssh-honeypot\etc 2>nul
echo [honeypot] > honeypots\ssh-honeypot\etc\cowrie.cfg
echo hostname = web-server-01 >> honeypots\ssh-honeypot\etc\cowrie.cfg
echo log_path = var/log/cowrie >> honeypots\ssh-honeypot\etc\cowrie.cfg
echo download_limit_size = 10485760 >> honeypots\ssh-honeypot\etc\cowrie.cfg

REM Create web honeypot config
echo ^<VirtualHost *:80^> > honeypots\web-honeypot\apache.conf
echo     DocumentRoot /var/www/html >> honeypots\web-honeypot\apache.conf
echo     ServerName honeypot-web >> honeypots\web-honeypot\apache.conf
echo ^</VirtualHost^> >> honeypots\web-honeypot\apache.conf

echo ✅ Basic configurations created
echo.

echo 🚀 Starting the system...

REM Start Elasticsearch and basic services
docker-compose up -d elasticsearch redis

echo ⏳ Waiting for Elasticsearch to start...
timeout /t 30 /nobreak >nul

echo ✅ Core services started
echo.

echo 🎯 Starting honeypots...
docker-compose up -d ssh-honeypot web-honeypot

echo ⏳ Waiting for honeypots to initialize...
timeout /t 15 /nobreak >nul

echo ✅ Honeypots started
echo.

echo 🧠 Starting AI backend...
start /B cmd /c "cd backend && node app.js"

echo ⏳ Waiting for backend to start...
timeout /t 10 /nobreak >nul

echo ⚛️ Starting React frontend...
start /B cmd /c "cd frontend && npm start"

echo ⏳ Waiting for frontend to start...
timeout /t 15 /nobreak >nul

echo.
echo ========================================
echo ✅ AI Honeypot System Setup Complete!
echo ========================================
echo.
echo 🌐 Access your dashboard at: http://localhost:3000
echo 📊 Backend API available at: http://localhost:5000
echo 🔍 Elasticsearch at: http://localhost:9200
echo 📈 Kibana at: http://localhost:5601
echo.
echo 🎯 Demo Attack Targets:
echo   SSH Honeypot: localhost:2222
echo   Web Honeypot: localhost:8080
echo   FTP Honeypot: localhost:2121
echo.
echo 📋 Next Steps for Demo:
echo 1. Open http://localhost:3000 in your browser
echo 2. Run attack simulations (see README.md)
echo 3. Watch real-time adaptations
echo 4. Show AI-driven threat analysis
echo.
echo 🚨 For hackathon demo, you can simulate attacks using:
echo   ssh admin@localhost -p 2222
echo   curl http://localhost:8080/admin
echo   nmap -p 1-1000 localhost
echo.
echo ⚠️ Note: Edit .env file with your email/SMS credentials for alerts
echo.
echo Press any key to open the dashboard...
pause >nul

start http://localhost:3000

echo Happy hacking! 🎉
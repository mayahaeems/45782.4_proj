🛒 Supermarket App

A full-stack supermarket web application with authentication, product browsing, categories, and cart functionality.

Built with a Dockerized frontend + backend architecture.

✨ Features

🔐 User authentication (login/logout)

🛍 Product listing with categories

🔍 Search & filtering

🛒 Add to cart

💾 Persistent auth session

⚡ Dockerized development & deployment

📦 API-driven backend

🏗 Tech Stack

Frontend

React

TypeScript

Vite

TailwindCSS

Backend

Python API (FastAPI / Flask — adjust if needed)

REST endpoints

DevOps

Docker

Docker Compose

Nginx (frontend serving)

📁 Project Structure
supermarket-app/
│
├── backend/        # Python API
├── frontend/       # React frontend
├── docker-compose.yml
└── README.md

🚀 Running the App (Docker)
1. Build & start containers
docker compose up --build

2. Stop containers
docker compose down

🌐 Access

After startup:

Frontend → http://localhost

Backend API → http://localhost:8000
 (or your configured port)

🔐 Authentication

Login endpoint:

POST /auth/login


Expected response:

{
  "access_token": "...",
  "user": {
    "email": "user@example.com",
    "role": "user"
  }
}


Token is stored in localStorage and used automatically for protected requests.

🛒 Cart Behavior

Cart requires login

Add to cart is disabled without authentication

Session persists across refresh

🧪 Local Development (without Docker)

Frontend:

cd frontend
npm install
npm run dev


Backend:

cd backend
pip install -r requirements.txt
uvicorn main:app --reload

🛠 Environment Variables

Create .env if needed:

API_URL=http://localhost:8000

🐳 Docker Notes

Multi-stage frontend build

Nginx serves production bundle

Backend runs Python slim image

Compose handles networking automatically

📌 Known Improvements (optional roadmap)

Admin dashboard

Order history

Payments

Product images

JWT refresh tokens

Role-based permissions

👩‍💻 Author

Maya Haeems
Full Stack Course Project

If you want, I can:

✅ Add API documentation section
✅ Add screenshots section
✅ Add database schema
✅ Add deployment instructions
✅ Add CI/CD
✅ Make it GitHub-ready
✅ Add badges
✅ Write in Hebrew
✅ Add license
▶️ How to Run the App
✅ Recommended: Run with Docker

This is the easiest way — no manual setup needed.

1. Install prerequisites

Make sure you have:

Docker Desktop installed

Docker Compose enabled

Check:

docker --version
docker compose version

2. Build and start the app

From the project root:

docker compose up --build


This will:

build frontend image

build backend image

start containers

connect services automatically

3. Open the app

After startup:

👉 Frontend: http://localhost

👉 Backend API: http://localhost:8000

4. Stop the app
docker compose down

💻 Run Without Docker (Local Development)
Frontend
cd frontend
npm install
npm run dev


Frontend runs at:

http://localhost:5173

Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload


Backend runs at:

http://localhost:8000

🧪 First Login

Use a test user or create one via your backend.

Example login request:

POST /auth/login

⚠️ Troubleshooting
Build fails?

Clean Docker cache:

docker compose down -v
docker system prune -f
docker compose up --build

Port already in use?

Stop other containers:

docker ps
docker stop <container_id>

Node build errors?

Run locally to debug:

cd frontend
npm run build

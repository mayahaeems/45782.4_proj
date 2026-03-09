# 🛒 SuperMart

A full-stack supermarket web application with role-based access control, product management, cart & checkout, order tracking, and a delivery dashboard.

Built with **Flask** (backend) + **React + Vite** (frontend), containerized with Docker.

---

## ✨ Features

- 🔐 JWT authentication (login / register / refresh)
- 🛍 Product catalog with categories, search & filtering
- 🛒 Cart — guest cart merges on login
- 💳 Checkout & order placement
- 📦 Order history & order detail pages
- 🚚 Delivery dashboard (assign & update delivery status)
- 🛠 Admin panel — products, categories, orders, users, inventory logs
- 🖼 Product & category images (auto-generated placeholders on first run)
- 👤 Role-based access: `user` / `delivery` / `admin`

---

## 🏗 Tech Stack

### Frontend
| Library | Version |
|---|---|
| React | 18 |
| Vite | 5 |
| TailwindCSS | 3 |
| React Router | 6 |
| TanStack Query | 5 |
| Zustand | 5 |
| Axios | 1.7 |
| React Hook Form + Zod | — |
| Lucide React | — |

### Backend
| Library | Version |
|---|---|
| Flask | 3.1 |
| Flask-JWT-Extended | 4.7 |
| Flask-SQLAlchemy | 3.1 |
| Marshmallow | 3.21 |
| PyMySQL | 1.1 |
| Pillow | 10.4 |
| Werkzeug | 3.1 |

### Infrastructure
- **MySQL 8** (via Docker)
- **Docker + Docker Compose**
- **Nginx** (serves frontend production build)

---

## 📁 Project Structure

```
supermarket-app/
├── backend/
│   ├── models/          # SQLAlchemy models (User, Product, Order, Cart…)
│   ├── routes/          # Flask blueprints (auth, products, orders, cart…)
│   ├── schemas/         # Marshmallow serialization schemas
│   ├── utils/           # api helpers, upload utilities
│   ├── config.py        # App configuration (env-driven)
│   ├── extensions.py    # db, jwt instances
│   ├── seed.py          # DB seeder (users, products, categories, images)
│   └── run.py           # Entry point
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios API clients per resource
│   │   ├── components/  # Shared UI components + layout
│   │   ├── pages/       # Route-level pages (shop, admin, delivery, auth)
│   │   ├── store/       # Zustand stores (auth, cart)
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Formatting helpers
│   └── index.html
├── docker-compose.yml
└── README.md
```

---

## 🚀 Running with Docker (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Start the app

```bash
docker compose up --build
```

This will:
- Start a **MySQL 8** database on port `3307`
- Build & start the **Flask backend** on port `5000`
- Build & start the **React frontend** (Nginx) on port `3000`
- Seed the database with demo products, categories, and users on first run

### 2. Open the app

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |

### 3. Stop the app

```bash
docker compose down
```

---

## 💻 Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment (see .env section below)
python run.py
```

Backend runs at: **http://localhost:5000**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:3000**

> The Vite dev server proxies all API calls to `http://localhost:5000` automatically.

---

## 🔐 Default Seed Accounts

These accounts are created automatically on first run:

| Role | Email | Password |
|---|---|---|
| Admin | admin@supermart.local | Admin123! |
| Delivery | delivery1@supermart.local | Delivery123! |
| Delivery | delivery2@supermart.local | Delivery123! |
| User | maya@supermart.local | User123! |

> Additional regular user accounts are also seeded (see `seed.py`).

---

## 🌐 API Endpoints

### Auth — `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user (JWT required) |

### Products — `/products`
| Method | Path | Auth |
|---|---|---|
| GET | `/products` | Public |
| GET | `/products/:id` | Public |
| POST | `/products` | Admin |
| PUT | `/products/:id` | Admin |
| DELETE | `/products/:id` | Admin |

### Categories — `/categories`
| Method | Path | Auth |
|---|---|---|
| GET | `/categories` | Public |
| POST | `/categories` | Admin |
| PUT | `/categories/:id` | Admin |
| DELETE | `/categories/:id` | Admin |

### Cart — `/cart`
| Method | Path | Auth |
|---|---|---|
| GET | `/cart` | User |
| POST | `/cart/items` | User |
| PUT | `/cart/items/:id` | User |
| DELETE | `/cart/items/:id` | User |

### Orders — `/orders`
| Method | Path | Auth |
|---|---|---|
| GET | `/orders` | User (own) / Admin (all) |
| GET | `/orders/:id` | User (own) / Admin |
| POST | `/orders/checkout` | User |
| PUT | `/orders/:id` | Admin |

### Delivery — `/delivery`
| Method | Path | Auth |
|---|---|---|
| GET | `/delivery/orders` | Delivery / Admin |
| PUT | `/delivery/orders/:id` | Delivery / Admin |

### Users — `/users`
| Method | Path | Auth |
|---|---|---|
| GET | `/users/me` | Any logged-in user |
| PUT | `/users/me` | Any logged-in user |
| DELETE | `/users/me` | Any logged-in user |
| GET | `/users` | Admin |
| POST | `/users` | Admin |
| PUT | `/users/:id` | Admin |
| DELETE | `/users/:id` | Admin |

### Other
- `GET /files/:key` — Serve uploaded images (public)
- `GET /inventory-logs` — Admin only
- `GET /category-logs` — Admin only
- `GET /api/health` — Health check

---

## 👥 Roles & Permissions

| Feature | User | Delivery | Admin |
|---|---|---|---|
| Browse products | ✅ | ✅ | ✅ |
| Place orders | ✅ | — | ✅ |
| View own orders | ✅ | — | ✅ |
| View all orders | — | — | ✅ |
| Update delivery status | — | ✅ | ✅ |
| Manage products | — | — | ✅ |
| Manage categories | — | — | ✅ |
| Manage users | — | — | ✅ |
| View logs | — | — | ✅ |

---

## 🛠 Environment Variables

The app is configured via environment variables. In development, create a `.env` file in the `backend/` directory:

```env
SQLALCHEMY_DATABASE_URI=sqlite:///app.db
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
UPLOAD_FOLDER=./instance/uploads
CORS_ORIGINS=http://localhost:3000
```

For Docker, defaults are set in `docker-compose.yml`:

```env
MYSQL_ROOT_PASSWORD=rootpass
MYSQL_DATABASE=supermarket
MYSQL_USER=superuser
MYSQL_PASSWORD=superpass
SECRET_KEY=change-me-in-production
JWT_SECRET_KEY=change-jwt-in-production
```

> ⚠️ Always change `SECRET_KEY` and `JWT_SECRET_KEY` in production.

---

## 🐳 Docker Notes

- MySQL data is persisted in a Docker volume (`db_data`)
- Uploaded images are persisted in a Docker volume (`uploads`)
- Frontend is served by Nginx (production build)
- Backend waits for MySQL health check before starting

---

## ⚠️ Troubleshooting

**Build fails / DB not ready:**
```bash
docker compose down -v
docker system prune -f
docker compose up --build
```

**Port already in use:**
```bash
docker ps
docker stop <container_id>
```

**Frontend build errors:**
```bash
cd frontend
npm run build
```

---

## 👩‍💻 Author

Maya Haeems — Full Stack Course Project

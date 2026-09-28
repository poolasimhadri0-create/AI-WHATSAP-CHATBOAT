# Production AI Chatbot Backend (FastAPI + MySQL + Redis)

A modular, production-ready AI Chatbot backend built with **FastAPI**, **MySQL 8** (via SQLAlchemy 2.0 Async ORM + Alembic), **Redis** rate limiting, **JWT Authentication** (access + refresh tokens), and **Token-by-Token SSE streaming** supporting configurable OpenAI and Anthropic models.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (fully asynchronous async/await)
- **Database**: MySQL 8+ with SQLAlchemy 2.0 (using `asyncmy` / `aiomysql` drivers)
- **Migrations**: Alembic with async migration engine
- **Authentication**: JWT tokens (Access: 30 min, Refresh: 7 days) with `passlib` + `bcrypt`
- **Streaming**: Server-Sent Events (`text/event-stream`) streaming completions chunk-by-chunk
- **LLM Integrations**: OpenAI (`gpt-4o-mini`, `gpt-4o`) & Anthropic (`claude-3-5-sonnet`, `claude-3-haiku`) with automatic dev fallback mock streaming
- **Validation**: Pydantic v2 schemas with comprehensive error handling
- **Rate Limiting**: `slowapi` backed by Redis (with automatic fallback to in-memory)
- **Security & Sanitization**: Regex heuristic prompt injection filtering & input boundary enforcement
- **Auditing**: Custom Request/Response logging middleware with process time headers (`X-Process-Time-Ms`)
- **Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` (FastAPI + MySQL + Redis)

---

## 📂 Project Structure

```text
backend/
├── app/
│   ├── main.py                  # FastAPI factory, exception handlers & middleware
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py          # /api/v1/auth (register, login, refresh)
│   │       ├── chat.py          # /api/v1/chat (send SSE stream, conversations list/delete)
│   │       ├── history.py       # /api/v1/chat/history/{id} (conversation history)
│   │       └── users.py         # /api/v1/users/me (authenticated user profile)
│   ├── core/
│   │   ├── config.py            # Pydantic Settings (.env management)
│   │   ├── security.py          # Bcrypt hashing & JWT encode/decode
│   │   ├── dependencies.py      # Auth Bearer dependency & Slowapi Limiter
│   │   └── middleware.py        # Request duration and access logging middleware
│   ├── db/
│   │   ├── base.py              # DeclarativeBase with id, created_at
│   │   └── session.py           # Async SQLAlchemy engine & sessionmaker
│   ├── models/
│   │   └── models.py            # User, Conversation, Message with indexes & cascades
│   ├── schemas/
│   │   └── schemas.py           # Request & Response Pydantic v2 models
│   ├── services/
│   │   ├── auth_service.py      # Registration, verification, token issuance
│   │   ├── chat_service.py      # Context window loading, message saving, SSE pipeline
│   │   └── llm_service.py       # Multi-provider streaming (OpenAI / Anthropic)
│   └── utils/
│       ├── exceptions.py        # Custom domain exceptions (401, 403, 404, 409, 429)
│       ├── logger.py            # Structured logging configuration
│       └── sanitizer.py         # Prompt injection validation & input trimming
├── alembic/                     # Database migrations
├── tests/
│   ├── conftest.py              # In-memory aiosqlite test engine and AsyncClient fixtures
│   ├── test_auth.py             # Auth register, login, refresh, invalid credential tests
│   └── test_chat.py             # Chat SSE streaming, history, context, and injection tests
├── Dockerfile                   # Multi-stage production container
├── docker-compose.yml           # Stack compose (FastAPI, MySQL 8, Redis)
├── requirements.txt
└── .env.example
```

---

## 🚀 Quick Start with Docker (Recommended)

Start the entire stack (FastAPI backend + MySQL 8 + Redis) in one command:

```bash
docker-compose up --build -d
```

Check the health status:
```bash
curl http://localhost:8000/health
```

Explore the interactive Swagger documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 💻 Local Development Setup

### 1. Create Virtual Environment
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Configuration
Copy `.env.example` to `.env` and fill in your database credentials and API keys:
```bash
cp .env.example .env
```

### 4. Run Database Migrations
```bash
alembic upgrade head
```

### 5. Launch FastAPI Development Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account |
| `POST` | `/api/v1/auth/login` | Login with email & password, returns access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Exchange refresh token for a new access token |

### 💬 Chat & Streaming (`/api/v1/chat`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/chat/send` | Send message, load past N context messages, stream tokens via SSE |
| `GET` | `/api/v1/chat/conversations` | List all conversation sessions for authenticated user |
| `GET` | `/api/v1/chat/history/{id}` | Get full conversation details with chronological messages |
| `DELETE`| `/api/v1/chat/conversations/{id}` | Delete conversation and cascade-remove messages |

### 👤 Users (`/api/v1/users`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/users/me` | Retrieve profile of the current authenticated user |

---

## 🌊 Consuming SSE Streaming in Frontend

To consume the SSE stream generated by `POST /api/v1/chat/send`:

```javascript
const response = await fetch("http://localhost:8000/api/v1/chat/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    message: "Explain quantum computing briefly",
    conversation_id: null // or pass existing conversation_id
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder("utf-8");

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Parse event lines:
  // event: start | chunk | done | error
  // data: {"token": "..."}
  console.log(chunk);
}
```

---

## 🧪 Running Unit & Integration Tests

The test suite uses isolated in-memory SQLite (`aiosqlite`) and `httpx.AsyncClient`:

```bash
pytest -v
```

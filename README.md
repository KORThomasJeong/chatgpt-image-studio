# ChatGPT Image Studio

A modern web app for AI image generation and editing powered by OpenAI's Images API (`gpt-image-1`).

## Features

- **Text → Image Generation** — create images from prompts with model/size/quality control
- **Image Editing with Mask** — upload an image, paint a mask, describe changes
- **Gallery & History** — browse, download, and delete all generated images
- **Multi-user with Admin** — admins create accounts; no public signup
- **Personal OpenAI Key** — override the server key with your own
- **Light / Dark Theme** — toggle with system preference detection

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy (async) + Alembic + PostgreSQL
- **Infra**: Docker Compose, nginx (reverse proxy + SPA)

## Quick Start

```bash
cp .env.example .env
# Edit .env — set OPENAI_API_KEY, strong passwords, JWT_SECRET, FERNET_KEY
docker compose up --build -d
```

Open http://localhost:8080 and log in with your `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

## Volume Access (Ubuntu Host)

Generated images and uploads are in `./data/` on the host:

```
./data/images/    — all generated PNGs
./data/uploads/   — temporary edit uploads
./data/postgres/  — PostgreSQL data
```

## Generating Secrets

```bash
# JWT_SECRET
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# FERNET_KEY
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

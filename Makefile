.PHONY: dev dev-backend dev-frontend install test test-backend test-frontend build help

help:
	@echo "Comandos disponibles en el proyecto OptimusKG (Laboratorio 3):"
	@echo "  make dev            - Ejecuta el Backend (FastAPI) y Frontend (Vite) concurrentemente"
	@echo "  make dev-backend    - Ejecuta únicamente el servidor backend FastAPI"
	@echo "  make dev-frontend   - Ejecuta únicamente el servidor frontend Vite"
	@echo "  make install        - Instala dependencias en backend (uv) y frontend (npm)"
	@echo "  make test           - Ejecuta las pruebas automatizadas de backend y frontend"
	@echo "  make test-backend   - Ejecuta las pruebas unitarias y de integración de Python (pytest)"
	@echo "  make test-frontend  - Ejecuta la auditoría del design system y typecheck del frontend"
	@echo "  make build          - Compila el frontend para producción"

install:
	@echo "📦 Instalando dependencias de backend..."
	cd backend && uv sync
	@echo "📦 Instalando dependencias de frontend..."
	cd frontend && npm install

dev-backend:
	cd backend && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "🚀 Iniciando Backend (FastAPI :8000) y Frontend (Vite :5173)..."
	@(trap 'kill 0' SIGINT SIGTERM EXIT; \
		(cd backend && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) & \
		(cd frontend && npm run dev) & \
		wait)

test-backend:
	cd backend && uv run pytest

test-frontend:
	cd frontend && npm run check:design-system && npm run build

test: test-backend test-frontend
	@echo "✨ Todas las pruebas completadas exitosamente."

build:
	cd frontend && npm run build

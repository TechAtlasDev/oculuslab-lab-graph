.PHONY: dev dev-backend dev-frontend test run help

help:
	@echo "Comandos para backend:"
	@echo "  make dev / make run - Inicia el servidor backend FastAPI con reload"
	@echo "  make test           - Ejecuta las pruebas pytest del backend"

dev:
	uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

run: dev

test:
	uv run pytest

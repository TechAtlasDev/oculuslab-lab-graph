.PHONY: dev test build check help

help:
	@echo "Comandos para frontend:"
	@echo "  make dev    - Inicia el servidor de desarrollo Vite"
	@echo "  make test   - Ejecuta la auditoría del design system y build"
	@echo "  make check  - Ejecuta la auditoría del design system"
	@echo "  make build  - Compila para producción"

dev:
	npm run dev

test:
	npm run check:design-system && npm run build

check:
	npm run check:design-system

build:
	npm run build

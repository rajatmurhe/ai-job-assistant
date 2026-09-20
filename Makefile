.PHONY: dev test migrate format lint seed logs down build

dev:
	docker compose up -d postgres backend
	@echo "Backend: http://localhost:8000/docs"

dev-full:
	docker compose --profile dev up -d
	@echo "Frontend: http://localhost:3000  Backend: http://localhost:8000/docs  n8n: http://localhost:5678  Mailhog: http://localhost:8025"

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f backend

test:
	docker exec backend pytest -v

test-unit:
	docker exec backend pytest tests/unit -v

test-integration:
	docker exec backend pytest tests/integration -v

migrate:
	docker exec backend alembic upgrade head

migration:
	docker exec backend alembic revision --autogenerate -m "$(name)"

seed:
	docker exec backend python -m app.db.seed

format:
	docker exec backend black app tests
	docker exec backend ruff check --fix app tests

lint:
	docker exec backend ruff check app tests
	docker exec backend mypy app

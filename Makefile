.PHONY: start up dev down migrate lint test eval

start:
	./start_all.sh

up:
	docker-compose up -d

dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

down:
	docker-compose down -v

migrate:
	docker-compose exec api alembic upgrade head

lint:
	ruff check . && mypy apps/ packages/ --ignore-missing-imports

test:
	pytest apps/api/tests apps/worker/tests packages/ -v --cov

eval:
	python apps/eval/run_eval.py --suite regression --fail-below-threshold

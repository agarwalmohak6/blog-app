.PHONY: up down logs ps shell-be shell-fe clean

# Start all services in the background and rebuild if necessary
up:
	docker compose up --build -d

# Stop all services
down:
	docker compose down

# Tail logs of all services
logs:
	docker compose logs -f

# Show running containers
ps:
	docker compose ps

# Access backend shell
shell-be:
	docker compose exec backend /bin/bash

# Access frontend shell
shell-fe:
	docker compose exec frontend /bin/sh

# Stop services and remove attached volumes (wipes database)
clean:
	docker compose down -v

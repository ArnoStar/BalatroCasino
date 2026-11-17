# BalatroCasino: `make` lists the commands (they run the npm scripts).
#
# Alone:        make install && make run   (http://localhost:5175/casino/; it passes /items, /social,
#               /identity and /play to the services and the game if they run)
# Everything:   make dev in ../BalatroFrontEnd (the whole site, each part from its repository),
#               then http://localhost:5174/casino/ (through the portal: one origin, one session)
.DEFAULT_GOAL := help
.PHONY: help install run check build docker

STACK := ../BalatroFrontEnd/docker-compose.yml

help:
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-8s %s\n", $$1, $$2}'

install: ## dependencies (npm install)
	npm install

run: ## the dev server on http://localhost:5175/casino/ (npm run dev)
	npm run dev

check: ## typecheck and Steiger (npm run check)
	npm run check

build: ## the production build in dist/ (npm run build)
	npm run build

docker: ## the whole site in Docker (the game's compose file): http://localhost:8087/casino/
	docker compose -f $(STACK) up -d --build casino portal

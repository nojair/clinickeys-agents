# Carga el .env automáticamente si existe
ifneq (,$(wildcard .env))
  include .env
  export
endif

SST=npx sst

BRANCH_NAME := $(shell git rev-parse --abbrev-ref HEAD)

.PHONY: local remove-local deploy remove

local:
	@AWS_PROFILE=$(AWS_PROFILE) $(SST) dev --stage local

remove-local:
	@AWS_PROFILE=$(AWS_PROFILE) $(SST) remove --stage local

deploy:
	@if [ -z "$(STAGE)" ]; then \
	  echo "STAGE is not set. Usage: make deploy STAGE=<testing|production>"; \
	  exit 1; \
	fi
	@if [ "$(BRANCH_NAME)" = "test" ] && [ "$(STAGE)" != "testing" ]; then \
	  echo "En la rama 'test', debes usar STAGE=testing"; \
	  exit 1; \
	fi
	@if [ "$(BRANCH_NAME)" = "main" ] && [ "$(STAGE)" != "production" ]; then \
	  echo "En la rama 'main', debes usar STAGE=production"; \
	  exit 1; \
	fi
	@if [ "$(BRANCH_NAME)" != "test" ] && [ "$(BRANCH_NAME)" != "main" ]; then \
	  echo "Para desplegar o eliminar, cambia a la rama 'test' o 'main'. El despliegue solo está permitido desde esas ramas."; \
	  exit 1; \
	fi
	@AWS_PROFILE=$(AWS_PROFILE) $(SST) deploy --stage $(STAGE)

remove:
	@if [ -z "$(STAGE)" ]; then \
	  echo "STAGE is not set. Usage: make remove STAGE=<testing|production>"; \
	  exit 1; \
	fi
	@if [ "$(BRANCH_NAME)" = "test" ] && [ "$(STAGE)" != "testing" ]; then \
	  echo "En la rama 'test', debes usar STAGE=testing"; \
	  exit 1; \
	fi
	@if [ "$(BRANCH_NAME)" = "main" ] && [ "$(STAGE)" != "production" ]; then \
	  echo "En la rama 'main', debes usar STAGE=production"; \
	  exit 1; \
	fi
	@if [ "$(BRANCH_NAME)" != "test" ] && [ "$(BRANCH_NAME)" != "main" ]; then \
	  echo "Para desplegar o eliminar, cambia a la rama 'test' o 'main'. El despliegue solo está permitido desde esas ramas."; \
	  exit 1; \
	fi
	@AWS_PROFILE=$(AWS_PROFILE) $(SST) remove --stage $(STAGE)

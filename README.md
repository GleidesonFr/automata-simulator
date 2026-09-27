# Simulador de Autômatos

Aplicação web composta por um backend FastAPI e um frontend estático. A imagem
Docker executa os dois como um único serviço: a API também entrega o frontend
na raiz da aplicação.

## Execução local com Docker Compose

Pré-requisitos: Docker e Docker Compose.

```bash
docker compose up --build
```

A aplicação estará disponível em <http://localhost:8001/>. O endpoint de saúde
é <http://localhost:8001/health> e a simulação é enviada para
`POST /simulate` na mesma origem.

Para encerrar o serviço:

```bash
docker compose down
```

Caso a porta 8001 já esteja ocupada, escolha outra porta no host:

```bash
APP_PORT=8080 docker compose up --build
```

No PowerShell, use `$env:APP_PORT = "8080"` antes do comando.

## Testes do backend

Com as dependências de `requirements.txt` instaladas:

```bash
cd backend
pytest -q
```

## Deploy no Render

O arquivo `render.yaml` descreve um Blueprint com um único Web Service Docker.

1. Envie o repositório para um provedor Git compatível com o Render.
2. No painel do Render, escolha **New > Blueprint** e conecte o repositório.
3. Confirme o serviço encontrado no `render.yaml` e aplique o Blueprint.

Não é necessário cadastrar uma variável `PORT`: o Render a fornece ao Web
Service, e o container inicia o Uvicorn em `0.0.0.0` usando esse valor. O
healthcheck do Render consulta `/health`.

O `docker-compose.yml` destina-se ao desenvolvimento local; o deploy no Render
é configurado pelo Blueprint.

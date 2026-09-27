from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router

app = FastAPI(
    title="Simulador de AFN-ε",
    description="Simulador de Autômatos Finitos Não Determinísticos com transições vazias",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(router)


# Esta montagem deve permanecer depois das rotas da API para que "/health" e
# "/simulate" tenham precedência sobre os arquivos estáticos.
frontend_dir = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

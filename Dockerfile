FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser

COPY --chown=appuser:appgroup backend ./backend
COPY --chown=appuser:appgroup frontend ./frontend

USER appuser

EXPOSE 10000

CMD ["sh", "-c", "exec uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-10000}"]

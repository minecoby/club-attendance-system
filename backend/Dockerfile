FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

CMD bash -c "\
    while ! nc -z db 5432; do \
      echo 'DB를 기다리는 중...'; \
      sleep 1; \
    done; \
    alembic upgrade head && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
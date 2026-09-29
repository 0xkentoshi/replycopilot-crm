# ReplyCopilot CRM

Небольшой AI Copilot для рабочего окна менеджера: сверяет обращение с локальной базой знаний и готовит ответ клиенту отдельно от внутренней sales-подсказки. Это демонстрационный CRM-like интерфейс, без интеграции с AmoCRM и без отправки сообщений клиенту.

## Demo

Live URL: _добавить после deploy_. Локально: http://localhost:5173.

## What it does

Message → KB retrieval → customer reply + manager sales hint.

## Key features

- Knowledge-grounded replies с источниками цены и сроков.
- Customer/internal separation: копируется только клиентский ответ.
- Missing-info handling: неизвестный запрос требует уточнения.
- Upsell recommendation и короткий блок Why this reply? без chain-of-thought.
- Детерминированный demo mode: пять готовых сценариев, ключ не нужен.

## Stack

React, TypeScript, Vite; Python 3.11+, FastAPI, Pydantic; HTTPX для OpenAI-compatible API. Проверки: pytest, Ruff, Vitest, Testing Library, ESLint, TypeScript.

## Run locally

Нужны Python 3.11+ и Node.js 22+. Откройте два терминала.

Backend:

```sh
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS / Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```sh
cd frontend
npm install
npm run dev
```

Открыть http://localhost:5173. Vite проксирует `/api` на `127.0.0.1:8000`; секреты в браузер не попадают. API schema: http://127.0.0.1:8000/docs.

Если порт 8000 занят, запустите backend с `--port 8001`, а перед запуском frontend в PowerShell задайте `$env:API_PROXY_TARGET='http://127.0.0.1:8001'` (macOS/Linux: `API_PROXY_TARGET=http://127.0.0.1:8001 npm run dev`).

Проверки (в активированном backend venv):

```sh
cd backend
python -m pytest -q
ruff check app tests
cd ../frontend
npm test
npm run lint
npm run build
```

`npm run preview` показывает production build с тем же локальным API proxy. Для публичного размещения нужен отдельный запуск FastAPI и маршрутизация `/api` на него.

## AI configuration

Скопируйте `backend/.env.example` в `backend/.env`, заполните `AI_API_KEY`, `AI_BASE_URL` и `AI_MODEL`. Перезапустите backend из директории `backend`.

Провайдер должен поддерживать `/chat/completions` и JSON object response format. При наличии ключа UI показывает **LIVE AI**. Провайдер выбирает intent и IDs релевантных KB-записей; свободный текст модели не выводится клиенту. Pydantic проверяет план, backend отклоняет неизвестные IDs. Сбой API возвращает понятную ошибку 502, без скрытой подмены на demo.

Реальный вызов платного API требует вашего ключа; автоматические проверки используют заглушки провайдера и не расходуют API-бюджет.

## Demo mode

Без `AI_API_KEY` backend автоматически использует **DEMO MODE**. Одинаковое обращение даёт одинаковый результат, сеть для генерации не нужна. Сценарий подставляет сообщение; кнопка Analyze with AI запускает анализ.

Demo — понятный rule-based движок для небольшой KB, не универсальная модель понимания языка. Confidence — эвристическая оценка покрытия запроса, а не откалиброванная вероятность. Неизвестные ERP, гарантии и условия не подтверждаются; отсутствие релевантных данных снижает confidence до 20%.

## Architecture

```text
Customer message
      ↓
Knowledge Retriever
      ↓
Relevant facts
      ↓
AI / Demo Engine
      ↓
Validated plan → Public-facts policy
      ↓
Structured Response
   ↙              ↘
Customer Reply   Manager Hint
```

```text
backend/
  app/
    main.py, schemas.py, config.py
    services/
      retrieval.py, copilot.py, demo_engine.py
      ai_provider.py, policy.py
  data/knowledge_base.json
  tests/test_copilot.py
  requirements.txt, .env.example
frontend/
  src/
    api/, components/, types/
    App.tsx, main.tsx, styles.css
  tests/
README.md
```

Endpoints: `GET /api/health`, `GET /api/knowledge`, `POST /api/analyze` с `{"customer_message":"..."}`. Результат содержит intent, customer_reply, manager_hint, upsell_opportunity, confidence, used_knowledge, missing_information и rationale. Ввод ограничен 4000 символами. История диалога — статичная иллюстрация; анализируется только текущий текст, данные не сохраняются.

## Design decisions

- No vector DB: для 12 записей достаточно нормализации, keywords и term overlap.
- No invented facts: публичный ответ собирается из проверенных фактов KB и фиксированных вежливых фраз; модель выбирает факты, но не пишет произвольные обещания.
- Customer/internal separation: отдельные поля, отдельный renderer, отдельная кнопка копирования. KB — доверенный, read-only источник.
- Deterministic demo mode: проверяющий может запустить проект без секретов и внешнего AI.
- Structured response: строгие Pydantic-схемы и простой Provider protocol вместо framework/infrastructure.

## AI-assisted development

Codex использовался для implementation, testing и documentation. Product/architecture discussion с ChatGPT: _автору подтвердить использование перед сдачей_. Автор определил scope, UX, requirements и validation rules; ручной review результатов автором — финальный шаг перед отправкой. Token counts не заявляются.

## Видео: сценарий на 1–2 минуты

1. **0:00–0:15** — задача менеджера, три колонки, DEMO MODE и отсутствие зависимости от API key.
2. **0:15–0:40** — Pricing → Analyze: от 25 000 ₽, источник в Knowledge used; отдельно предложение ведения от 18 000 ₽. Copy reply копирует только ответ.
3. **0:40–1:00** — Timeline: 3–5 рабочих дней после материалов; Ready to buy: high opportunity.
4. **1:00–1:20** — Price objection: спокойное уточнение scope; Unknown request: ERP не обещаем, confidence 20%, missing information.
5. **1:20–1:45** — показать схему, зелёные проверки и объяснить фактическую роль AI-инструментов. Подтвердить ручной review.

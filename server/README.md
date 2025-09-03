# Digital Market Backend (Node.js + TypeScript + Prisma + PostgreSQL)

Минимальный каркас для маркетплейса цифровых товаров.

## Быстрый старт

1) **Установи зависимости**
```bash
npm install
```

2) **Подними PostgreSQL** (сам или через Docker)
- Вариант с Docker:
```bash
docker compose up -d
```
Это поднимет:
- `postgres:16` на `localhost:5432` (логин/пароль: `postgres/postgres`, БД: `digital_market`)
- `pgAdmin` на `http://localhost:5050` (логин `admin@local`, пароль `admin`)

3) **Скопируй и отредактируй переменные окружения**
```bash
cp .env.example .env
```
Обязательно замени `JWT_SECRET` на случайную строку.

4) **Прогони миграции и сгенерируй клиент**
```bash
npx prisma migrate dev --name init
```

5) **(Опционально) Засейть тестовые данные**
```bash
npm run db:seed
```

6) **Запусти сервер**
```bash
npm run dev
```
API слушает на `http://localhost:4000`

## Полезные команды

- `npm run dev` — разработка с автоперезапуском
- `npm run build && npm start` — сборка и запуск production
- `npm run prisma:migrate` — миграции (alias для `prisma migrate dev`)
- `npm run prisma:studio` — UI для данных
- `npm run db:seed` — сиды (создаёт 2 пользователя и несколько товаров)

## Короткое описание API (MVP)

- `GET /api/health` — проверка работоспособности
- `POST /api/auth/register` — регистрация `{ email, username, password }`
- `POST /api/auth/login` — логин `{ email, password }` → `{ token }`
- `GET /api/auth/me` — данные текущего пользователя (нужен `Authorization: Bearer <token>`)

### Товары
- `GET /api/items` — список (параметры: `status=LISTED|SOLD|ALL`, `search=`)
- `GET /api/items/:id` — карточка товара
- `POST /api/items` — создать товар (нужен токен)
  ```json
  { "title": "Название", "description": "Описание", "price": 19.99 }
  ```
- `PUT /api/items/:id` — редактировать (продавец)
- `DELETE /api/items/:id` — удалить (продавец)

### Покупки
- `POST /api/orders/purchase/:itemId` — купить (нужен токен)
- `GET /api/orders/my` — мои покупки (нужен токен)
- `GET /api/orders/sales` — мои продажи (нужен токен)

## Примеры curl

Регистрация:
```bash
curl -X POST http://localhost:4000/api/auth/register   -H "Content-Type: application/json"   -d '{ "email":"u1@example.com","username":"user1","password":"password123" }'
```

Логин:
```bash
curl -X POST http://localhost:4000/api/auth/login   -H "Content-Type: application/json"   -d '{ "email":"u1@example.com","password":"password123" }'
```

Создание товара (замени TOKEN на реальный):
```bash
curl -X POST http://localhost:4000/api/items   -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json"   -d '{ "title":"Game Key AAA","description":"Steam key","price":9.99 }'
```

Покупка товара:
```bash
curl -X POST http://localhost:4000/api/orders/purchase/ITEM_ID   -H "Authorization: Bearer TOKEN"
```

Удачи! Дальше можно наращивать функционал: категории, загрузка файлов, отзывы, роли и т.д.

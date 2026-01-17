# Digital Market Backend

Проект реализует базовый функционал маркетплейса:

-   регистрация и аутентификация пользователей
-   публикация товаров
-   покупка товаров
-   история покупок и продаж

---

## Стек технологий

-   **Node.js**
-   **JavaScript**
-   **TypeScript**
-   **React**
-   **Prisma ORM**
-   **PostgreSQL**
-   **JWT (jsonwebtoken)**

---

## Структура проекта

```text
server/
├── prisma/
│   ├── schema.prisma   # схема БД
│   └── seed.ts         # сиды (тестовые данные)
├── src/
│   ├── index.ts        # точка входа
│   ├── routes/         # роуты API
│   └── controllers/    # контроллеры
├── .env                # переменные окружения
├── package.json
├── tsconfig.json
```

---

## Требования

Перед началом убедись, что установлены:

-   **Node.js** ≥ 18
-   **npm**
-   **PostgreSQL** ≥ 17

---

## Установка и запуск проекта с нуля

### 1. Клонировать репозиторий

```bash
git clone <repo-url>
cd digital-market
```

---

## Backend (server)

### 1. Установка зависимостей

```bash
cd server
npm install
```

---

### 2. Поднять PostgreSQL

Параметры базы данных:

-   Host: `localhost`
-   Port: `5432`
-   User: `postgres`
-   Password: `111`
-   Database: `digital_market`

---

### 3. Переменные окружения

Файл `server/.env`:

```env
DATABASE_URL="postgresql://postgres:111@localhost:5432/digital_market?schema=public"
JWT_SECRET="your_jwt_secret"
PORT=4000
CORS_ORIGIN=*
```

---

### 4. Миграции и Prisma Client

```bash
npx prisma migrate dev --name init
```

---

### 5. (Опционально) Сиды

```bash
npm run db:seed
```

---

### 6. Запуск backend

```bash
npm run dev
```

Backend будет доступен:

```
http://localhost:4000
```

---

## Frontend (client)

### 1. Установка зависимостей

```bash
cd ../client
npm install
```

---

### 2. Переменные окружения (если используются)

Пример:

```env
VITE_API_URL=http://localhost:4000
```

---

### 3. Запуск frontend

```bash
npm run dev
```

Frontend будет доступен:

```
http://localhost:5173
```

---

## API (Backend)

### Auth

-   `POST /api/auth/register`
-   `POST /api/auth/login`
-   `GET /api/auth/me`

### Items

-   `GET /api/items`
-   `GET /api/items/:id`
-   `POST /api/items`
-   `PUT /api/items/:id`
-   `DELETE /api/items/:id`

### Orders

-   `POST /api/orders/purchase/:itemId`
-   `GET /api/orders/my`
-   `GET /api/orders/sales`

---

## 🛠 Полезные команды

```bash
npm run dev
npm run build
npm start
npm run prisma:migrate
npm run prisma:studio
npm run db:seed
```

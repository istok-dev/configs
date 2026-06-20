---
name: prisma
description: >-
  Работа с Prisma 7
  Используй при добавлении моделей, миграций, seed-данных, Prisma Client или запросов к БД.
---

## Миграции

**Не запускай миграции** (`prisma migrate dev`, `prisma migrate deploy`, `prisma migrate reset`, `pnpm db:migrate`) без явного указания пользователя.

Допустимо без запроса: править `schema.prisma`, создавать/редактировать SQL-файлы в `prisma/migrations/`, `prisma generate`.

## Имя таблицы

Каждой модели задавай кастомное имя таблицы в нижнем регистре через `@@map`:

```prisma
model Exercise {
  // ...

  @@map("exercises")
}
```

Формат: множественное число, lowercase — `Exercise` → `exercises`, `User` → `users`.

## Поле `id`

> **PostgreSQL.** Маппинг `map` на `@@id` поддерживается только PostgreSQL. В SQLite используй `@@id([id])` без `map`.

Поле `id` всегда объявляется **последним** в модели. Первичный ключ задаётся через `@@id` на уровне модели с маппингом имени:

```prisma
model Exercise {
  name        String
  description String
  id          Int

  @@id([id], map: "PK_exercise_id")
  @@map("exercises")
}
```

Формат маппинга PK: `PK_<model_snake_case>_id` — например `Exercise` → `PK_exercise_id`, `User` → `PK_user_id`.

На самом поле `id` **не** ставить `@id` — только `@@id` внизу модели (`@@id([id], map: "...")` для PostgreSQL, `@@id([id])` для SQLite).

## Уникальный индекс

Уникальные ограничения задаются через `@@unique` на уровне модели с маппингом имени:

```prisma
model User {
  email String
  // ...
  id    String @default(cuid())

  @@unique([email], map: "UQ_users_email")
  @@id([id], map: "PK_user_id")
  @@map("users")
}
```

Формат маппинга: `UQ_<table>_<field>` — например `users` + `email` → `UQ_users_email`.

На самом поле **не** ставить `@unique` — только `@@unique([field], map: "...")` внизу модели.

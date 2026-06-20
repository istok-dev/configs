---
name: next-project-envs
description: >-
  Переменные окружения в Next.js проекте.
  Используй при добавлении env-переменных, конфигов окружения, public/server env и интеграции next-runtime-env.
---

# Переменные окружения в Next.js

Все env-переменные собираются в `src/shared/configs/`. **Не читай** `process.env` и **не вызывай** `env()` из `next-runtime-env` напрямую в компонентах, views, hooks и lib — импортируй готовые конфиги.

## `src/shared/configs/public-env.ts`

Публичные переменные (доступны на клиенте и сервере) собираются через `next-runtime-env`:

```ts
import { env } from "next-runtime-env";

export const publicEnvConfig = {
  app: {
    get url() {
      return env("NEXT_PUBLIC_SITE_URL");
    },
  },
  server: {
    get apiUrl() {
      return env("NEXT_PUBLIC_API_URL");
    },
  },
};
```

Переменные **логически разделяются по вложенным объектам** — группируй по домену (`app`, `server`, `analytics` и т.д.), а не выкладывай плоским списком на верхнем уровне.

`env()` на клиенте читает `window.__ENV`, который появляется после `<PublicEnvScript />`. **Не вычисляй значения один раз при загрузке модуля** — используй getter'ы, чтобы `env()` вызывался в момент обращения к конфигу.

- Ключи внутри групп — camelCase, без префикса `NEXT_PUBLIC_`
- Имена env-переменных в окружении — с префиксом `NEXT_PUBLIC_`
- Для runtime-доступа на клиенте в корневом `app/layout.tsx` подключи `<PublicEnvScript />` из `next-runtime-env`

Использование:

```ts
import { publicEnvConfig } from "@/shared/configs/public-env";

fetch(`${publicEnvConfig.server.apiUrl}/skills`);
```

## `src/shared/configs/server-env.ts`

Серверные переменные (только Node.js, без `NEXT_PUBLIC_`) собираются в один объект:

```ts
import "server-only";

export const serverEnvConfig = {
  auth: {
    apiSecret: process.env.API_SECRET,
  },
} as const;
```

Та же схема вложенных объектов, что и в `public-env.ts` — группируй по логическому домену.

- Импортируй `serverEnvConfig` **только** в Server Components, Route Handlers, Server Actions и серверных модулях
- **Не импортируй** `server-env.ts` в Client Components (`"use client"`)

## Правила

| Тип | Файл | Где использовать |
|-----|------|------------------|
| Публичные | `public-env.ts` | Клиент и сервер |
| Серверные | `server-env.ts` | Только сервер |

Новая переменная → добавь в соответствующий конфиг → используй через `publicEnvConfig` или `serverEnvConfig`.

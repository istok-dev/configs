---
name: workspace
description: >-
  Организация pnpm monorepo.
  Используй при создании новых приложений и пакетов, настройке workspace и подключении зависимостей между проектами.
---

# pnpm workspace

Все проекты в монорепозитории создаются **только через pnpm workspace**. Не инициализируй отдельные npm/yarn-проекты вне workspace.

## Структура репозитория

```
/
├── pnpm-workspace.yaml
├── package.json
├── apps/              # приложения (Next.js, NestJS, CLI и т.п.)
│   └── web/
└── packages/          # общие пакеты (конфиги, UI-kit, SDK, утилиты)
    └── ui/
```

| Каталог | Что размещать |
| --- | --- |
| `apps/*` | Запускаемые приложения: web, api, admin, worker |
| `packages/*` | Переиспользуемые библиотеки: конфиги, UI, типы, клиенты API |

**Не создавай** приложения в `packages/` и библиотеки в `apps/`.

## `pnpm-workspace.yaml`

В корне монорепозитория:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

После добавления новой папки в `apps/` или `packages/` достаточно `pnpm install` из корня — pnpm подхватит пакет автоматически.

## Создание приложения (`apps/*`)

1. Создай папку `apps/<name>/` с `package.json` (`"name": "@scope/<name>"`, `"private": true` для приложений).
2. Установи зависимости из **корня** монорепозитория:

```bash
pnpm add <dep> --filter @scope/<name>
pnpm add -D <devDep> --filter @scope/<name>
```

3. Подключай общие пакеты из `packages/*` через `workspace:`:

```json
{
  "dependencies": {
    "@scope/ui": "workspace:*"
  }
}
```

4. Для структуры кода внутри приложения используй профильные skills:
   - Next.js → `next-project-structure`, `next-project-envs`
   - NestJS → `nest-project-structure`
   - Prisma → `prisma`

## Создание пакета (`packages/*`)

1. Создай папку `packages/<name>/` с `package.json`.
2. Укажи `"name": "@scope/<name>"` и `"version"` (если пакет публикуется).
3. Добавь `"main"`, `"types"`, `"exports"` по необходимости.
4. Зависимости между workspace-пакетами — через `"workspace:*"`.
5. Установка зависимостей — из корня:

```bash
pnpm add -D typescript --filter @scope/<name>
```

## Общие правила

- **Один lockfile** — `pnpm-lock.yaml` в корне; не запускай `pnpm install` внутри отдельного app/package изолированно, если можно выполнить из корня.
- **Скрипты из корня** — `pnpm --filter @scope/<name> <script>` или `pnpm -r <script>` для всех пакетов.
- **Именование** — scope единый для всего монорепозитория (`@istok-dev/*`, `@scope/*` и т.п.).
- **Конфиги istok** — ESLint, TS, skills подключай из `@istok-dev/*` пакетов; для Cursor skills укажи `workspace` в `istok.config.*`.

## Чего не делать

- не создавать `package.json` вне `apps/*` и `packages/*` (кроме корневого);
- не дублировать `node_modules` в каждом проекте вручную;
- не использовать относительные пути (`file:../../packages/ui`) — только `workspace:*`.

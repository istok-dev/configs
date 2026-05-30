# @istok-dev/configs

Общие конфигурации для проектов [istok-dev](https://github.com/istok-dev): ESLint, TypeScript и EditorConfig. Пакеты публикуются в [GitHub Packages](https://github.com/orgs/istok-dev/packages).

## Требования

- Node.js **≥ 24**
- pnpm **10.26.2** (для разработки в этом репозитории)
- TypeScript **6** (для `@istok-dev/tsconfig`)

## Настройка registry

В корне проекта-потребителя создайте `.npmrc`:

```ini
@istok-dev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
always-auth=true
```

Токен — [GitHub PAT](https://github.com/settings/tokens) с правом `read:packages` (для публикации — `write:packages`). Переменная окружения:

```bash
export GITHUB_TOKEN=ghp_...
```

## Пакеты

| Пакет | Описание |
| --- | --- |
| [`@istok-dev/eslint-base`](./packages/eslint-base) | TypeScript, import-x, stylistic |
| [`@istok-dev/eslint-react`](./packages/eslint-react) | React, hooks, Tailwind |
| [`@istok-dev/eslint-next`](./packages/eslint-next) | Next.js поверх react |
| [`@istok-dev/eslint-nest`](./packages/eslint-nest) | NestJS поверх base |
| [`@istok-dev/tsconfig`](./packages/tsconfig) | Пресеты TypeScript 6 |
| [`@istok-dev/editorconfig`](./packages/editorconfig) | Общий `.editorconfig` |

---

## ESLint

Конфиги — flat config (ESLint 10). В проекте нужен `eslint.config.mjs` (или `.js`).

### Base (Node, библиотеки)

```bash
pnpm add -D @istok-dev/eslint-base eslint @stylistic/eslint-plugin eslint-plugin-import-x typescript-eslint eslint-import-resolver-typescript
```

```js
// eslint.config.mjs
import base from "@istok-dev/eslint-base";

export default base;
```

### React

```bash
pnpm add -D @istok-dev/eslint-react eslint @eslint-react/eslint-plugin eslint-plugin-react-hooks eslint-plugin-better-tailwindcss
```

Плагины из `eslint-base` подтягиваются транзитивно; при необходимости установите их явно (см. `peerDependencies` у `@istok-dev/eslint-base`).

```js
import react from "@istok-dev/eslint-react";

export default react;
```

Классы Tailwind с префиксом `istok-*` разрешены правилом `better-tailwindcss/no-unknown-classes`.

### Next.js

```bash
pnpm add -D @istok-dev/eslint-next eslint @next/eslint-plugin-next
```

```js
import next from "@istok-dev/eslint-next";

export default next;
```

### NestJS

```bash
pnpm add -D @istok-dev/eslint-nest eslint
```

```js
import nest from "@istok-dev/eslint-nest";

export default nest;
```

Дополнительные правила в своём проекте:

```js
import nest from "@istok-dev/eslint-nest";

export default [
  ...nest,
  {
    rules: {
      // ваши переопределения
    },
  },
];
```

---

## TypeScript

Пресеты под [TypeScript 6](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/): пустой `types` по умолчанию, явный `@types/node` для Node/Nest.

```bash
pnpm add -D @istok-dev/tsconfig typescript @types/node
```

| Пресет | Когда использовать |
| --- | --- |
| `@istok-dev/tsconfig/base.json` | Только общие strict-опции |
| `@istok-dev/tsconfig/node.json` | Node backend |
| `@istok-dev/tsconfig/nest.json` | NestJS (декораторы) |
| `@istok-dev/tsconfig/react.json` | React / Vite |
| `@istok-dev/tsconfig/next.json` | Next.js |

Пример для Nest с emit:

```json
{
  "extends": "@istok-dev/tsconfig/nest.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

Для тестов добавьте в свой `tsconfig.json`, например: `"types": ["node", "vitest"]`.

Пример для Next (в `tsconfig.json` приложения):

```json
{
  "extends": "@istok-dev/tsconfig/next.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## EditorConfig

```bash
pnpm add -D @istok-dev/editorconfig
pnpm exec editorconfig
```

Скопирует `.editorconfig` в текущую директорию. Другая папка:

```bash
pnpm exec editorconfig ./apps/web
```

---

## Разработка

```bash
git clone https://github.com/istok-dev/configs.git
cd configs
corepack enable
pnpm install
```

Монорепозиторий на pnpm workspaces (`packages/*`). Публикация пакетов — в GitHub Packages scope `@istok-dev`.

### Changesets

При изменении публикуемых пакетов в PR:

```bash
pnpm changeset
```

Выберите затронутые пакеты, semver (`patch` / `minor` / `major`) и опишите изменение для CHANGELOG.

### CI и релизы

| Workflow | Когда | Что делает |
| --- | --- | --- |
| [CI](./.github/workflows/ci.yml) | PR в `master` | Проверяет наличие changeset при изменениях в `packages/` |
| [Release](./.github/workflows/release.yml) | push в `master` | Создаёт PR «Version Packages» или публикует пакеты, если версии уже подняты |

### Как выходит релиз

1. PR с changeset → merge в `master`
2. Release workflow создаёт PR **chore: version packages** (версии + CHANGELOG)
3. Merge этого PR → workflow публикует пакеты в GitHub Packages

Локально (без publish):

```bash
pnpm version-packages
```

## Лицензия

[MIT](./LICENSE)

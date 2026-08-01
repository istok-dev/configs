---
name: next-project-structure
description: >-
  Структура Next.js проекта.
  Используй при создании страниц, роутов, конфигов, tsconfig, ESLint и при рефакторинге структуры web-приложения.
---

# Структура Next.js проекта

## `app/`

В `app` пишутся только мета-информация для Next:

- `page.tsx` — тонкая обёртка: экспорт метаданных (`metadata`, `generateMetadata`) и реэкспорт страницы из `src/views`
- `layout.tsx` — layout-обёртки для сегмента маршрута
- `loading.tsx`, `error.tsx`, `not-found.tsx` — специальные файлы Next.js
- `globals.css` — глобальные стили

**Не размещай** в `app` бизнес-логику, UI-компоненты страниц и крупные блоки разметки — они живут в `src/views`.

```tsx
// app/signup/page.tsx
import type { Metadata } from "next";

import { SignupPage } from "@/views/signup";

export const metadata: Metadata = {
  title: "Регистрация",
};

export default SignupPage;
```

## `src/views/`

В `src/views` живут страницы. Одна страница — одна папка (имя совпадает с сегментом маршрута, kebab-case).

Импорт через алиас `@/views/*` → `./src/views/*`.

### Структура модуля страницы

```
src/views/signup/
  index.ts                 # публичный реэкспорт
  signup.page.tsx          # Server Component — точка входа страницы
  signup.types.ts          # (опционально) типы PageProps, UI props, формы
  ui/
    signup.tsx             # Client Component — разметка и интерактив
    signup.types.ts        # (опционально) типы, специфичные для UI (FormFields и т.п.)
    logout-button.tsx      # (опционально) локальные подкомпоненты страницы
```

| Файл | Назначение |
|------|------------|
| `index.ts` | Реэкспортирует `{Name}Page` из `{name}.page.tsx` |
| `{name}.page.tsx` | Server Component: загрузка данных, валидация, redirect, передача props в UI |
| `ui/{name}.tsx` | Client Component (`'use client'`): формы, хуки, обработчики, разметка |
| `{name}.types.ts` | Типы модуля: `PageProps`, props UI-компонента, поля формы |
| `ui/*.tsx` | Подкомпоненты, используемые только на этой странице |

### Именование

- Папка и файлы — **kebab-case** (`reset-password`, `reset-password.page.tsx`)
- Server-компонент страницы — **`{PascalCase}Page`** (`SignupPage`, `LoginPage`)
- Client UI — **`{PascalCase}PageUI`** (`SignupPageUI`, `LoginPageUI`)

### Разделение server / client

**`{name}.page.tsx`** — async Server Component. Здесь:
- чтение `searchParams`, `params`
- вызов server actions / fetch данных
- redirect, throw при ошибках валидации
- передача подготовленных данных в UI

**`ui/{name}.tsx`** — `'use client'`. Здесь:
- `useState`, `useForm`, обработчики событий
- клиентские API-вызовы
- вся интерактивная разметка

```tsx
// src/views/signup/signup.page.tsx
import { validateRequest } from "@/app/lib/actions";

import { SignupPageUI } from "./ui/signup";

type PageProps = {
  searchParams: Promise<{ request_id?: string; error?: string }>;
};

export async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestId = params.request_id;

  if (requestId) {
    const { isValid, error } = await validateRequest(requestId);
    if (!isValid) {
      throw new Error(error?.message ?? "Не удалось проверить запрос.");
    }
  }

  return (
    <SignupPageUI
      requestId={requestId}
      error={params.error}
    />
  );
}
```

```tsx
// src/views/signup/index.ts
export { SignupPage } from "./signup.page";
```

```tsx
// src/views/signup/ui/signup.tsx
"use client";

export type SignupPageProps = {
  requestId?: string;
  error?: string;
};

export function SignupPageUI({ requestId, error }: SignupPageProps) {
  // форма, хуки, разметка
}
```

### Типы

Типы можно держать:
- в `{name}.types.ts` на уровне модуля — `PageProps`, props UI, поля формы (если используются и page, и ui)
- в `ui/{name}.types.ts` — только UI-специфичные типы (например, `FormFields`)

Props UI-компонента допустимо экспортировать прямо из `ui/{name}.tsx`, если типов мало.

### Простые страницы

Если страница не требует server-логики (например, `error`), можно обойтись без `{name}.page.tsx` и реэкспортировать UI напрямую:

```
src/views/error/
  index.ts          # export * from "./ui/error-page"
  ui/
    error-page.tsx
```

```tsx
// app/error.tsx
"use client";

import { ErrorPage } from "@/views/error";

export default ErrorPage;
```

### Локальные подкомпоненты

Компоненты, нужные только одной странице, кладут в `ui/` рядом с основным UI (`home/ui/logout-button.tsx`). Не выноси их в общие `components/`, если они не переиспользуются.

### Что не класть в `views`

- переиспользуемые UI-примитивы и layout-компоненты → `src/components/`
- API-клиент, env, утилиты → `src/shared/`
- составные блоки, используемые на нескольких страницах → `src/widgets/` (если есть слой widgets)

## `src/shared/configs/`

В `src/shared/configs` пишутся конфиги.

Сюда выносятся константы приложения, настройки окружения, feature flags, маршруты, темы и прочие конфигурационные данные — всё, что не является UI и не привязано к одной странице.

Env-конфиги (`public-env.ts`, `server-env.ts`) группируют переменные во вложенные объекты по логическому домену — см. skill `next-project-envs`.

## TypeScript (`tsconfig`)

Базовые настройки — shared-preset `@istok-dev/tsconfig/next.json`. Единственный конфиг: `tsconfig.json` в корне frontend-приложения.

**Не дублируй** strict/module/lib из preset — переопределяй только project-specific опции.

```json
{
  "extends": "@istok-dev/tsconfig/next.json",
  "compilerOptions": {
    "jsx": "preserve",
    "noPropertyAccessFromIndexSignature": false,
    "noUncheckedIndexedAccess": false,
    "paths": {
      "@/*": ["./src/*"],
      "@/views/*": ["./src/views/*"]
    },
    "esModuleInterop": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

| Override | Зачем |
|----------|-------|
| `jsx: "preserve"` | JSX обрабатывает Next.js / SWC |
| `paths` | алиасы `@/*` (общий код) и `@/views/*` (страницы) |
| `include` | исходники + типы Next (`.next/types`) |

Новый path alias → добавь в `paths` и используй тот же префикс в импортах (`@/components/*`, `@/shared/*` и т.д.).

DevDependency: `"@istok-dev/tsconfig": "<version>"` в `package.json` приложения.

**Не создавай** отдельный `tsconfig.build.json` — сборку типов ведёт Next.js.

## ESLint

ESLint 10 (flat config) во frontend-приложении (`apps/<frontend>/`). Preset — `@istok-dev/eslint-next` из org registry (см. `.npmrc`). Версия `eslint` закреплена в root monorepo.

### Файл конфигурации

Единственный конфиг: `eslint.config.mjs` в корне приложения. **Не создавай** `.eslintrc*` — расширяй этот файл.

```js
import eslintConfig from '@istok-dev/eslint-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tailwindEntry = resolve(__dirname, './src/app/globals.css');

/** Паттерны Tailwind-классов, не выводимые из entryPoint — настрой под проект */
const tailwindUnknownClassIgnore = ['<design-system-prefix>-*', '<custom-utility>'];

export default defineConfig(
  eslintConfig,
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: resolve(__dirname, './tsconfig.json'),
          alwaysTryTypes: true,
        },
      },
      'better-tailwindcss': { entryPoint: tailwindEntry },
      'eslint-plugin-better-tailwindcss': { entryPoint: tailwindEntry },
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', { ignore: tailwindUnknownClassIgnore }],
    },
  },
  globalIgnores(['dist/**']),
);
```

### Что входит в `@istok-dev/eslint-next`

| Слой | Пакет | Основные правила |
|------|-------|------------------|
| TypeScript / imports | `@istok-dev/eslint-base` | `typescript-eslint`, `eslint-plugin-import-x`, `@stylistic/eslint-plugin` |
| React / Tailwind | `@istok-dev/eslint-react` | `@eslint-react/eslint-plugin`, `eslint-plugin-react-hooks`, `eslint-plugin-better-tailwindcss` |
| Next.js | `@next/eslint-plugin-next` | правила Next.js |

**Не дублируй** плагины локально — меняй preset в `@istok-dev/*`, если нужны общие правила для всех проектов.

### Project overrides

В `eslint.config.mjs` — только настройки, специфичные для репозитория:

- **`import/resolver.typescript`** — резолв path aliases через `tsconfig.json` приложения
- **`better-tailwindcss.entryPoint`** — путь к Tailwind entry (обычно `./src/app/globals.css`)
- **`tailwindUnknownClassIgnore`** — glob-паттерны кастомных/динамических классов для `better-tailwindcss/no-unknown-classes`

Новые игнорируемые классы добавляй в `tailwindUnknownClassIgnore`, а не отключай rule целиком.

### Запуск

Имя пакета — поле `name` в `package.json` (`<frontend-package>`).

| Команда | Что делает |
|---------|------------|
| `pnpm --filter <frontend-package> lint` | `eslint .` |
| `pnpm lint` (root) | lint всех workspace-пакетов |

**Не отключай** правила без причины; `eslint-disable` — точечно, с комментарием почему.

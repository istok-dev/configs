---
name: react-project
description: >-
  Конвенции React-приложения: @istok-dev/web-ui, проверка компонентов перед созданием, формы через react-hook-form.
  Используй при инициализации React-проекта, создании UI-компонентов и форм.
---

# React-проект

## Инициализация

При инициализации проекта нужно добавить библиотеку `@istok-dev/web-ui`.

В монорепозитории — из корня:

```bash
pnpm add @istok-dev/web-ui --filter @scope/<app-name>
```

В standalone-проекте:

```bash
pnpm add @istok-dev/web-ui
```

Подключи стили и провайдеры из `web-ui` по документации пакета (если требуются).

## Компоненты

Перед тем как создать компонент, нужно проверить его существование в `web-ui`.

1. Просмотри экспорты `@istok-dev/web-ui` (документация пакета, `package.json` → `exports`, исходники в `packages/ui` монорепозитория).
2. Если подходящий компонент есть — **импортируй из `@istok-dev/web-ui`**, не дублируй в проекте.
3. Создавай локальный компонент только если в `web-ui` нет нужного API или требуется доменная обёртка над примитивом из `web-ui`.

```tsx
// ✅ примитив из design system
import { Button, Input } from "@istok-dev/web-ui";

// ❌ не создавай свой Button/Input, если они уже есть в web-ui
```

Переиспользуемые UI-примитивы и layout-компоненты → `src/components/`. Доменные блоки, специфичные для приложения → `src/widgets/` или рядом с фичей.

## Формы

Любые формы в проекте создаются с помощью `react-hook-form`.

Установка (если ещё не добавлена):

```bash
pnpm add react-hook-form --filter @scope/<app-name>
```

Поля формы — из `@istok-dev/web-ui` (после проверки наличия). Связывай их с формой через `<Controller />`, а не через `register` — так корректно работают controlled-компоненты design system.

Валидация — через `resolver` (`@hookform/resolvers` + zod/yup) или `rules` в `Controller`.

```tsx
import { Controller, useForm } from "react-hook-form";
import { Button, Input } from "@istok-dev/web-ui";

type LoginFields = {
  email: string;
  password: string;
};

export function LoginForm() {
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFields>();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="email"
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <Input {...field} error={errors.email?.message} />
        )}
      />
      <Controller
        name="password"
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <Input {...field} type="password" error={errors.password?.message} />
        )}
      />
      <Button type="submit">Войти</Button>
    </form>
  );
}
```

**Не используй** `register` для полей из `web-ui`. **Не используй** для форм `useState` на каждое поле, Formik, uncontrolled-формы без `react-hook-form` — если только пользователь явно не попросил иное.

## Связанные skills

- Монорепозиторий и зависимости → `workspace`
- Next.js (App Router, `views/`) → `next-project-structure`

# @istok-dev/istok-configs

## 1.1.0

### Minor Changes

- a091bb1: Добавлен skill `workspace`: организация pnpm monorepo, приложения в `apps/*`, пакеты в `packages/*`.

  Добавлен skill `authorization`: OAuth2/OIDC (PKCE), NextAuth на клиенте, JWT-валидация на NestJS.

## 1.1.0

### Minor Changes

- Добавлен skill `workspace`: организация pnpm monorepo, приложения в `apps/*`, пакеты в `packages/*`.
- Добавлен skill `authorization`: OAuth2/OIDC (PKCE), NextAuth на клиенте, JWT-валидация на NestJS.

## 1.0.0

### Major Changes

- 5cd88c8: Первый релиз `@istok-dev/istok-configs`: CLI `istok`, Cursor Agent Skills и EditorConfig через `istok.config.*`.

## 1.0.0

### Major Changes

- Первый релиз: единый CLI `istok` для проектных конфигов.
- Cursor Agent Skills: копирование указанных скиллов в `.agents/skills/` по `istok.config.*`.
- EditorConfig: копирование `.editorconfig` в проект при `editorconfig: true`.
- Поддержка конфигов `istok.config.js`, `istok.config.mjs`, `istok.config.json`.

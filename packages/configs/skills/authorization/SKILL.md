---
name: authorization
description: >-
  Описывает OAuth2/OIDC-авторизацию через внешний IdP (PKCE), NextAuth на
  клиенте и JWT-валидацию на NestJS-сервере. Используй при изменении входа,
  сессий, refresh-токенов, JwtAuthGuard, защищённых API-эндпоинтов или
  клиентских вызовов с Bearer-токеном.
---

# Авторизация в Wishlist

## Архитектура

```
Browser → IdP (OAuth2 PKCE) → /auth/callback → NextAuth (JWT session)
                                                      ↓
                                            POST /auth/token (server)
                                                      ↓
                                            IdP token exchange + upsert user
                                                      ↓
Client API calls (Bearer access_token) → JwtAuthGuard → request.user
```

- **IdP**: внешний провайдер (`@istok-dev/idp-sdk-js` на клиенте, `@istok-dev/idp-sdk-nodejs` на сервере).
- **Клиент** хранит сессию в **NextAuth** (strategy: `jwt`), не ходит в IdP напрямую за refresh — делегирует серверу.
- **Сервер** обменивает code/refresh через IdP, верифицирует access token по **JWKS**, поднимает `request.user` из локальной БД.
- Отдельной RBAC-модели нет: доступ определяется наличием `user.id` и бизнес-логикой сервисов (владелец вишлиста, co-editor и т.д.).

## Клиент (`apps/web`)

### Вход (OAuth2 Authorization Code + PKCE)

1. `startIdpLogin()` в `src/lib/idp-auth.ts` — генерирует `state`, `nonce`, PKCE (`code_verifier` / `code_challenge`), сохраняет PKCE в `sessionStorage`, редиректит на IdP.
2. Callback: `src/views/auth-callback/auth-callback-page.tsx` — читает `code`/`state`, восстанавливает `code_verifier` через `loadPkce(state)`, вызывает `signIn('idp', { code, code_verifier, redirect_uri })`.
3. NextAuth CredentialsProvider (`src/lib/auth.ts`, id: `idp`) в `authorize()`:
   - `POST /auth/token` → получает `access_token`, `refresh_token`, `expires_in`;
   - `GET /users/me` с Bearer → профиль пользователя;
   - возвращает User с токенами и `expires_at`.

Redirect URI: `{NEXT_PUBLIC_APP_URL}/auth/callback` (`getCallbackRedirectUri()`).

Точка входа UI: кнопка «Войти» в `src/components/header.tsx` → `startIdpLogin()`.

### Сессия и refresh

Файл: `src/lib/auth.ts`

| Callback | Поведение |
|----------|-----------|
| `jwt` | При первом входе кладёт токены в JWT. Если до `expires_at` < 60 сек — вызывает `POST /auth/refresh`. При ошибке ставит `token.error = 'RefreshAccessTokenError'` и удаляет токены. |
| `session` | Пробрасывает `session.data = { access_token, expires_at }`. При `token.error` — `session.error`. |

Типы расширены в `src/types/next-auth.d.ts`.

NextAuth route: `src/app/api/auth/[...nextauth]/route.ts`.

### Контекст и защита страниц

- `AuthProvider` (`src/context/auth.tsx`) — `useSession()` + `useUser()`; отдаёт `accessToken`, `user`, `logout` (`nextAuthSignOut`).
- `/app/*` layout (`src/app/app/layout.tsx`) — server-side redirect на `/`, если нет сессии.

### Вызовы API с токеном

**Клиент (browser):**

- Глобальный interceptor в `src/components/providers.tsx` — на каждый запрос `@internal/api` client добавляет `Authorization: Bearer {access_token}` из `getClientSession()` (кэш сессии на 5 мин).
- Хуки могут дополнительно передавать headers явно (см. `use-wishlists.ts`).

**Server Components / RSC:**

- `getServerClient()` (`src/shared/lib/get-server-client.ts`) — `getServerSession(authOptions)` + Bearer в headers.

**Server session helper:** `getServerSession()` в `src/shared/lib/get-server-session.ts`.

### Конфиг клиента

`src/shared/config/client-config.ts`:

- `NEXT_PUBLIC_IDP_BASE_URL`, `NEXT_PUBLIC_IDP_CLIENT_ID`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_EXTERNAL_API_URL`
- `AUTH_SECRET`, `NEXTAUTH_URL` — для NextAuth

## Сервер (`apps/server`)

### Token flow (без JWT-guard)

`AuthController` (`src/presentation/auth/auth.controller.ts`):

| Endpoint | Назначение |
|----------|------------|
| `POST /auth/token` | Обмен code + code_verifier + redirect_uri на токены |
| `POST /auth/refresh` | Refresh access token |

`AuthService` (`src/application/auth/auth.service.ts`):

- `exchangeCode()` — IdP exchange → `getProfile()` → upsert пользователя в БД по `profile.sub` → вернуть токены.
- `refreshTokens()` — IdP refresh с дедупликацией параллельных запросов (Map по refresh_token).

Эндпоинты **публичные** (без `@UseGuards`).

### JWT-аутентификация запросов

`JwtAuthGuard` (`src/infrastructure/auth/jwt-auth.guard.ts`):

1. Читает `Authorization: Bearer {token}`.
2. `JwtAuthService.verifyAccessToken()` — decode → JWKS (`{IDP_BASE_URL}/.well-known/jwks.json`) → verify RS256/ES256, issuer = `IDP_ISSUER`.
3. `UsersService.findById(payload.sub)` → `request.user = { id, email, name }`.

Guard зарегистрирован глобально через `AuthModule` (`src/infrastructure/auth/auth.module.ts`), но применяется **явно** `@UseGuards(JwtAuthGuard)` на контроллерах.

Декораторы:

- `@CurrentUser()` — `request.user` (`src/infrastructure/auth/current-user.decorator.ts`).
- `@IsAuthOptional()` — без Bearer не 401; `request.user` только если токен валиден (`public-wishlists.controller.ts`).

Типизация: `src/express.d.ts`.

### Защищённые контроллеры

`@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()` на уровне класса:

- `UsersController` — `GET /users/me`
- `WishlistsController`, `FriendsController`, `UserTagsController`

Опциональная auth:

```typescript
@Get(':id')
@UseGuards(JwtAuthGuard)
@IsAuthOptional()
async findOnePublic(@CurrentUser() user?: CurrentUserDto) { ... }
```

### Конфиг сервера

`ConfigService.idp` (`src/infrastructure/config/config.service.ts`):

- `IDP_BASE_URL`, `IDP_ISSUER`, `IDP_CLIENT_ID`, `IDP_CLIENT_SECRET`
- `jwksUri` = `{IDP_BASE_URL}/.well-known/jwks.json`

## Чеклист: добавить защищённый эндпоинт

1. Контроллер: `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth()`.
2. Параметр: `@CurrentUser() user: CurrentUserDto` (или `user?:` + `@IsAuthOptional()`).
3. Бизнес-логика: передавать `user.id`, проверять права в сервисе.
4. OpenAPI: `@ApiResponse({ status: 401 })` при обязательной auth.
5. Клиент: вызов через `@internal/api` client (interceptor подставит Bearer) или `getServerClient()` в RSC.

## Чеклист: изменить login flow

1. PKCE/redirect — `src/lib/idp-auth.ts`, callback — `auth-callback-page.tsx`.
2. Обмен code — NextAuth `authorize()` и/или `AuthService.exchangeCode()`.
3. Поля сессии — `auth.ts` callbacks + `next-auth.d.ts`.
4. Не дублировать refresh на клиенте вручную — только через JWT callback NextAuth → `POST /auth/refresh`.

## Важные соглашения

- **User id = IdP `sub`**: при первом входе пользователь создаётся в Postgres с `id` из IdP.
- **Access token от IdP**, не свой JWT сервера. Сервер только верифицирует и мапит на локального user.
- **Refresh threshold**: 60 сек до expiry (`REFRESH_THRESHOLD_SEC` в `auth.ts`).
- **Logout**: только `signOut` NextAuth; IdP session не инвалидируется отдельно.
- Auth-эндпоинты (`/auth/*`) не требуют Bearer; все остальные protected — Bearer access token от IdP.

## Ключевые файлы

| Область | Файлы |
|---------|-------|
| Login PKCE | `apps/web/src/lib/idp-auth.ts` |
| NextAuth | `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts` |
| Client session/API | `apps/web/src/components/providers.tsx`, `apps/web/src/shared/lib/get-client-session.ts` |
| Server token exchange | `apps/server/src/application/auth/auth.service.ts`, `auth.controller.ts` |
| JWT guard | `apps/server/src/infrastructure/auth/jwt-auth.guard.ts`, `jwt-auth.service.ts` |
| Optional auth | `apps/server/src/infrastructure/auth/is-auth-optional.decorator.ts` |

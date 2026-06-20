---
name: nest-project-structure
description: >-
  Структура NestJS проекта.
  Используй при создании модулей, контроллеров, use-case'ов, сервисов и при рефакторинге backend-приложения.
---

# Структура NestJS проекта

Проект организован по слоям: **presentation → application → infrastructure**, с общим слоем **core**.

```
src/
├── main.ts, app.module.ts, app.controller.ts
├── bootstrap/          # настройка приложения при старте
├── presentation/       # HTTP: контроллеры, DTO запросов/ответов
├── application/        # бизнес-логика: use-case'ы, сервисы
├── infrastructure/     # внешние зависимости: БД, кэш, конфиг, health
├── core/               # кросс-срез: ошибки, декораторы, типы, middleware
├── i18n/               # JSON-переводы (en/, ru/)
└── generated/          # сгенерированный код (например i18n.generated.ts)
```

## `presentation/`

Тонкий HTTP-слой. Один домен — одна папка (`auth`, `oidc`, `jwks`).

- **контроллеры** — маршруты, Swagger-декораторы, маппинг DTO → use-case
- **dto/** — class-based DTO с `class-validator` и `@ApiProperty` (Swagger)
- **`<domain>.module.ts`** — импортирует application-модуль, регистрирует только контроллеры

**Не размещай** в presentation бизнес-логику, работу с БД/кэшем и оркестрацию сценариев.

```ts
// presentation/auth/auth.module.ts
@Module({
  imports: [AuthApplicationModule, ClientsModule],
  controllers: [OAuthController],
})
export class AuthModule {}
```

```ts
// presentation/auth/oauth.controller.ts — тонкий контроллер
@Post('login')
async login(@Body() dto: LoginRequestDto, @Query() query: LoginQueryDto) {
  const result = await this.loginUseCase.execute(
    dto.email,
    dto.password,
    query.request_id,
  );
  return { redirectUrl: result.redirectUrl };
}
```

## `application/`

Бизнес-логика, сгруппированная по доменам (`auth`, `clients`, `jwks`, `oidc`).

- **use-cases/** — один сценарий = один класс с методом `execute()`. Оркестрирует сервисы, не знает про HTTP.
- **services/** — доменные сервисы. Каждый сервис — папка `service-name/` с реализацией, тестом и `index.ts` (barrel export).
- **dto/** — plain TypeScript-типы (не классы) для внутренних контрактов.
- **utils/** — чистые функции домена.
- **`<domain>.module.ts`** — регистрирует и экспортирует use-case'ы и сервисы.

```ts
// application/auth/use-cases/login.use-case.ts
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly sessionService: SessionService,
    private readonly passwordAuthService: PasswordAuthService,
  ) {}

  async execute(email: string, password: string, requestId?: string) {
    // оркестрация сервисов
  }
}
```

Для простых доменов без use-case'ов (например `oidc`) сервисы можно регистрировать прямо в presentation-модуле.

## `infrastructure/`

Внешние зависимости и технические адаптеры.

- **config/** — `ConfigModule` (global), `ConfigService`, `validate-env.ts`. Env-переменные описываются классом `EnvironmentVariables`, значения группируются во вложенные объекты (`environment`, `session`, `http`, …).
- **database/** — `DatabaseModule` (global), `PrismaService`.
- **cache/** — Redis/кэш.
- **health/** — health-check эндпоинты.
- **mail/** и прочие внешние интеграции.

**Не читай** `process.env` напрямую в сервисах и use-case'ах — используй `ConfigService`.

## `core/`

Общий код, не привязанный к одному домену.

- **errors/** — `ServerException`, `ExceptionFilter` (глобальный фильтр в `main.ts`)
- **decorators/** — кастомные декораторы (`TransformTrim`, `TransformNumber`, `Cookies`, …)
- **types/** — доменные типы, enum'ы, коды ошибок
- **constants/** — константы (ключи кэша и т.п.)
- **middleware/** — Nest middleware
- **services/** — глобальные сервисы (`CoreModule` — global), например `I18nTranslationService`
- **utils/** — утилиты (`must`, …)

## `bootstrap/`

Функции настройки приложения, вызываемые из `main.ts` (HTTP security, CORS, body parser limits).

## `main.ts` и `app.module.ts`

`main.ts` — создание приложения, глобальные pipes/filters, versioning, Swagger (в local-окружении).

`app.module.ts` — корневой модуль: импортирует `CoreModule`, infrastructure-модули и presentation-модули. Middleware регистрируется через `NestModule.configure()`.

## DTO: presentation vs application

| Слой | Формат | Назначение |
|------|--------|------------|
| `presentation/*/dto/` | class + validators + `@ApiProperty` | HTTP-контракт, Swagger |
| `application/*/dto/` | `type` / `interface` | внутренние контракты между сервисами |

Контроллер принимает presentation DTO, передаёт примитивы/типы в use-case.

## Тесты

- Unit-тесты — рядом с кодом (`*.spec.ts` в папке сервиса/use-case).
- E2E — в `test/` (`app.e2e-spec.ts`).

## Импорты

- `src/*` — основной алиас (`src/application/auth/...`)
- `@/infrastructure/*` — для infrastructure (`@/infrastructure/config/config.service`)

## Добавление нового домена

1. `application/<domain>/` — сервисы, use-case'ы, `<domain>.module.ts`
2. `presentation/<domain>/` — контроллер, dto/, `<domain>.module.ts`
3. Подключить presentation-модуль в `app.module.ts`

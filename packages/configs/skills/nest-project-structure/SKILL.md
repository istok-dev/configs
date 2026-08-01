---
name: nest-project-structure
description: >-
  Структура NestJS проекта.
  Используй при создании модулей, контроллеров, use-case'ов, сервисов, tsconfig, lint и при рефакторинге backend-приложения.
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

## TypeScript (`tsconfig`)

Базовые настройки — shared-preset `@istok-dev/tsconfig/nest.json`. В `apps/<backend>/` держи два файла.

### `tsconfig.json`

Основной конфиг для IDE, `tsc --noEmit` и ESLint resolver. **Не дублируй** strict/module/target из preset — переопределяй только project-specific опции.

```json
{
  "extends": "@istok-dev/tsconfig/nest.json",
  "compilerOptions": {
    "verbatimModuleSyntax": false,
    "types": ["node"],
    "paths": {
      "src/*": ["./src/*"],
      "@/infrastructure/*": ["./src/infrastructure/*"]
    }
  }
}
```

| Override | Зачем |
|----------|-------|
| `verbatimModuleSyntax: false` | совместимость с Nest decorators и runtime imports |
| `types: ["node"]` | Node.js globals для backend |
| `paths` | алиасы импортов приложения |

Новый path alias → добавь в `paths` здесь и используй тот же префикс в коде (см. раздел «Импорты»).

DevDependency: `"@istok-dev/tsconfig": "<version>"` в `package.json` приложения.

### `tsconfig.build.json`

Конфиг сборки Nest CLI. Расширяет `tsconfig.json`, добавляет incremental build и исключает тесты:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "exclude": ["node_modules", "dist", "**/*spec.ts"]
}
```

В `nest-cli.json` укажи `"tsConfigPath": "tsconfig.build.json"`.

**Не меняй** общие compiler options в build-конфиге — только incremental/exclude. Остальное наследуется из `tsconfig.json` → preset.

## ESLint

ESLint 10 (flat config) в backend-приложении monorepo (`apps/<backend>/`). Базовые правила — shared-preset `@istok-dev/eslint-nest` из org registry (см. `.npmrc`). Версия `eslint` закреплена в root `package.json`.

### Файл конфигурации

Единственный конфиг: `apps/<backend>/eslint.config.mjs`. **Не создавай** `.eslintrc*` — расширяй этот файл.

```js
import eslintConfig from '@istok-dev/eslint-nest';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
  eslintConfig,                    // базовый Nest preset
  globalIgnores(['./dist/**']),
);
```

Project overrides добавляй вторым объектом в `defineConfig(...)`, если нужны локальные правила или резолвер импортов.

### Что входит в `@istok-dev/eslint-nest`

Preset на базе `@istok-dev/eslint-base`:

| Плагин | Назначение |
|--------|------------|
| `typescript-eslint` | TypeScript-правила |
| `eslint-plugin-import-x` | импорты и порядок |
| `@stylistic/eslint-plugin` | стиль кода |
| `eslint-import-resolver-typescript` | резолв TS-путей |

**Не дублируй** плагины локально; общие правила меняй в org-пакетах `@istok-dev/*`.

Если ESLint не резолвит импорты — добавь `settings['import/resolver'].typescript` с `project`, указывающим на `tsconfig.json` (paths — см. секцию TypeScript).

### Запуск

Имя пакета — поле `name` в `apps/<backend>/package.json` (`<backend-package>`).

| Команда | Что делает |
|---------|------------|
| `pnpm --filter <backend-package> lint` | `eslint .` |
| `pnpm lint` (root) | lint всех workspace-пакетов |

**Не отключай** правила без причины; `eslint-disable` — точечно, с комментарием почему.

## OpenAPI и API-пакеты для клиентов

NestJS-сервер — **источник правды** для HTTP-контракта. Из OpenAPI-спеки генерируется типизированный fetch-клиент в отдельном workspace-пакете; frontend подключает его как `workspace:*`.

Один сервер может обслуживать один или несколько API-пакетов. Пакет обычно берёт из полной спеки только нужный срез — по Swagger-тегам (`@ApiTags`).

### Цепочка: контроллер → спека → клиент

```
presentation/*.controller.ts  (@ApiTags, DTO с @ApiProperty)
        ↓  экспорт спеки (при локальном старте или отдельной команде)
<server>/openapi.json
        ↓  generate в API-пакете
packages/<api>/src/generated/  →  dist/
        ↓
frontend-приложение
```

1. **Контроллер** в `presentation/` описывает маршруты, `@ApiTags`, `@ApiOperation`, DTO с `@ApiProperty`.
2. **`main.ts`** в local-окружении сериализует Swagger-документ в `openapi.json` рядом с сервером.
3. **API-пакет** читает спеку и генерирует TypeScript SDK через `@hey-api/openapi-ts`.

### Структура API-пакета

```
packages/<api>/
├── openapi-ts.config.ts   # конфиг генератора
├── package.json           # скрипт generate, exports → dist/
├── tsconfig.json
├── src/
│   ├── index.ts           # публичный API пакета (ручной barrel)
│   └── generated/         # автоген
└── dist/
```

**`openapi-ts.config.ts`** — пример:

```ts
import { defineConfig } from '@hey-api/openapi-ts';

const inputPath = process.env.SWAGGER_SPEC_PATH;

if (!inputPath) {
  throw new Error('SWAGGER_SPEC_PATH is not set');
}

export default defineConfig({
  input: inputPath,
  output: {
    path: './src/generated',
    tsConfigPath: './tsconfig.json',
  },
  parser: {
    transforms: {
      enums: false,
    },
    filters: {
      tags: {
        include: ['MyDomain'], // @ApiTags на контроллере
      },
    },
  },
  plugins: [
    {
      name: '@hey-api/client-fetch',
      throwOnError: true,
      baseUrl: false, // baseUrl задаётся во frontend через createConfig
      bundle: true,
    },
    {
      name: '@hey-api/transformers',
      dates: true,
    },
    {
      name: '@hey-api/sdk',
      transformer: true,
      operations: {
        strategy: 'byTags',
        containerName: name => `${name}Service`, // MyDomain → MyDomainService
      },
    },
    {
      name: '@hey-api/typescript',
      enums: 'typescript',
    },
  ],
});
```

- **input** — путь к `openapi.json` (через `SWAGGER_SPEC_PATH` в скрипте `generate`)
- **parser.filters.tags.include** — только операции с нужными `@ApiTags`
- **plugins** — fetch-клиент, трансформеры дат, SDK по тегам, TypeScript-типы

**`package.json` → `generate`:** `openapi-ts && tsc` (путь к спеке — через env).

**`src/index.ts`** — реэкспорт `createClient`, `createConfig`, сгенерированных `*Service` и типов из `generated/`.

### Использование во frontend

Создай клиент с `baseUrl` и нужными опциями (заголовки, `credentials`), передай в методы сервиса:

```ts
const client = createClient(createConfig({ baseUrl, headers, credentials }));
await SomeService.someMethod({ client, body, query, path });
```

Типы запросов/ответов импортируются из того же пакета.

### Регенерация

После изменений в контроллерах или presentation DTO:

1. Обнови `openapi.json` (локальный старт сервера или экспорт спеки).
2. Запусти `generate` в API-пакете.

Сгенерированный код может **коммититься** или лежать в `.gitignore` — тогда `generate` нужен в CI и Docker перед сборкой клиента.

### Добавление эндпоинта в клиент

1. Реализуй эндпоинт в `presentation/` с `@ApiTags`, попадающим в `filters.tags.include`.
2. Опиши DTO с `@ApiProperty`.
3. Перегенерируй спеку и API-пакет.
4. Вызови новый метод из `{Tag}Service` во frontend.

Для нового тега: добавь его в фильтр, перегенерируй, при необходимости реэкспортируй `*Service` из `src/index.ts`.

### Связь с presentation-слоем

- Presentation DTO формируют OpenAPI-схемы → типы в API-пакете.
- `@ApiTags` определяет группировку операций в `*Service`.
- Application DTO и use-case'ы в спеку не попадают — только HTTP-слой.

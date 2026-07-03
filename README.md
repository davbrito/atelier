# Atelier

Cotizador de modistería y costura. Gestiona materiales, operaciones de mano de obra y genera cotizaciones congeladas para clientes.

## Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React SSR) + [TanStack Router](https://tanstack.com/router) (file-based routing)
- **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/) via Wrangler
- **Base de datos:** PostgreSQL + [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Storage:** [Cloudflare R2](https://developers.cloudflare.com/r2/) (avatares e imágenes)
- **Cache:** [Cloudflare KV](https://developers.cloudflare.com/kv/)
- **Auth:** [Better Auth](https://www.better-auth.com/) (Google OAuth + Passkeys)
- **UI:** Tailwind CSS v4 + shadcn/ui
- **Linting/Formato:** [Biome](https://biomejs.dev/)

## Desarrollo local

```bash
pnpm install
pnpm dev        # inicia en http://localhost:3000
```

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm preview` | Build + preview local |
| `pnpm test` | Ejecutar tests (Vitest) |
| `pnpm check` | Lint + formato (Biome) |
| `pnpm typecheck` | Verificación de tipos (TypeScript) |
| `pnpm db:generate` | Generar migraciones Drizzle |
| `pnpm db:migrate` | Aplicar migraciones (dev) |
| `pnpm db:migrate:prod` | Aplicar migraciones (producción) |
| `pnpm deploy` | Build + deploy a Cloudflare Workers |

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores. Las variables requeridas incluyen credenciales de PostgreSQL, Cloudflare (R2, KV, Hyperdrive), y Google OAuth para Better Auth.

Para producción, usar `.env.production` o configurar los secretos en Wrangler (`wrangler secret put`).

## Base de datos

Las migraciones están en `drizzle/`. Para generar una nueva migración tras modificar el schema:

```bash
pnpm db:generate
pnpm db:migrate
```

## Despliegue

```bash
pnpm deploy
```

Requiere estar autenticado en Wrangler (`wrangler login`) y tener los bindings de R2, KV e Hyperdrive configurados en Cloudflare.

## Dominio

El glosario de términos del negocio está en [`CONTEXT.md`](./CONTEXT.md). Los lineamientos visuales y de diseño están en [`DESIGN.md`](./DESIGN.md).

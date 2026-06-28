<!-- intent-skills:start -->
# TanStack Intent - before editing files, run the matching guidance command.
tanstackIntent:
  - id: "@tanstack/devtools#devtools-app-setup"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-app-setup"
    for: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
  - id: "@tanstack/devtools#devtools-marketplace"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-marketplace"
    for: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
  - id: "@tanstack/devtools#devtools-plugin-panel"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-plugin-panel"
    for: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
  - id: "@tanstack/devtools#devtools-production"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-production"
    for: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
  - id: "@tanstack/devtools-event-client#devtools-bidirectional"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-bidirectional"
    for: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
  - id: "@tanstack/devtools-event-client#devtools-event-client"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-event-client"
    for: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
  - id: "@tanstack/devtools-event-client#devtools-instrumentation"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-instrumentation"
    for: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
  - id: "@tanstack/devtools-vite#devtools-vite-plugin"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-vite#devtools-vite-plugin"
    for: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
  - id: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#lifecycle/migrate-from-nextjs"
    for: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
  - id: "@tanstack/react-start#react-start"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#react-start"
    for: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
  - id: "@tanstack/react-start#react-start/server-components"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#react-start/server-components"
    for: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
  - id: "@tanstack/router-core#router-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core"
    for: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
  - id: "@tanstack/router-core#router-core/auth-and-guards"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/auth-and-guards"
    for: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
  - id: "@tanstack/router-core#router-core/code-splitting"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/code-splitting"
    for: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
  - id: "@tanstack/router-core#router-core/data-loading"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/data-loading"
    for: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
  - id: "@tanstack/router-core#router-core/navigation"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/navigation"
    for: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
  - id: "@tanstack/router-core#router-core/not-found-and-errors"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/not-found-and-errors"
    for: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
  - id: "@tanstack/router-core#router-core/path-params"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/path-params"
    for: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
  - id: "@tanstack/router-core#router-core/search-params"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/search-params"
    for: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
  - id: "@tanstack/router-core#router-core/ssr"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/ssr"
    for: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
  - id: "@tanstack/router-core#router-core/type-safety"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/type-safety"
    for: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
  - id: "@tanstack/router-plugin#router-plugin"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-plugin#router-plugin"
    for: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
  - id: "@tanstack/start-client-core#start-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core"
    for: "Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server entry points, routeTree.gen.ts, tsconfig configuration. Entry point for all Start skills."
  - id: "@tanstack/start-client-core#start-core/auth-server-primitives"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/auth-server-primitives"
    for: "Server-side authentication primitives for TanStack Start: session cookies (HttpOnly, Secure, SameSite, __Host- prefix), session read/issue/destroy via createServerFn and middleware, OAuth authorization-code flow with state and PKCE, password-reset enumeration defense, CSRF for non-GET RPCs, rate limiting auth endpoints, session rotation on privilege change. Pairs with router-core/auth-and-guards for the routing side."
  - id: "@tanstack/start-client-core#start-core/deployment"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/deployment"
    for: "Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Cache-Control headers, SEO and head management."
  - id: "@tanstack/start-client-core#start-core/execution-model"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/execution-model"
    for: "Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly component, useHydrated hook, import protection, dead code elimination, environment variable safety (VITE_ prefix, process.env)."
  - id: "@tanstack/start-client-core#start-core/middleware"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/middleware"
    for: "createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for client-server transfer, global middleware via createStart in src/start.ts, middleware factories, method order enforcement, fetch override precedence."
  - id: "@tanstack/start-client-core#start-core/server-functions"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions"
    for: "createServerFn (GET/POST), validator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setResponseStatus), error handling (throw errors, redirect, notFound), streaming, FormData handling, file organization (.functions.ts, .server.ts)."
  - id: "@tanstack/start-client-core#start-core/server-routes"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-routes"
    for: "Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middleware, handler context (request, params, context), request body parsing, response helpers, file naming for API routes."
  - id: "@tanstack/start-server-core#start-server-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-server-core#start-server-core"
    for: "Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), three-phase request handling, AsyncLocalStorage context."
  - id: "@tanstack/virtual-file-routes#virtual-file-routes"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/virtual-file-routes#virtual-file-routes"
    for: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
  - id: "@vitejs/devtools-kit#vite-devtools-kit"
    run: "pnpm dlx @tanstack/intent@latest load @vitejs/devtools-kit#vite-devtools-kit"
    for: "Creates devtools integrations that mount inside the Vite DevTools hub via @vitejs/devtools-kit. Use when building Vite plugins with devtools panels, RPC functions, dock entries, shared state, messages/notifications, terminals, command palette entries, or any hub-level integration. Applies to files importing from @vitejs/devtools-kit or containing devtools.setup hooks in Vite plugins. For building one portable devtool integration without a hub (CLI, static deploy, MCP), see the `devframe` skill instead."
  - id: "devframe#devframe"
    run: "pnpm dlx @tanstack/intent@latest load devframe#devframe"
    for: "Use when building a devtool with devframe — the framework- and build-tool-agnostic foundation for defining a devtool once and serving it in many places. Covers DevframeDefinition, picking the right deployment adapter (cli / build / spa / vite / embedded / mcp), designing RPC contracts, exposing an agent-native surface over MCP, and wiring the author's SPA client. For host-level features (docks, terminals, palette, etc.), the devframe can be mounted into a host that provides them — Vite DevTools is one supported target, reached via the `vite` adapter. Triggers on `devframe` imports, `defineDevframe`, `createCli`, `createMcpServer`, `connectDevframe`, and on migrations of existing inspectors (eslint-config-inspector, unocss-inspector, node-modules-inspector-style tools) to devframe."
  - id: "nostics#add-diagnostic"
    run: "pnpm dlx @tanstack/intent@latest load nostics#add-diagnostic"
    for: "Add a new diagnostic code following the defineDiagnostics() conventions from nostics"
  - id: "nostics#nostics"
    run: "pnpm dlx @tanstack/intent@latest load nostics#nostics"
    for: "Structured diagnostic code library for JavaScript/TypeScript. Turns errors and other conditions into typed, machine-readable `Diagnostic` instances with stable codes, docs URLs, and actionable fields. Use this skill whenever the project imports `nostics`, or works with `defineDiagnostics`, the `Diagnostic` class, diagnostic code registries, or structured error handling. Also covers reporters (`reporterLog`, `reporterError`, `createFetchReporter` from nostics/reporters/fetch, `createFileReporter` from nostics/reporters/node, `devReporter` from nostics/reporters/dev), formatters (`formatDiagnostic`, `ansiFormatter`, `jsonFormatter`), and Vite plugins (`nosticsStrip` from nostics/unplugin/strip-transform, `nosticsCollector` from nostics/unplugin/dev-server-collector)."
  - id: "vue-virtual-scroller#vue-virtual-scroller"
    run: "pnpm dlx @tanstack/intent@latest load vue-virtual-scroller#vue-virtual-scroller"
    for: "Use this skill for Vue 3 virtual scrolling with vue-virtual-scroller, important for good performance with a lot of data, including RecycleScroller, DynamicScroller, DynamicScrollerItem, WindowScroller, useRecycleScroller, useDynamicScroller, and useWindowScroller for fixed-size lists, unknown-size rows, grids, chat feeds, tables, and page-scrolling layouts."
<!-- intent-skills:end -->

# Lelia Brito - Modistería y Costura | Landing Page

## Project Overview

Professional landing page for "Lelia Brito - Modistería y Costura," a high-quality dressmaking and tailoring business.

- **URL**: TBD (Nitro deployment)
- **Stack**: TanStack Start (React 19 + SSR) + TanStack Router + TanStack Query + Tailwind CSS v4 + Nitro
- **Package Manager**: pnpm
- **Toolchain**: Biome (format + lint + organize imports)
- **Language**: TypeScript (strict mode)

## Scaffold Commands

```bash
pnpx @tanstack/cli@latest create . --agent --deployment nitro --add-ons tanstack-query
pnpx @tanstack/intent@latest install
npx @tanstack/intent@latest list
```

Scaffold was run in `/tmp/opencode/tanstack-scaffold` and merged into this project directory.

## Available Scripts

| Command         | Description                          |
|-----------------|--------------------------------------|
| `pnpm dev`      | Start dev server on port 3000        |
| `pnpm build`    | Production build (client + SSR)      |
| `pnpm preview`  | Preview production build             |
| `pnpm deploy`   | Build + deploy via Nitro             |
| `pnpm format`   | Format code with Biome               |
| `pnpm lint`     | Lint with Biome                      |
| `pnpm check`    | Format + lint with Biome             |
| `pnpm typecheck`| TypeScript type checking             |
| `pnpm test`     | Run Vitest tests                     |

## Migration Conventions

Always use `--name` with a descriptive snake_case name when generating migrations:

```bash
# ✅ Good
DATABASE_URL="..." DATABASE_URL_UNPOOLED="..." npx drizzle-kit generate --name short_description

# ✅ Equivalent via pnpm script
DATABASE_URL="..." DATABASE_URL_UNPOOLED="..." pnpm db:generate -- --name short_description
```

Migration names should be short, snake_case, and describe the change (e.g. `org_id_bindings`, `add_operation_default_duration`, `cascades`).

## Partner Integrations

- **Nitro**: Use as the universal deployment engine. Configured in `vite.config.ts`.
- **TanStack Query**: Integrated as SSR query client context in `src/router.tsx`. React Query DevTools available.
- **TanStack Intent**: Skills mapped for router, query, and devtools guidance.

## Design System

Based on `/home/david/Downloads/DESIGN.md` — "Atelier Couture" design system:

### Colors
| Token              | Value     | Usage                       |
|--------------------|-----------|-----------------------------|
| `--color-cream`    | `#fdf9f6` | Primary background          |
| `--color-dusty-rose`| `#f4e7e4`| Section transitions         |
| `--color-earth`    | `#72564c` | Primary actions, headings   |
| `--color-gold`     | `#735c00` | Decorative accents          |
| `--color-ink`      | `#1c1b1a` | Body text                   |

### Typography
- **Headlines**: Bodoni Moda (serif, 400-500 weight)
- **Body**: Hanken Grotesk (sans-serif, 400-600 weight)
- **Labels**: Uppercase Hanken Grotesk with increased letter-spacing

### Layout
- Desktop: max-width 1280px centered container
- Mobile: stacked, fluid 4-column grid
- Breakpoints: < 768px mobile, 768-1024px tablet, > 1024px desktop

## File Structure

```
src/
  components/
    Header.tsx          # Sticky navigation bar
    Footer.tsx          # Contact section + copyright
  routes/
    __root.tsx          # Root layout with meta/open-graph tags
    index.tsx           # Landing page (Hero + Services + Gallery + Quote)
  integrations/
    tanstack-query/     # Query integration (scaffold-generated, kept minimal)
  router.tsx            # Router setup with QueryClient context
  styles.css            # Tailwind + design tokens + component classes
```

## Environment Variables

None required for the landing page (static content).

## Deployment (Nitro)

1. Build: `pnpm build`
2. Deploy: `pnpm deploy` (runs build + nitro deploy)
3. Configuration: `vite.config.ts` — sets Nitro output and presets.

## Key Architectural Decisions

1. **TanStack Start over plain React**: Chose SSR framework for meta-tag generation and better SEO. The landing page benefits from server-rendered meta tags for WhatsApp/Instagram sharing.
2. **Single-file index route**: All sections (Hero, Services, Gallery, Quote) live in `src/routes/index.tsx` — no sub-routes needed for a single-page landing.
3. **CSS-only for design system colors**: Replaced Tailwind's `@theme` with CSS custom properties matching the DESIGN.md spec exactly. Removed dark mode support since the design specifies light-only aesthetic.
4. **No image CDN**: Gallery uses SVG icons and colored placeholder blocks. Replace with real photography when available.
5. **Biome v2.4**: Configured with Tailwind CSS directive support, organize imports, and strict linting.

## Known Gotchas

- `src/routeTree.gen.ts` is auto-generated; it may produce minor lint warnings (unused import, `any`) — ignore or add to linter ignores.
- Nitro presets may vary based on the hosting provider (Node.js, Vercel, Netlify).
- Google Fonts (Bodoni Moda, Hanken Grotesk) are loaded via CDN `@import` in CSS — ensure they load on slow connections.
- WhatsApp link uses international format `+5804147712595` — verify this is correct for Venezuela.

## Next Steps

1. Replace SVG placeholders in Hero section and Gallery with real photography
2. Add `favicon.ico` and `og-image.jpg` to `public/`
3. Test WhatsApp deep link on mobile devices
4. Set up custom domain in hosting dashboard (e.g. Nitro provider)
5. Add SEO metadata refinement (structured data for local business)
6. Consider adding an appointment booking form (TanStack Query + server function)

# Upgrading `@better-auth-ui`

How to bump `@better-auth-ui/*` and regenerate the auth components that are copied into `src/components/auth` from the shadcn registry.

> **Status:** partially validated. The upgrade to 1.7.27 (October 2026, branch `chore/patch-updates`) did not finish cleanly. The sections **Known open issues** and **Customizations to preserve** describe what is still unresolved. Read them before starting.

## How it works

- The auth components are **not** in `node_modules`. The shadcn registry (`components.json` → `@better-auth-ui`) copies them into `src/components/auth` and `src/lib/auth`.
- For that reason, bumping the package version is not enough: you have to run `shadcn add` again and review what it overwrote.
- `shadcn add --overwrite` **replaces files without asking**. Any local customization is lost unless you restore it from git by hand.
- `shadcn` also rewrites `package.json`: it replaces `"catalog:auth"` with `^x.y.z` ranges for `@better-auth-ui/core` and `@better-auth-ui/react`.

## Before you start

1. Be on a clean branch with the current state committed. Each step should land in its own commit.
2. Keep a reference to the commit made before the overwrite (`git log --oneline`). You will use it to compare and restore.
3. Record the baseline: `pnpm typecheck`, `pnpm check` and `pnpm test`.

## Steps

### 1. Bump the version in the catalog

In `pnpm-workspace.yaml`, under the `auth` catalog:

```yaml
  auth:
    "@better-auth-ui/core": <new version>
    "@better-auth-ui/react": <new version>
    "@better-auth-ui/locales": <new version>
```

`package.json` must keep using `"catalog:auth"` for these three packages.

```bash
pnpm install
```

Commit: `chore(auth): bump @better-auth-ui to X.Y.Z`.

### 2. Regenerate components from the registry

```bash
pnpm exec shadcn add @better-auth-ui/auth @better-auth-ui/settings @better-auth-ui/user-button \
  @better-auth-ui/passkey @better-auth-ui/one-tap @better-auth-ui/admin @better-auth-ui/organization \
  --overwrite --yes
```

After this, `package.json` has `^x.y.z` ranges instead of `catalog:auth`. Restore them:

```bash
sed -i -E 's/("@better-auth-ui\/(core|react)": )"\^[0-9.]+"/\1"catalog:auth"/' package.json
pnpm install
```

`shadcn` can also add new dependencies (so far: `cn`, `sonner`, `@tanstack/react-form`, `@tanstack/react-store`). Review them with `git diff package.json`.

### 3. Format and run the codemods

```bash
pnpm format
pnpm exec biome check --write .
pnpm codemod:remove-use-client
pnpm codemod:sonner-to-ui-toast
```

- `codemod:remove-use-client` removes the `"use client"` directives that the registry adds.
- `codemod:sonner-to-ui-toast` migrates `toast` from `sonner` to the local toast component.
- `biome check --write` sorts imports after the codemods.

### 4. Restore customizations

Compare against the reference commit and restore everything listed in the next section. Do not commit the overwrite without reviewing the full diff.

```bash
git diff <reference-commit> -- src/components/ui src/components/auth src/lib/auth
```

### 5. Commit the overwrite on its own

Commit the overwrite and the restorations separately from the version bump and from the codemods when possible. To stage specific hunks without touching the rest, generate a patch of the change you want and apply it to the index with `git apply --cached`.

### 6. Verify

```bash
pnpm typecheck
pnpm check
pnpm test
```

Then test manually in dev: email and password login, Google, One Tap, passkey, organizations, admin, and account settings.

## Customizations to preserve

The overwrite drops these local changes. Restore them after every `shadcn add`.

| File | Customization | Why |
|---|---|---|
| `src/components/ui/input.tsx` | Uses `Input as InputPrimitive` from `@base-ui/react/input` with the `InputPrimitive.Props` type, so it accepts the `render` prop. The registry rewrites it to `React.ComponentProps<"input">`. | `client-sheet.tsx`, `order-payment-list.tsx` and `orders.new.tsx` pass `render`. |
| `src/components/ui/*.tsx` | Components built on `@base-ui/react` primitives (not Radix). The registry rewrites them. | Same reason: the `render` prop and base-ui types. |
| `src/components/auth/organization/create-organization-dialog.tsx` | `defaultName?: string` prop. When the dialog opens, the name takes that value and the slug is derived with `sanitizeSlug`. Used by `organization-onboarding.tsx`. | Pre-fills the name in onboarding. |
| `src/lib/auth/admin-plugin.ts` | `AdminLink` from `#/lib/auth-custom/components/admin-link.tsx` in `userMenuItems`. | Admin link in the user menu. The overwrite removes it. |
| `src/lib/utils.ts` | Only `storageUrl` and `formatBudgetNames`. `cn` is not re-exported: files import `cn` from `"cn"`. | Convention: import `cn` directly from `"cn"`. |

## Known open issues

- **`freshSession*` locale keys:** `@better-auth-ui/react` does not provide `freshSessionTitle`, `freshSessionDescription`, `freshSessionSubmit` or `freshSessionSignIn`, not even in 1.7.27. `fresh-session-prompt.tsx` was deleted because the overwrite left it unused. Confirm that the `reauthentication.tsx` flow covers the same case.
- **`sonner`:** removed from the project. If shadcn adds it back, review `src/components/ui/sonner.tsx` and the codemod.
- **`cnfast` → `cn`:** already resolved in its own commit (`8fd172d`).

## Common errors

- **`Property 'X' does not exist on type '{ account: string; ... }'`:** a localization key is missing. Check that the `@better-auth-ui` version matches the one the registry expects.
- **`Type '{ render: Element; }' is not assignable to ...Input...`:** the `input.tsx` customization was lost. Restore the `ui/` version.

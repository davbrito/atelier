# Material Inventory Design

**Date:** 2026-07-02  
**Status:** Approved

## Summary

Add a ledger-based inventory system for materials. The seamstress can record stock entries, manual exits, and balance adjustments. Stock is derived from the sum of all movement deltas — never stored directly — ensuring complete audit traceability. The inventory is accessible from within the existing material sheet (no new page).

---

## Schema

### New enum: `inventory_movement_type`

```ts
pgEnum('inventory_movement_type', ['entry', 'exit', 'adjustment'])
```

### New table: `material_inventory_movements`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default uuidv7() |
| `material_id` | uuid | FK → materials.id, cascade delete |
| `organization_id` | text | FK → organization.id, cascade delete |
| `type` | inventory_movement_type | NOT NULL |
| `delta` | decimal(12,4) | NOT NULL — positive = stock up, negative = stock down |
| `note` | text | nullable |
| `created_at` | timestamp TZ | NOT NULL, defaultNow() |
| `created_by_id` | text | FK → user.id, set null on delete |

**Invariants:**
- `entry` movements always have `delta > 0`
- `exit` movements always have `delta < 0`
- `adjustment` movements may have any sign (calculated as `targetQuantity - currentStock`)
- `currentStock = SUM(delta)` for a given `material_id`; query always returns 0 if no movements exist

---

## Server Functions

New file: `src/lib/server/inventory.ts`

### `getMaterialInventory(materialId: string)`

- Method: GET
- Middleware: `organizationMiddleware`
- Validates: material belongs to the active organization
- Returns:
  ```ts
  {
    currentStock: string, // SUM(delta), "0" if no movements
    movements: Array<{
      id: string,
      type: 'entry' | 'exit' | 'adjustment',
      delta: string,
      note: string | null,
      createdAt: Date,
      createdBy: { id: string, name: string } | null,
    }>
  }
  ```
- Returns up to 50 most recent movements ordered by `createdAt DESC`

### `registerMovement({ materialId, type, quantity, note? })`

- Method: POST
- Middleware: `organizationMiddleware`, `transactionMiddleware`
- Input:
  - `materialId`: uuid
  - `type`: `'entry' | 'exit' | 'adjustment'`
  - `quantity`: positive decimal string (always positive from the client)
  - `note`: optional string
- Logic per type:
  - `entry`: delta = +quantity
  - `exit`: delta = -quantity
  - `adjustment`: within the same transaction, compute `currentStock = SUM(delta)`, then `delta = quantity - currentStock`
- Inserts a row into `material_inventory_movements` with `created_by_id` from the session user
- **No stock floor validation:** negative stock is allowed. The seamstress may have used materials before recording them in the system. The UI should display negative stock visually (e.g., red color) but not block the operation.
- Returns the inserted movement row

---

## Query Options

Add to `src/lib/query-options.ts`:

```ts
export const materialInventoryQueryOptions = (materialId: string) =>
  queryOptions({
    queryKey: ['materials', 'inventory', materialId],
    queryFn: () => getMaterialInventory({ data: { materialId } }),
  });
```

---

## UI

### Material cards (`materials.index.tsx`)

Add a stock line in each `CardContent` below the price row:

```
Stock: 12.5 m
```

- Stock is loaded alongside materials in the same list query. To avoid an N+1, `listMaterials` is extended to include `currentStock` via a LEFT JOIN to a derived table that aggregates `SUM(delta) GROUP BY material_id`.
- Displays `—` when no movements exist yet (stock = 0 is shown as `0 m`).

### `MaterialSheet` — new "Inventario" tab

Wrap the existing sheet content in a `Tabs` component with two tabs:

- **"General"** — existing form (name, unit, price, image)
- **"Inventario"** — new inventory section

**Inventario tab layout:**

1. **Stock actual** — large number + unit (e.g., `12.5 m`). Fetched via `materialInventoryQueryOptions`.

2. **Registrar movimiento form** (shown inline, no dialog):
   - `type`: segmented radio group with three options:
     - Entrada (icon: ArrowDownToLine, green)
     - Salida (icon: ArrowUpFromLine, red)
     - Ajuste (icon: SlidersHorizontal, gray)
   - `quantity`: numeric input, always positive. Label changes:
     - Entrada/Salida: "Cantidad"
     - Ajuste: "Cantidad final en stock"
   - `note`: optional text input ("Nota (opcional)")
   - Submit button: "Registrar"
   - On success: invalidates `['materials', 'inventory', materialId]` and `['materials']`

3. **Historial** — list of recent movements (up to 50):
   - Each row: relative date (e.g., "hace 2 días"), type badge, delta (`+10 m` / `-3 m`), note, user name
   - Type badges:
     - `entry` → "Entrada" (green)
     - `exit` → "Salida" (red)
     - `adjustment` → "Ajuste" (gray/neutral)
   - Empty state: "No hay movimientos registrados aún."

**Tab switch behavior:** The inventory tab only fetches data when the tab is active and the sheet is open (enabled query condition: `open && activeTab === 'inventario'`).

---

## Out of Scope

- Low-stock alerts or thresholds — explicitly excluded
- Automatic stock decrement when creating a quotation — excluded
- Supplier tracking
- Export / reports

---

## Migration

One new Drizzle migration:
1. Create enum `inventory_movement_type`
2. Create table `material_inventory_movements`
3. Extend the `listMaterials` query to include `currentStock` (subquery or CTE)

import { useDebouncer } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "#/components/ui/combobox";
import { budgetByIdQueryOptions, budgetsListQueryOptions } from "#/lib/query-options";

type BudgetComboboxProps = {
  value: string;
  onChange: (budgetId: string) => void;
};

export function BudgetCombobox({ value, onChange }: BudgetComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");

  const searchDebouncer = useDebouncer((next: string) => setSearch(next), { wait: 300 });

  useEffect(() => {
    searchDebouncer.maybeExecute(inputValue);
  }, [inputValue, searchDebouncer.maybeExecute]);

  const { data, isFetching } = useQuery({
    ...budgetsListQueryOptions({ page: 1, pageSize: 20, search }),
    staleTime: 10_000,
  });
  const rawBudgets = data?.items ?? [];

  // The selected budget may not be in the current (filtered) results —
  // fetch it directly so its label still renders when the combobox is closed.
  const { data: selectedBudget } = useQuery({
    ...budgetByIdQueryOptions(value),
    enabled: !!value,
  });

  const budgetItems = rawBudgets.map((b) => ({ id: b.id, label: b.name }));

  const selectedItem =
    budgetItems.find((item) => item.id === value) ??
    (selectedBudget && selectedBudget.id === value
      ? { id: selectedBudget.id, label: selectedBudget.name }
      : null);

  return (
    <Combobox
      items={budgetItems}
      itemToStringValue={(item: (typeof budgetItems)[number]) => item.label}
      value={selectedItem}
      onValueChange={(item) => {
        if (item) onChange(item.id);
      }}
      onInputValueChange={(val) => setInputValue(typeof val === "string" ? val : "")}
      filter={null}
    >
      <ComboboxInput placeholder="Buscar prenda..." className="w-full" showTrigger />

      <ComboboxContent>
        <ComboboxEmpty>
          {isFetching ? (
            <span className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs">
              <Loader2Icon className="size-3 animate-spin" />
              Buscando...
            </span>
          ) : (
            <span className="flex flex-col gap-1 px-3 py-2 text-muted-foreground text-xs">
              No se encontraron prendas.
              <Link to="/app/garments" className="text-primary underline">
                Ir al catálogo de prendas
              </Link>
            </span>
          )}
        </ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

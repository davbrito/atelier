import { useDebouncer } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { clientByIdQueryOptions } from "#/lib/query-options";
import { listClients } from "#/lib/server/clients";

type ClientComboboxProps = {
  value: string;
  onChange: (clientId: string) => void;
};

export function ClientCombobox({ value, onChange }: ClientComboboxProps) {
  const listFn = useServerFn(listClients);

  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");

  const searchDebouncer = useDebouncer((next: string) => setSearch(next), { wait: 300 });

  useEffect(() => {
    searchDebouncer.maybeExecute(inputValue);
  }, [inputValue, searchDebouncer.maybeExecute]);

  const { data: rawClients = [], isFetching } = useQuery({
    queryKey: ["clients", "search", search],
    queryFn: async () => (await listFn({ data: { page: 1, pageSize: 20, search } })).items,
    staleTime: 10_000,
  });

  // The selected client may not be in the current (filtered) results —
  // fetch it directly so its label still renders when the combobox is closed.
  const { data: selectedClient } = useQuery({
    ...clientByIdQueryOptions(value),
    enabled: !!value,
  });

  const clientItems = rawClients.map((c) => ({ id: c.id, label: c.name }));

  const selectedItem =
    clientItems.find((item) => item.id === value) ??
    (selectedClient && selectedClient.id === value
      ? { id: selectedClient.id, label: selectedClient.name }
      : null);

  return (
    <Combobox
      items={clientItems}
      itemToStringValue={(item: (typeof clientItems)[number]) => item.label}
      value={selectedItem}
      onValueChange={(item) => {
        if (item) onChange(item.id);
      }}
      onInputValueChange={(val) => setInputValue(typeof val === "string" ? val : "")}
      filter={null}
    >
      <ComboboxInput placeholder="Buscar cliente..." className="w-full" showTrigger />

      <ComboboxContent>
        <ComboboxEmpty>
          {isFetching ? (
            <span className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs">
              <Loader2Icon className="size-3 animate-spin" />
              Buscando...
            </span>
          ) : (
            <span className="flex flex-col gap-1 px-3 py-2 text-muted-foreground text-xs">
              No se encontraron clientes.
              <Link to="/app/clients" className="text-primary underline">
                Ir al catálogo de clientes
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

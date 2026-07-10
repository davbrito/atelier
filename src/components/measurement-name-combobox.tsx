"use client";

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "#/components/ui/autocomplete";
import { listMeasurementNames } from "#/lib/server/measurement-names";

type MeasurementNameComboboxProps = {
  value: string;
  onChange: (name: string) => void;
  onBlur?: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
};

export function MeasurementNameCombobox({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  className,
}: MeasurementNameComboboxProps) {
  const listFn = useServerFn(listMeasurementNames);

  const { data: names = [] } = useQuery<string[]>({
    queryKey: ["measurement-names"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  return (
    <Autocomplete items={names} value={value} onValueChange={onChange}>
      <AutocompleteInput
        placeholder={placeholder}
        className={className}
        showTrigger={names.length > 0}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />

      <AutocompleteContent>
        <AutocompleteEmpty>Sin coincidencias</AutocompleteEmpty>
        <AutocompleteList>
          {(name: string) => (
            <AutocompleteItem key={name} value={name}>
              {name}
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}

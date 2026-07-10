"use client";

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "#/components/ui/combobox";
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
    <Combobox
      items={names}
      value={value}
      // Free text: the input value is always the source of truth, whether it
      // came from typing or from picking a suggestion.
      onValueChange={(name) => name != null && onChange(name)}
      onInputValueChange={(val) => typeof val === "string" && onChange(val)}
    >
      <ComboboxInput
        placeholder={placeholder}
        className={className}
        showTrigger={names.length > 0}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />

      <ComboboxContent>
        <ComboboxEmpty>Sin coincidencias</ComboboxEmpty>
        <ComboboxList>
          {(name: string) => (
            <ComboboxItem key={name} value={name}>
              {name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

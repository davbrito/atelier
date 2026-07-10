import { useId, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#78716c",
  "#1e293b",
  "#ffffff",
];

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

type ColorPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export function ColorPicker({ value, onValueChange, placeholder }: ColorPickerProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const isValidHex = HEX_COLOR_REGEX.test(value);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 p-0.5"
              aria-label="Elegir color"
            />
          }
        >
          <span
            className={cn(
              "size-full rounded-sm border",
              !isValidHex && "bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:8px_8px]",
            )}
            style={isValidHex ? { backgroundColor: value } : undefined}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <div className="flex flex-col gap-3">
            <input
              type="color"
              value={isValidHex ? value : "#000000"}
              onChange={(e) => onValueChange(e.target.value)}
              className="h-9 w-full cursor-pointer rounded-md border bg-transparent"
              aria-label="Selector de color"
            />
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={cn(
                    "size-6 rounded-full border transition-transform hover:scale-110",
                    value.toLowerCase() === preset && "ring-2 ring-ring ring-offset-1",
                  )}
                  style={{ backgroundColor: preset }}
                  onClick={() => onValueChange(preset)}
                  aria-label={preset}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  );
}

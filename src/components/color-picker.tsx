import { Sketch } from "@uiw/react-color";
import { useId } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

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

type ColorPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export function ColorPicker({ value, onValueChange, placeholder }: ColorPickerProps) {
  const inputId = useId();
  const isValidHex = HEX_COLOR_REGEX.test(value);

  return (
    <div className="flex items-center gap-2">
      <Popover>
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
              !isValidHex &&
                "bg-[length:8px_8px] bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)]",
            )}
            style={isValidHex ? { backgroundColor: value } : undefined}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Sketch
            color={isValidHex ? value : "#000000"}
            presetColors={PRESET_COLORS}
            onChange={(color) => onValueChange(color.hex)}
          />
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

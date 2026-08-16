import { Link } from "@tanstack/react-router";
import { OctagonXIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";

type DefaultErrorComponentProps = {
  error: Error;
  info?: { componentStack: string };
  reset: () => void;
};

export function DefaultErrorComponent({ error, info, reset }: DefaultErrorComponentProps) {
  const [showDetails, setShowDetails] = useState(import.meta.env.DEV);

  return (
    <div className="flex min-h-64 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <OctagonXIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">Algo salió mal</h2>
            <p className="text-muted-foreground text-sm">
              Ocurrió un error inesperado al cargar esta página.
            </p>
          </div>

          {error.message && (
            <p className="w-full break-words rounded-md bg-muted px-3 py-2 text-left text-muted-foreground text-xs">
              {error.message}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={reset} size="sm">
              <RotateCcwIcon className="size-3.5" />
              Reintentar
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/app" />}>
              Ir al panel
            </Button>
          </div>

          {import.meta.env.DEV && (info?.componentStack || error.stack) && (
            <div className="w-full text-left">
              <button
                type="button"
                className="text-muted-foreground text-xs underline"
                onClick={() => setShowDetails((v) => !v)}
              >
                {showDetails ? "Ocultar detalles" : "Mostrar detalles"}
              </button>
              {showDetails && (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[10px] text-destructive">
                  {error.stack ?? info?.componentStack}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

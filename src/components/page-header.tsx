import { useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** When true, renders a back button before the title that navigates to the previous entry in history. */
  back?: boolean;
  children?: ReactNode;
};

export function PageHeader({ title, description, back, children }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        {back && (
          <Button variant="ghost" size="icon" onClick={() => router.history.back()}>
            <ArrowLeftIcon className="size-4" />
          </Button>
        )}
        <div>
          <h1 className="font-heading text-2xl">{title}</h1>
          {description && <p className="mt-1 text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

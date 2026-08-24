import { Toaster } from "sonner";

import { toast } from "#/components/ui/toast.tsx";

export function Bar() {
  toast.add({
    type: "warning",
    description: "Careful!",
  });
  return <Toaster />;
}

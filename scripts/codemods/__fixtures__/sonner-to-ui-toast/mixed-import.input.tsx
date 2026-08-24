import { Toaster, toast } from "sonner";

export function Bar() {
  toast.warning("Careful!");
  return <Toaster />;
}

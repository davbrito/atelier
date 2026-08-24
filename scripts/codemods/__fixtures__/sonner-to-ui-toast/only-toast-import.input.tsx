import { toast } from "sonner";

function _Foo() {
  toast.success("Saved!");
  toast.error("Something went wrong", { description: "Try again" });
  toast("Plain message");
  toast.loading("Loading...");
  toast.add({ type: "info", description: "Already migrated" });
  return null;
}

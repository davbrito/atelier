import { toast } from "#/components/ui/toast.tsx";

function _Foo() {
  toast.add({
    type: "success",
    description: "Saved!",
  });
  toast.add({
    type: "error",
    title: "Something went wrong",
    description: "Try again",
  });
  toast("Plain message");
  toast.add({
    type: "loading",
    description: "Loading...",
  });
  toast.add({ type: "info", description: "Already migrated" });
  return null;
}

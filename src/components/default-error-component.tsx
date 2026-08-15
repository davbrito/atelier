import { ErrorComponent, type ErrorComponentProps } from "@tanstack/react-router";

export function DefaultErrorComponent(props: ErrorComponentProps) {
  return (
    <div className="p-4">
      <ErrorComponent {...props} />
    </div>
  );
}

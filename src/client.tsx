import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { loadTheme } from "./hooks/use-theme";

loadTheme();

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);

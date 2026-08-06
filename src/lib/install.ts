import { createClientOnlyFn } from "@tanstack/react-start";
import { create } from "zustand";

interface InstallState {
  installPrompt: BeforeInstallPromptEvent | null;
  setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  clearInstallPrompt: () => void;
}

export const useAppInstallPrompt = create<InstallState>((set) => {
  return {
    installPrompt: null,
    setInstallPrompt: (prompt) => {
      set({ installPrompt: prompt });
    },
    clearInstallPrompt: () => {
      set({ installPrompt: null });
    },
  };
});

export const setupAppInstall = createClientOnlyFn(() => {
  const { setInstallPrompt } = useAppInstallPrompt.getState();
  if (window.__INSTALL_PROMPT__) {
    setInstallPrompt(window.__INSTALL_PROMPT__);
  } else {
    window.__INSTALL_PROMPT_SET__ = (prompt) => {
      setInstallPrompt(prompt);
    };
  }
  delete window.__INSTALL_PROMPT__;
  delete window.__INSTALL_PROMPT_SET__;
});

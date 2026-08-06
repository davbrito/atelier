/** biome-ignore-all lint/correctness/noUnusedVariables: ambient types */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface Window {
  __INSTALL_PROMPT__?: BeforeInstallPromptEvent | null;
  __INSTALL_PROMPT_SET__?: ((prompt: BeforeInstallPromptEvent | null) => void) | undefined;
}

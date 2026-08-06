(() => {
  window.__INSTALL_PROMPT_SET__ = (e) => (window.__INSTALL_PROMPT__ = e);
  window.addEventListener(
    "beforeinstallprompt",
    (e) => {
      e.preventDefault();
      window.__INSTALL_PROMPT_SET__?.(e);
    },
    { once: true },
  );
  window.addEventListener(
    "appinstalled",
    () => {
      window.__INSTALL_PROMPT_SET__?.(null);
    },
    { once: true },
  );
})();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/index.css";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

const isLocalhostPreview =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

if ((import.meta.env.DEV || isLocalhostPreview) && "serviceWorker" in navigator) {
  const key = "vagou:sw-unregistered-local";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      await Promise.all(regs.map((r) => r.unregister()));
      window.location.reload();
    });
  }
}

if (import.meta.env.PROD && !isLocalhostPreview) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast.message("Atualização disponível. Recarregando…");
      updateSW(true);
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);

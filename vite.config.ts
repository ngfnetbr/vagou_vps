import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: false, // Manifest é injetado dinamicamente via use-pwa-icons.ts
      devOptions: {
        enabled: false,
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // 12 MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/functions\//],
        runtimeCaching: [
          // Turmas Base - NetworkFirst para garantir atualização imediata após exclusão
          {
            urlPattern: /^https:\/\/hzguwuofnvkgeveorixs\.supabase\.co\/rest\/v1\/turmas_base.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "turmas-base-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              networkTimeoutSeconds: 5,
            },
          },
          // Turmas - NetworkFirst para evitar dados obsoletos
          {
            urlPattern: /^https:\/\/hzguwuofnvkgeveorixs\.supabase\.co\/rest\/v1\/turmas.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "turmas-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 12 * 60 * 60, // 12 hours
              },
            },
          },
          // Cache para crianças (acesso offline limitado)
          {
            urlPattern: /^https:\/\/hzguwuofnvkgeveorixs\.supabase\.co\/rest\/v1\/criancas.*/i,
            handler: "NetworkOnly",
            options: {
              cacheName: "criancas-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 60, // 30 min
              },
            },
          },
          // Cache para CMEIs (dados estáticos)
          {
            urlPattern: /^https:\/\/hzguwuofnvkgeveorixs\.supabase\.co\/rest\/v1\/cmeis.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "cmeis-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
              },
            },
          },
          // Configurações do sistema
          {
            urlPattern: /^https:\/\/hzguwuofnvkgeveorixs\.supabase\.co\/rest\/v1\/configuracoes_sistema.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "config-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
          // Storage (Imagens) - CacheFirst
          {
            urlPattern: /^https:\/\/hzguwuofnvkgeveorixs\.supabase\.co\/storage\/.*/i,
            handler: "NetworkOnly",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
              },
            },
          },
          // Fallback genérico para outras requisições REST
          {
            urlPattern: /^https:\/\/hzguwuofnvkgeveorixs\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
        ],
      },
    }),
  ];

  if (mode === "development") {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger() as any);
    } catch (e) {
      // console.error("Failed to load lovable-tagger", e);
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: plugins.filter(Boolean),
    resolve: {
      dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
      alias: {
        "react-router-dom": path.resolve(__dirname, "./node_modules/react-router-dom"),
        "react-router": path.resolve(__dirname, "./node_modules/react-router"),
        "@": path.resolve(__dirname, "./src"),
        "@root": path.resolve(__dirname, "./src"),
        "@ui": path.resolve(__dirname, "./src/components/ui"),
        "lucide-react": path.resolve(__dirname, "./src/icons/lucide-react"),
        "@sam": path.resolve(__dirname, "./modules/Sam/src"),
        "@sondagem": path.resolve(__dirname, "./modules/Sondagem/src"),
      },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});

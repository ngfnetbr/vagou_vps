const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
} as const;

export const corsHeaders = {
  ...baseCorsHeaders,
};

export const getAllowedOrigins = () => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:54321",
  ];

  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    allowedOrigins.push(
      ...envOrigins
        .split(",")
        .map((o: string) => o.trim())
        .filter(Boolean),
    );
  }

  return [...new Set(allowedOrigins)];
};

export const isAllowedOrigin = (origin: string) => getAllowedOrigins().includes(origin);

export const isLocalDevOrigin = (origin: string) =>
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

export const isLovablePreviewOrigin = (origin: string) =>
  /^https:\/\/([a-z0-9-]+\.)*(lovableproject\.com|lovable\.app|lovable\.dev)$/i.test(origin);

export const getCorsHeaders = (_req: Request) => {
  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": "*",
  };
};


export const getSafeRedirectTo = (req: Request, path: string) => {
  const rawBase = Deno.env.get("PUBLIC_SITE_URL")?.trim() || req.headers.get("origin")?.trim() || "";
  if (!rawBase) return undefined;

  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBase);
  } catch {
    return undefined;
  }

  if (!isAllowedOrigin(baseUrl.origin) && !Deno.env.get("PUBLIC_SITE_URL")?.trim()) {
    return undefined;
  }

  const safePath = path.startsWith("/") ? path : `/${path}`;
  return new URL(safePath, baseUrl.origin).toString();
};

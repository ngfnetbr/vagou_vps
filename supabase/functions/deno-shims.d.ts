declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: Record<string, unknown>
  ): void;
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: Record<string, unknown>
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.3" {
  export function createClient(...args: any[]): any;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  export function createClient(...args: any[]): any;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(...args: any[]): any;
}

declare module "https://esm.sh/resend@2.0.0" {
  export class Resend {
    constructor(...args: any[]);
    emails: any;
  }
}

declare module "https://esm.sh/resend@4.0.0" {
  export class Resend {
    constructor(...args: any[]);
    emails: any;
  }
}

declare module "npm:nodemailer@6.9.13" {
  const nodemailer: any;
  export default nodemailer;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching system configuration for PWA manifest...');

    const { data: config, error } = await supabase
      .from('configuracoes_sistema')
      .select('app_nome, app_icone_url, sistema_nome, sistema_icone_url, tema_cor_primaria, tema_cor_secundaria')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching config:', error);
    }

    const appName = config?.app_nome || config?.sistema_nome || 'VAGOU';
    const shortName = appName.length > 12 ? appName.substring(0, 12) : appName;
    const iconUrl = config?.app_icone_url || config?.sistema_icone_url;
    const themeColor = config?.tema_cor_primaria || '#1351B4';
    const backgroundColor = config?.tema_cor_secundaria || '#071D41';

    // Build icons array
    const icons = [];
    
    if (iconUrl) {
      // Dynamic icon from configuration
      icons.push(
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable any'
        },
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable any'
        }
      );
    } else {
      // Fallback to static icons
      icons.push(
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable any'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable any'
        }
      );
    }

    const manifest = {
      name: `${appName} - Sistema de Gestão de Vagas em CMEIs`,
      short_name: shortName,
      description: 'Sistema de gestão de vagas em Centros Municipais de Educação Infantil',
      start_url: '/publico',
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: themeColor,
      orientation: 'portrait-primary',
      scope: '/',
      id: 'vagou-app',
      icons,
      categories: ['education', 'government'],
      lang: 'pt-BR',
      dir: 'ltr'
    };

    console.log('Returning manifest:', JSON.stringify(manifest, null, 2));

    return new Response(JSON.stringify(manifest), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating manifest:', error);
    
    // Return default manifest on error
    const defaultManifest = {
      name: 'VAGOU - Sistema de Gestão de Vagas em CMEIs',
      short_name: 'VAGOU',
      description: 'Sistema de gestão de vagas em Centros Municipais de Educação Infantil',
      start_url: '/publico',
      display: 'standalone',
      background_color: '#071D41',
      theme_color: '#1351B4',
      orientation: 'portrait-primary',
      scope: '/',
      id: 'vagou-app',
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable any'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable any'
        }
      ],
      categories: ['education', 'government'],
      lang: 'pt-BR',
      dir: 'ltr'
    };

    return new Response(JSON.stringify(defaultManifest), {
      headers: getCorsHeaders(req),
    });
  }
});

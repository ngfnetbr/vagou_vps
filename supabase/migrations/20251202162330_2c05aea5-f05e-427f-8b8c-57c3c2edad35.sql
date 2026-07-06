-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para verificar prazos diariamente às 8h (horário de Brasília = 11h UTC)
SELECT cron.schedule(
  'verificar-prazos-diario',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dizziofoxptanrqgxoue.supabase.co/functions/v1/verificar-prazos',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpenppb2ZveHB0YW5ycWd4b3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MzI3NTUsImV4cCI6MjA4MDIwODc1NX0.nkTgy4VAoiZpddCIx1LZp-xclgHbpYD10flFFh7zKBc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
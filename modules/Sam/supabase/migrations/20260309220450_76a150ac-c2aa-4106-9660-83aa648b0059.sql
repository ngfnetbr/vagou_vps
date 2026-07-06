
-- Schedule reminder for 24h before appointment (runs every hour)
SELECT cron.schedule(
  'appointment-reminder-24h',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://yafssorlkutflxzwnfbn.supabase.co/functions/v1/appointment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZnNzb3Jsa3V0Zmx4enduZmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2ODAxMDUsImV4cCI6MjA4NjI1NjEwNX0.MaE5XLJYdY_0j6N2p_tqecwuEXOlF-ErQdNhSqYBi-w"}'::jsonb,
        body:='{"type": "24h"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule reminder for 1h before appointment (runs every 15 minutes)
SELECT cron.schedule(
  'appointment-reminder-1h',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://yafssorlkutflxzwnfbn.supabase.co/functions/v1/appointment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZnNzb3Jsa3V0Zmx4enduZmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2ODAxMDUsImV4cCI6MjA4NjI1NjEwNX0.MaE5XLJYdY_0j6N2p_tqecwuEXOlF-ErQdNhSqYBi-w"}'::jsonb,
        body:='{"type": "1h"}'::jsonb
    ) as request_id;
  $$
);

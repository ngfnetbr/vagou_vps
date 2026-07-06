import { supabase } from '@sam/integrations/supabase/client'

export type WebhookEventType = 
  | 'appointment.confirmed' 
  | 'appointment.reminder' 
  | 'appointment.reschedule_requested';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: any;
}

interface WebhookConfig {
  id: string;
  url: string;
  secret: string | null;
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;

export class WebhookService {
  
  /**
   * Triggers a webhook event to all subscribed endpoints.
   */
  static async trigger(event: WebhookEventType, data: any) {
    
    
    // 1. Fetch active webhooks for this event
    const { data: webhooks, error } = await supabase
      .from('webhook_configs')
      .select('id, url, secret, events')
      .eq('is_active', true);

    if (error || !webhooks) {
      console.error('Error fetching webhooks:', error);
      return;
    }

    // Filter webhooks that subscribe to this event
    // Note: In a real scenario, we might do this filter in the SQL query if 'events' was a relation or compatible array check
    const subscribers = webhooks.filter((wh: any) => 
      wh.events.includes(event) || wh.events.includes('*')
    );

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    // 2. Send to all subscribers in parallel
    await Promise.all(subscribers.map(webhook => 
      this.sendWithRetry(webhook, payload)
    ));
  }

  /**
   * Sends a single webhook with retry logic.
   */
  private static async sendWithRetry(webhook: WebhookConfig, payload: WebhookPayload) {
    let attempt = 0;
    let success = false;
    let statusCode = 0;
    let responseBody = '';
    let errorMessage = '';

    while (attempt < MAX_RETRIES && !success) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'User-Agent': 'SAM-System-Webhook/1.0',
        };

        if (webhook.secret) {
          headers['Authorization'] = `Bearer ${webhook.secret}`;
        }

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        statusCode = response.status;
        success = response.ok; // 200-299
        
        try {
            responseBody = await response.text();
        } catch (e) {
            responseBody = '(No content)';
        }

        if (!success) {
           errorMessage = `HTTP ${statusCode}: ${responseBody.substring(0, 200)}`;
           // Wait before retry (exponential backoff: 1s, 2s, 4s)
           if (attempt < MAX_RETRIES) {
             await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
           }
        }

      } catch (error: any) {
        errorMessage = error.message || 'Network Error';
        if (error.name === 'AbortError') {
            errorMessage = 'Timeout exceeded (30s)';
        }
        
        // Wait before retry
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    // 3. Log the result
    await this.logResult(webhook.id, payload, statusCode, responseBody, attempt, success, errorMessage);
  }

  /**
   * Logs the webhook attempt to the database.
   */
  private static async logResult(
    webhookId: string, 
    payload: WebhookPayload, 
    statusCode: number, 
    responseBody: string, 
    attemptCount: number,
    success: boolean,
    errorMsg: string
  ) {
    
    
    await supabase.from('webhook_logs').insert([{
      webhook_id: webhookId,
      event_type: payload.event,
      payload: payload as any,
      status_code: statusCode === 0 ? null : statusCode,
      response_body: responseBody.substring(0, 1000),
      attempt_count: attemptCount,
      success,
      error_message: errorMsg || null
    }]);
  }
}


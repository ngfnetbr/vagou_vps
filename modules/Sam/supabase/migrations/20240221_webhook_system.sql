-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing webhook configurations
CREATE TABLE IF NOT EXISTS webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    secret TEXT, -- For signing payloads or Bearer token
    events TEXT[] NOT NULL, -- Array of events: 'appointment.confirmed', 'appointment.reminder', 'appointment.reschedule'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing webhook logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhook_configs(id),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    attempt_count INTEGER DEFAULT 1,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries on logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);

-- Comment on tables
COMMENT ON TABLE webhook_configs IS 'Configuration for external webhooks';
COMMENT ON TABLE webhook_logs IS 'Audit logs for webhook deliveries';

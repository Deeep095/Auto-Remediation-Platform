-- Create incidents database
CREATE DATABASE incidents;
\c incidents;

CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE,
    source VARCHAR(50),
    service VARCHAR(100),
    metric VARCHAR(100),
    value VARCHAR(50),
    threshold VARCHAR(50),
    severity VARCHAR(5) NOT NULL,
    urgency VARCHAR(20),
    environment VARCHAR(20),
    region VARCHAR(20),
    instance_id VARCHAR(100),
    message TEXT,
    raw_payload JSONB,
    ai_analysis TEXT,
    remediation_action VARCHAR(50),
    remediation_status VARCHAR(20) DEFAULT 'none',
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX idx_severity ON incidents(severity);
CREATE INDEX idx_service ON incidents(service);
CREATE INDEX idx_status ON incidents(status);
CREATE INDEX idx_created_at ON incidents(created_at DESC);
CREATE INDEX idx_environment ON incidents(environment);

-- Remediation playbook table
CREATE TABLE remediation_playbook (
    id SERIAL PRIMARY KEY,
    metric VARCHAR(100),
    condition VARCHAR(200),
    action_type VARCHAR(50),
    aws_api VARCHAR(200),
    description TEXT,
    enabled BOOLEAN DEFAULT true
);

-- Pre-load known remediation patterns
INSERT INTO remediation_playbook (metric, condition, action_type, aws_api, description) VALUES
('health_check', 'value = down', 'restart_service', 'ecs:UpdateService', 'Restart the ECS service with force new deployment'),
('cpu_usage', 'value > 95', 'scale_up', 'autoscaling:SetDesiredCapacity', 'Increase ASG desired count by 1'),
('disk_usage', 'value > 90', 'cleanup_disk', 'ssm:SendCommand', 'Run log cleanup script via SSM'),
('memory_usage', 'value > 85', 'restart_service', 'ecs:UpdateService', 'Restart to clear memory leaks');
import os
import httpx
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import asyncio
import random
app = FastAPI(title="InfraGuard Simulator & Auto-Remediation API")
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://n8n:5678/webhook/incident-ingest")
class RemediationRequest(BaseModel):
    action: str
    instance_id: str = None
    service: str = None

@app.post("/aws-remediate")
async def remediate(req: RemediationRequest):
    """
    Mocks an AWS Lambda function that performs infrastructure auto-remediation.
    """
    print(f"LAMBDA TRIGGERED: Executing {req.action} on {req.service}")
    
    # Simulate API delay
    await asyncio.sleep(2)
    
    if req.action == "restart_service":
        return {"status": "success", "message": f"AWS ECS: ForceNewDeployment triggered for {req.service}", "aws_request_id": f"req-{random.randint(1000,9999)}"}
    elif req.action == "scale_up":
        return {"status": "success", "message": f"AWS AutoScaling: Desired capacity increased for {req.service}", "aws_request_id": f"req-{random.randint(1000,9999)}"}
    elif req.action == "cleanup_disk":
        return {"status": "success", "message": f"AWS SSM: RunCommand triggered to clear /tmp logs on {req.service}", "aws_request_id": f"req-{random.randint(1000,9999)}"}
    
    return {"status": "failed", "message": "Unknown action"}


@app.get("/trigger/{scenario}")
async def trigger_alert(scenario: str, background_tasks: BackgroundTasks):
    """
    Fires test alerts into the n8n pipeline without needing to wait for CloudWatch.
    """
    scenarios = {
        "p1-cpu": {
            "source": "datadog",
            "service": "payment-api",
            "metric": "cpu_usage",
            "value": "99",
            "message": "CPU pegged at 99% for 5 minutes. Application unresponsive.",
            "environment": "production"
        },
        "p2-memory": {
            "source": "grafana",
            "service": "auth-service",
            "metric": "memory_usage",
            "value": "88",
            "message": "Memory usage creeping up, possible leak.",
            "environment": "production"
        },
        "p3-info": {
            "source": "uptimerobot",
            "service": "staging-app",
            "metric": "response_time",
            "value": "800",
            "message": "Slight latency increase detected.",
            "environment": "staging"
        }
    }
    
    if scenario not in scenarios:
        return {"error": "Invalid scenario. Use p1-cpu, p2-memory, or p3-info"}
        
    async def send_webhook():
        async with httpx.AsyncClient() as client:
            await client.post(N8N_WEBHOOK_URL, json=scenarios[scenario])
            
    background_tasks.add_task(send_webhook)
    return {"status": "sent", "scenario": scenario, "webhook_url": N8N_WEBHOOK_URL}
const N8N_URL = "http://localhost:5678/webhook";

async function fetchStats() {
    try {
        const res = await fetch(`${N8N_URL}/api/stats`);
        let data = await res.json();
        if (Array.isArray(data)) data = data[0] || {};
        const p1 = data.p1_open || 0;
        const p2 = data.p2_open || 0;
        const total = data.total || 0;
        document.getElementById('stats-bar').innerText = `Total Incidents: ${total} | Open P1s: ${p1} | Open P2s: ${p2}`;
    } catch (e) { console.log("Stats error:", e); }
}

async function fetchServices() {
    try {
        const res = await fetch(`${N8N_URL}/api/services`);
        let services = await res.json();

        // Handle n8n's "First Entry" quirk
        if (services && !Array.isArray(services)) {
            if (Object.keys(services).length === 0) services = [];
            else services = [services];
        }

        let html = '';
        services.forEach(s => {
            if (!s.service) return;
            const stateClass = s.severity === 'P1' ? 'down' : (s.severity === 'P2' ? 'warn' : 'healthy');
            const dateStr = s.last_seen ? new Date(s.last_seen).toLocaleString() : 'Unknown';
            html += `<div class="service-card ${stateClass}"><h3>${s.service}</h3><small>Last: ${dateStr}</small></div>`;
        });
        document.getElementById('service-grid').innerHTML = html;
    } catch (e) { console.log("Services error:", e); }
}

async function fetchIncidents() {
    try {
        const res = await fetch(`${N8N_URL}/api/incidents`);
        let incidents = await res.json();

        // Handle n8n's "First Entry" quirk
        if (incidents && !Array.isArray(incidents)) {
            if (Object.keys(incidents).length === 0) incidents = [];
            else incidents = [incidents];
        }

        let html = '';
        incidents.forEach(inc => {
            if (!inc.service) return;

            // This line hides the incident immediately once it is resolved!
            if (inc.status === 'resolved') return;

            html += `<div class="incident-item">
                <div><span class="badge ${inc.severity}">${inc.severity}</span>
                <strong>${inc.service}</strong>: ${inc.metric} (${inc.value})</div>
                <div><button onclick="resolveIncident(${inc.id})" style="padding:5px 10px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer;">Resolve</button></div>
            </div>`;
        });

        // If there are no incidents to show, display a nice message
        if (html === '') {
            html = '<div style="padding:15px; color:#10b981; text-align:center;">✅ All systems are fully operational. No open incidents.</div>';
        }

        document.getElementById('incidents-list').innerHTML = html;
    } catch (e) { console.log("Incidents error:", e); }
}

async function resolveIncident(id) {
    await fetch(`${N8N_URL}/api/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchIncidents(); fetchStats(); fetchServices();
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value;
    if (!msg) return;
    const chatWin = document.getElementById('chat-window');
    chatWin.innerHTML += `<div class="msg user">${msg}</div><div class="msg ai" id="loading-msg">Thinking...</div>`;
    input.value = '';
    chatWin.scrollTop = chatWin.scrollHeight;
    try {
        const res = await fetch(`${N8N_URL}/ai-agent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: msg }) });
        const data = await res.json();
        document.getElementById('loading-msg').remove();
        chatWin.innerHTML += `<div class="msg ai">${data.answer.replace(/\n/g, '<br>')}</div>`;
    } catch (e) {
        document.getElementById('loading-msg').remove();
        chatWin.innerHTML += `<div class="msg ai" style="color:#ef4444">Failed to reach AI webhook. Please verify the n8n webhook is active.</div>`;
    }
    chatWin.scrollTop = chatWin.scrollHeight;
}

fetchStats(); fetchServices(); fetchIncidents();
setInterval(() => { fetchStats(); fetchServices(); fetchIncidents(); }, 10000);
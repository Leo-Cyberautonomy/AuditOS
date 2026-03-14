"""Root Agent — Multi-agent coordinator for AuditAI.

Routes requests to the appropriate specialist agent:
- LiveAuditAgent: Real-time field inspections (voice + vision)
- ReportAgent: Audit report generation
- ExtractionAgent: Document processing and data extraction
"""

from google.adk.agents import Agent

from agents.live_audit_agent import live_audit_agent
from agents.report_agent import report_agent
from agents.extraction_agent import extraction_agent

root_agent = Agent(
    name="auditai_coordinator",
    description="AuditAI multi-agent coordinator that routes audit tasks to specialist agents.",
    model="gemini-3-flash-preview",
    instruction="""You are the AuditAI coordinator. Route user requests to the appropriate specialist:

- For real-time field audit assistance (voice, camera, equipment identification) → transfer to live_audit_agent
- For generating audit reports → transfer to report_agent
- For processing uploaded documents and extracting energy data → transfer to extraction_agent

If the request is unclear, ask the user to clarify what they need help with.""",
    sub_agents=[
        live_audit_agent,
        report_agent,
        extraction_agent,
    ],
)

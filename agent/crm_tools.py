"""LangChain @tool wrappers around the Srikara CRM agent API (Express server, /api/agent/*).

Every tool returns a short JSON/text string. Errors are returned as text (never raised) so the
LLM can explain the problem to the admin instead of crashing the chat.
"""
import json
import os
from typing import Literal, Optional
from urllib.parse import quote

import httpx
from langchain_core.tools import tool

CRM_URL = os.getenv("CRM_URL", "http://127.0.0.1:3000").rstrip("/")
AGENT_API_KEY = os.getenv("AGENT_API_KEY", "")

StudentStatus = Literal[
    "lead", "onboarding", "active", "inactive", "on_hold", "completed", "dropped", "cancelled"
]


def _call(method: str, path: str, *, params: Optional[dict] = None, body: Optional[dict] = None) -> str:
    if not AGENT_API_KEY:
        return "ERROR: AGENT_API_KEY is not set for the agent server."
    try:
        r = httpx.request(
            method,
            f"{CRM_URL}/api/agent{path}",
            params={k: v for k, v in (params or {}).items() if v is not None},
            json=body,
            headers={"x-agent-key": AGENT_API_KEY},
            timeout=60.0,  # WhatsApp sends can take a few seconds
        )
    except httpx.HTTPError as e:
        return f"ERROR: CRM server not reachable at {CRM_URL} ({e.__class__.__name__})."
    try:
        data = r.json()
    except ValueError:
        data = r.text
    if r.status_code >= 400:
        msg = data.get("error") if isinstance(data, dict) else data
        return f"ERROR {r.status_code}: {msg}"
    return json.dumps(data, ensure_ascii=False, default=str)[:12000]


# ----------------------------------------------------------------- read-only CRM tools
@tool
def get_crm_summary() -> str:
    """Overall CRM numbers: students by status, fees collected/outstanding, overdue installments,
    pending leaves and how many WhatsApp follow-ups are running."""
    return _call("GET", "/summary")


@tool
def list_courses() -> str:
    """List all courses with code, duration, price and status."""
    return _call("GET", "/courses")


@tool
def search_students(
    query: Optional[str] = None,
    status: Optional[StudentStatus] = None,
    course: Optional[str] = None,
    payment_status: Optional[Literal["not_paid", "partially_paid", "paid", "has_due", "fully_paid"]] = None,
    limit: int = 20,
) -> str:
    """Search / filter students. `query` matches name, student code (SRK-2026-001), phone or email.
    Use with no arguments to list the newest students."""
    return _call("GET", "/students", params={
        "q": query, "status": status, "course": course, "payment_status": payment_status, "limit": limit})


@tool
def get_student_details(student: str) -> str:
    """Full details of ONE student: profile, installments, recent payments, leaves and WhatsApp
    follow-up state. `student` = student code (SRK-2026-001), phone number or name."""
    return _call("GET", f"/students/{quote(student, safe='')}")


@tool
def list_overdue_installments() -> str:
    """Installments that are overdue or partially paid, oldest first (fee follow-up list)."""
    return _call("GET", "/dues")


@tool
def list_leaves(status: Literal["pending", "approved", "rejected"] = "pending") -> str:
    """Student leave applications by status (default: pending)."""
    return _call("GET", "/leaves", params={"status": status})


# ----------------------------------------------------------------- actions
@tool
def update_student_status(student: str, status: StudentStatus) -> str:
    """Change a student's status in the CRM. Setting inactive / on_hold / dropped / cancelled /
    completed AUTOMATICALLY STOPS the automatic WhatsApp scheduler for that student; setting it
    back to active resumes it. `student` = student code, phone or name."""
    return _call("PUT", f"/students/{quote(student, safe='')}/status", body={"status": status})


@tool
def list_whatsapp_followups(active_only: bool = False) -> str:
    """Show the WhatsApp follow-up scheduler state per student (running/stopped, messages sent,
    next run, stop reason)."""
    return _call("GET", "/followups", params={"active": "true" if active_only else None})


@tool
def start_whatsapp_scheduler(student: str) -> str:
    """Start (or restart) the automatic 5-minute WhatsApp follow-up for one student."""
    return _call("POST", f"/students/{quote(student, safe='')}/followup/start")


@tool
def stop_whatsapp_scheduler(student: str) -> str:
    """Stop the automatic WhatsApp follow-up for one student without changing their CRM status."""
    return _call("POST", f"/students/{quote(student, safe='')}/followup/stop")


@tool
def send_whatsapp_followup(student: str) -> str:
    """Send the next standard follow-up message (asking them to join the course they selected) to
    the student on WhatsApp RIGHT NOW. Use when the admin says 'follow up with X'."""
    return _call("POST", f"/students/{quote(student, safe='')}/whatsapp", body={})


@tool
def send_whatsapp_message(student: str, message: str) -> str:
    """Send a custom WhatsApp message to a student RIGHT NOW. Use the admin's wording; only
    polish grammar. `student` = student code, phone or name."""
    return _call("POST", f"/students/{quote(student, safe='')}/whatsapp", body={"message": message})


@tool
def whatsapp_server_status() -> str:
    """Check whether the Open-WA WhatsApp server is reachable."""
    return _call("GET", "/whatsapp/status")


TOOLS = [
    get_crm_summary, list_courses, search_students, get_student_details,
    list_overdue_installments, list_leaves,
    update_student_status, list_whatsapp_followups,
    start_whatsapp_scheduler, stop_whatsapp_scheduler,
    send_whatsapp_followup, send_whatsapp_message, whatsapp_server_status,
]

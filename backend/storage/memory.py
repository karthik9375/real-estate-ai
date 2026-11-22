"""In-memory storage.

All data lives in process memory and resets when the backend restarts. The
store is intentionally small and isolated behind simple methods so it can be
swapped for a real database later without touching routes or services.
"""
import threading
import uuid
from typing import Optional

from models.followup import FollowUp
from models.lead import ChatMessage, Lead


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class MemoryStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._leads: dict[str, Lead] = {}
        self._followups: dict[str, FollowUp] = {}
        self._chats: dict[str, list[ChatMessage]] = {}

    # ---- Leads ----
    def list_leads(self) -> list[Lead]:
        with self._lock:
            return list(self._leads.values())

    def get_lead(self, lead_id: str) -> Optional[Lead]:
        with self._lock:
            return self._leads.get(lead_id)

    def save_lead(self, lead: Lead) -> Lead:
        with self._lock:
            self._leads[lead.id] = lead
            return lead

    def delete_lead(self, lead_id: str) -> bool:
        with self._lock:
            if lead_id not in self._leads:
                return False
            del self._leads[lead_id]
            self._chats.pop(lead_id, None)
            for fid in [f.id for f in self._followups.values() if f.lead_id == lead_id]:
                del self._followups[fid]
            return True

    # ---- Follow-ups ----
    def list_followups(self) -> list[FollowUp]:
        with self._lock:
            return list(self._followups.values())

    def get_followup(self, followup_id: str) -> Optional[FollowUp]:
        with self._lock:
            return self._followups.get(followup_id)

    def save_followup(self, followup: FollowUp) -> FollowUp:
        with self._lock:
            self._followups[followup.id] = followup
            return followup

    def delete_followup(self, followup_id: str) -> bool:
        with self._lock:
            return self._followups.pop(followup_id, None) is not None

    # ---- Chat history (kept separately per lead) ----
    def get_chat(self, lead_id: str) -> list[ChatMessage]:
        with self._lock:
            return list(self._chats.get(lead_id, []))

    def append_chat(self, lead_id: str, *messages: ChatMessage) -> list[ChatMessage]:
        with self._lock:
            history = self._chats.setdefault(lead_id, [])
            history.extend(messages)
            return list(history)

    def clear_chat(self, lead_id: str) -> None:
        with self._lock:
            self._chats.pop(lead_id, None)


store = MemoryStore()

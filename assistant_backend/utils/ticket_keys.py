"""Jira-style ticket key prefixes ("ENG" in "ENG-42").

Board keys and the workspace key share one namespace per workspace -- a
board can't take the workspace's key or vice versa -- so a key like
"ENG-42" always resolves to exactly one task (see
TaskHandler.get_task_by_key).
"""
import re

from adapters.orm.models.pg_models import Board, Workspace


def generate_key(name: str, taken: set, fallback: str) -> str:
    """Initials of each word (up to 4), or the first 4 letters of a
    single-word name, uniquified with a numeric suffix on collision."""
    words = re.findall(r"[A-Za-z0-9]+", name or "")
    if len(words) > 1:
        base = "".join(w[0] for w in words[:4]).upper()
    elif words:
        base = words[0][:4].upper()
    else:
        base = fallback
    key = base
    suffix = 2
    while key in taken:
        key = f"{base}{suffix}"
        suffix += 1
    return key


def taken_keys(db, workspace_id) -> set:
    """Every key prefix already in use within a workspace."""
    keys = {
        row[0] for row in db.query(Board.key).filter(
            Board.workspace_id == workspace_id, Board.key.isnot(None)
        ).all()
    }
    workspace_key = db.query(Workspace.key).filter(Workspace.workspace_id == workspace_id).scalar()
    if workspace_key:
        keys.add(workspace_key)
    return keys


def parse_ticket_key(ticket_key: str):
    """"eng-42" -> ("ENG", 42); None if it isn't shaped like a key."""
    match = re.fullmatch(r"\s*([A-Za-z0-9]+)-(\d+)\s*", ticket_key or "")
    if not match:
        return None
    return match.group(1).upper(), int(match.group(2))

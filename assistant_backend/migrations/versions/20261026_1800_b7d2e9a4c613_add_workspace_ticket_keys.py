"""add workspace ticket keys (Jira-style keys for tasks not on a board)

Revision ID: b7d2e9a4c613
Revises: d8f3b6c15a2e
Create Date: 2026-10-26 18:00:00.000000+00:00

"""
import re
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b7d2e9a4c613'
down_revision = 'd8f3b6c15a2e'
branch_labels = None
depends_on = None

# Not work items -- never numbered (mirrors TaskHandler.UNTICKETED_TYPES).
UNTICKETED_TYPES = ('note', 'quick_note', 'time_block')


# Copied rather than imported from utils/ticket_keys.py -- a migration has
# to keep producing the same result even if the app's version changes.
def _generate_key(name, taken):
    words = re.findall(r"[A-Za-z0-9]+", name or "")
    if len(words) > 1:
        base = "".join(w[0] for w in words[:4]).upper()
    elif words:
        base = words[0][:4].upper()
    else:
        base = "TASK"
    key = base
    suffix = 2
    while key in taken:
        key = f"{base}{suffix}"
        suffix += 1
    return key


def upgrade() -> None:
    op.add_column('workspaces', sa.Column('key', sa.String(), nullable=True))
    op.add_column('workspaces', sa.Column('next_task_number', sa.Integer(), nullable=False, server_default='1'))

    conn = op.get_bind()

    # Backfill only workspaces that actually have boardless work items --
    # everyone else gets a key lazily on their first one. Numbers follow
    # creation order so the oldest task is KEY-1.
    workspaces = conn.execute(sa.text(
        "SELECT DISTINCT w.workspace_id, w.name FROM workspaces w "
        "JOIN tasks t ON t.workspace_id = w.workspace_id "
        "WHERE t.board_id IS NULL AND t.task_type NOT IN :untick"
    ).bindparams(sa.bindparam('untick', expanding=True)), {"untick": list(UNTICKETED_TYPES)}).fetchall()

    for workspace_id, name in workspaces:
        taken = {row[0] for row in conn.execute(
            sa.text("SELECT key FROM boards WHERE workspace_id = :wid AND key IS NOT NULL"),
            {"wid": workspace_id},
        ).fetchall()}
        key = _generate_key(name, taken)
        tasks = conn.execute(sa.text(
            "SELECT task_id FROM tasks WHERE workspace_id = :wid AND board_id IS NULL "
            "AND task_type NOT IN :untick ORDER BY created_at ASC, task_id ASC"
        ).bindparams(sa.bindparam('untick', expanding=True)), {"wid": workspace_id, "untick": list(UNTICKETED_TYPES)}).fetchall()
        for index, (task_id,) in enumerate(tasks, start=1):
            conn.execute(sa.text("UPDATE tasks SET task_number = :n WHERE task_id = :tid"), {"n": index, "tid": task_id})
        conn.execute(
            sa.text("UPDATE workspaces SET key = :key, next_task_number = :next WHERE workspace_id = :wid"),
            {"key": key, "next": len(tasks) + 1, "wid": workspace_id},
        )


def downgrade() -> None:
    # Boardless tasks' numbers only mean something with a workspace key.
    op.execute("UPDATE tasks SET task_number = NULL WHERE board_id IS NULL")
    op.drop_column('workspaces', 'next_task_number')
    op.drop_column('workspaces', 'key')

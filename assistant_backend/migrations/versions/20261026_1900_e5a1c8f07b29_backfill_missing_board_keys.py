"""backfill keys for boards created without one

Boards seeded by fixtures/demo accounts after the add_ticket_numbering
migration never got a key (the seeding bypassed BoardHandler), so their
cards had no ticket key. Give each a non-colliding key and number any
unnumbered work items after the board's existing numbers.

Revision ID: e5a1c8f07b29
Revises: b7d2e9a4c613
Create Date: 2026-10-26 19:00:00.000000+00:00

"""
import re
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e5a1c8f07b29'
down_revision = 'b7d2e9a4c613'
branch_labels = None
depends_on = None

UNTICKETED_TYPES = ('note', 'quick_note', 'time_block')


def _generate_key(name, taken):
    words = re.findall(r"[A-Za-z0-9]+", name or "")
    if len(words) > 1:
        base = "".join(w[0] for w in words[:4]).upper()
    elif words:
        base = words[0][:4].upper()
    else:
        base = "BRD"
    key = base
    suffix = 2
    while key in taken:
        key = f"{base}{suffix}"
        suffix += 1
    return key


def upgrade() -> None:
    conn = op.get_bind()
    boards = conn.execute(sa.text(
        "SELECT board_id, workspace_id, name FROM boards WHERE key IS NULL ORDER BY created_at ASC"
    )).fetchall()

    for board_id, workspace_id, name in boards:
        taken = {row[0] for row in conn.execute(sa.text(
            "SELECT key FROM boards WHERE workspace_id = :wid AND key IS NOT NULL "
            "UNION SELECT key FROM workspaces WHERE workspace_id = :wid AND key IS NOT NULL"
        ), {"wid": workspace_id}).fetchall()}
        key = _generate_key(name, taken)

        # Cards created through the API on a keyless board still drew
        # numbers from its counter -- keep those, continue after them.
        last = conn.execute(sa.text(
            "SELECT COALESCE(MAX(task_number), 0) FROM tasks WHERE board_id = :bid"
        ), {"bid": board_id}).scalar()
        unnumbered = conn.execute(sa.text(
            "SELECT task_id FROM tasks WHERE board_id = :bid AND task_number IS NULL "
            "AND task_type NOT IN :untick ORDER BY created_at ASC, task_id ASC"
        ).bindparams(sa.bindparam('untick', expanding=True)), {"bid": board_id, "untick": list(UNTICKETED_TYPES)}).fetchall()
        for offset, (task_id,) in enumerate(unnumbered, start=1):
            conn.execute(sa.text("UPDATE tasks SET task_number = :n WHERE task_id = :tid"), {"n": last + offset, "tid": task_id})

        conn.execute(sa.text(
            "UPDATE boards SET key = :key, next_task_number = GREATEST(next_task_number, :next) WHERE board_id = :bid"
        ), {"key": key, "next": last + len(unnumbered) + 1, "bid": board_id})


def downgrade() -> None:
    # Data-only backfill; the keys/numbers it assigned are indistinguishable
    # from ones handed out normally, so there's nothing safe to undo.
    pass

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from commands.task_link_cmd import INVERSE_LABELS
from dto.task_dto import TaskDtoMapper


class RelatedTaskSummary(BaseModel):
    task_id: str
    title: str
    status: str
    task_type: str
    ticket_key: Optional[str] = None


class TaskLinkDto(BaseModel):
    link_id: str
    link_type: str
    # The label to show from the *viewing* task's side of the link -- e.g.
    # "blocks" if this task is the source, "is blocked by" if it's the
    # target of the same underlying row.
    display_label: str
    related_task: RelatedTaskSummary
    created_at: datetime


class TaskLinkDtoMapper:
    @staticmethod
    def map_to_task_link_dto(link, viewpoint_task_id: str) -> TaskLinkDto:
        is_source = str(link.source_task_id) == str(viewpoint_task_id)
        related = link.target_task if is_source else link.source_task
        display_label = link.link_type if is_source else INVERSE_LABELS.get(link.link_type, link.link_type)
        return TaskLinkDto(
            link_id=str(link.link_id),
            link_type=link.link_type,
            display_label=display_label,
            related_task=RelatedTaskSummary(
                task_id=str(related.task_id),
                title=related.title,
                status=related.status,
                task_type=related.task_type,
                ticket_key=TaskDtoMapper.ticket_key(related),
            ),
            created_at=link.created_at,
        )

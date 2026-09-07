from .tasks_controller import tasks_router
from .board_controller import board_router
from .timeblock_controller import timeblock_router
from .notification_controller import notification_router
from .template_controller import template_router
from .workspace_controller import workspace_router
from .settings_controller import settings_router
from .reminder_controller import reminder_router
from .users_controller import users_router
from .page_controller import page_router
from .chat_controller import chat_router
from .comment_controller import comment_router
from .activity_controller import activity_router
from .public_controller import public_router
from .assistant_controller import assistant_router
from .database_controller import database_router
from .queue_controller import queue_router
from .reports_controller import reports_router
from .epic_controller import epic_router
from .sprint_controller import sprint_router
from .task_link_controller import task_link_router
# module_controller is deliberately NOT imported here: it imports
# modules.registry, which imports several of the controllers above --
# routing that through this barrel file would be a circular import (this
# __init__ importing module_controller importing modules.registry
# importing this package again to reach crm_controller etc., before
# ALL_MODULES has even been defined). main.py imports module_router
# directly from controllers.module_controller instead.

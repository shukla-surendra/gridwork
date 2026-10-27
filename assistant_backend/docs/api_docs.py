from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI

def custom_openapi(app: FastAPI):
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="GridWork API",
        version="1.0.0",
        description="""
        This is the backend API for GridWork. It provides endpoints for:
        
        - Task Management
        - Board Management
        - User Settings
        - Page Management
        - Database Operations
        - Template Management
        - Comments
        - Reminders
        - Notifications
        - Activity Tracking
        - Public Endpoints
        - CRM Operations
        - Chat Functionality
        
        ## Authentication
        
        Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
        
        ```
        Authorization: Bearer <your_token>
        ```
        
        ## Error Handling
        
        The API uses standard HTTP status codes and returns errors in the following format:
        
        ```json
        {
            "status": "error",
            "message": "Error message",
            "error_code": "ERROR_CODE",
            "details": {} // Optional additional error details
        }
        ```
        
        ## Rate Limiting
        
        API requests are rate limited to prevent abuse. The current limits are:
        - 300 requests per minute for authenticated users
        - 60 requests per minute for unauthenticated users
        
        ## Pagination
        
        List endpoints support pagination using the following query parameters:
        - `page`: Page number (default: 1)
        - `size`: Items per page (default: 20, max: 100)
        
        ## Response Format
        
        Successful responses follow this format:
        
        ```json
        {
            "status": "success",
            "data": {}, // Response data
            "meta": {   // Optional metadata
                "page": 1,
                "size": 20,
                "total": 100
            }
        }
        ```
        """,
        routes=app.routes,
    )

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    # Add global security requirement
    openapi_schema["security"] = [{"bearerAuth": []}]

    # Add tags
    openapi_schema["tags"] = [
        {"name": "tasks", "description": "Task management operations"},
        {"name": "boards", "description": "Board management operations"},
        {"name": "settings", "description": "User settings operations"},
        {"name": "pages", "description": "Page management operations"},
        {"name": "database", "description": "Database operations"},
        {"name": "templates", "description": "Template management operations"},
        {"name": "comments", "description": "Comment operations"},
        {"name": "reminders", "description": "Reminder operations"},
        {"name": "notifications", "description": "Notification operations"},
        {"name": "activity", "description": "Activity tracking operations"},
        {"name": "public", "description": "Public endpoints"},
        {"name": "crm", "description": "CRM operations"},
        {"name": "chat", "description": "Chat operations"},
    ]

    app.openapi_schema = openapi_schema
    return app.openapi_schema 
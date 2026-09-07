from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from starlette.responses import Response
from modules.access import require_module_enabled
from .commands import (
    EmployeeCommand, EmployeeUpdateCommand,
    LeaveRequestCommand, LeaveReviewCommand,
    OnboardingTemplateCommand, OnboardingTemplateUpdateCommand,
    ApplyOnboardingCommand, ToggleChecklistItemCommand,
)
from .dto import EmployeeDto, LeaveRequestDto, OnboardingTemplateDto, HrDtoMapper
from .handlers import HrHandler
from config import logger

MODULE_KEY = "hr"

router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/hr",
    tags=["HR"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"},
    },
)

gate = require_module_enabled(MODULE_KEY, default_enabled=True)


# -- Employees ---------------------------------------------------------------

@router.post("/employees", response_model=EmployeeDto, status_code=status.HTTP_201_CREATED)
async def create_employee(workspace_id: str, command: EmployeeCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        employee = HrHandler().create_employee(command)
        return HrDtoMapper.map_employee(employee)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employees", response_model=List[EmployeeDto])
async def list_employees(workspace_id: str, user: dict = Depends(gate)):
    try:
        employees = HrHandler().list_employees(workspace_id)
        return [HrDtoMapper.map_employee(e) for e in employees]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing employees: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employees/me", response_model=EmployeeDto)
async def get_my_employee_record(workspace_id: str, user: dict = Depends(gate)):
    employee = HrHandler().get_employee_by_user(workspace_id, user.get("user_id"))
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No employee record for this user")
    return HrDtoMapper.map_employee(employee)


@router.get("/employees/{employee_id}", response_model=EmployeeDto)
async def get_employee(workspace_id: str, employee_id: str, user: dict = Depends(gate)):
    try:
        employee = HrHandler().get_employee(employee_id)
        if str(employee.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        return HrDtoMapper.map_employee(employee)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/employees/{employee_id}", response_model=EmployeeDto)
async def update_employee(workspace_id: str, employee_id: str, command: EmployeeUpdateCommand, user: dict = Depends(gate)):
    command.employee_id = employee_id
    try:
        employee = HrHandler().update_employee(command)
        return HrDtoMapper.map_employee(employee)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(workspace_id: str, employee_id: str, user: dict = Depends(gate)):
    try:
        HrHandler().delete_employee(employee_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting employee: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Leave requests ------------------------------------------------------------

@router.post("/leave-requests", response_model=LeaveRequestDto, status_code=status.HTTP_201_CREATED)
async def create_leave_request(workspace_id: str, command: LeaveRequestCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        leave = HrHandler().create_leave_request(command)
        return HrDtoMapper.map_leave_request(leave)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating leave request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leave-requests", response_model=List[LeaveRequestDto])
async def list_leave_requests(
    workspace_id: str,
    employee_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    user: dict = Depends(gate),
):
    try:
        leaves = HrHandler().list_leave_requests(workspace_id, employee_id, status_filter)
        return [HrDtoMapper.map_leave_request(l) for l in leaves]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing leave requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/leave-requests/{leave_request_id}/review", response_model=LeaveRequestDto)
async def review_leave_request(workspace_id: str, leave_request_id: str, command: LeaveReviewCommand, user: dict = Depends(gate)):
    command.leave_request_id = leave_request_id
    reviewer = HrHandler().get_employee_by_user(workspace_id, user.get("user_id"))
    command.reviewed_by = str(reviewer.employee_id) if reviewer else None
    try:
        leave = HrHandler().review_leave_request(command)
        return HrDtoMapper.map_leave_request(leave)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing leave request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/leave-requests/{leave_request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_leave_request(workspace_id: str, leave_request_id: str, user: dict = Depends(gate)):
    try:
        HrHandler().cancel_leave_request(leave_request_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling leave request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employees/{employee_id}/leave-balance")
async def get_leave_balance(workspace_id: str, employee_id: str, user: dict = Depends(gate)):
    try:
        return HrHandler().get_leave_balance(employee_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting leave balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Onboarding templates -------------------------------------------------------

@router.post("/onboarding-templates", response_model=OnboardingTemplateDto, status_code=status.HTTP_201_CREATED)
async def create_template(workspace_id: str, command: OnboardingTemplateCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        template = HrHandler().create_template(command)
        return HrDtoMapper.map_template(template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating onboarding template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/onboarding-templates", response_model=List[OnboardingTemplateDto])
async def list_templates(workspace_id: str, user: dict = Depends(gate)):
    try:
        templates = HrHandler().list_templates(workspace_id)
        return [HrDtoMapper.map_template(t) for t in templates]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing onboarding templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/onboarding-templates/{template_id}", response_model=OnboardingTemplateDto)
async def update_template(workspace_id: str, template_id: str, command: OnboardingTemplateUpdateCommand, user: dict = Depends(gate)):
    command.template_id = template_id
    try:
        template = HrHandler().update_template(command)
        return HrDtoMapper.map_template(template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating onboarding template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/onboarding-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(workspace_id: str, template_id: str, user: dict = Depends(gate)):
    try:
        HrHandler().delete_template(template_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting onboarding template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/employees/{employee_id}/onboarding/apply", response_model=EmployeeDto)
async def apply_onboarding_template(workspace_id: str, employee_id: str, command: ApplyOnboardingCommand, user: dict = Depends(gate)):
    try:
        employee = HrHandler().apply_template_to_employee(employee_id, command.template_id)
        return HrDtoMapper.map_employee(employee)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying onboarding template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/employees/{employee_id}/onboarding/{item_id}", response_model=EmployeeDto)
async def toggle_checklist_item(workspace_id: str, employee_id: str, item_id: str, command: ToggleChecklistItemCommand, user: dict = Depends(gate)):
    try:
        employee = HrHandler().toggle_checklist_item(employee_id, item_id, command.done)
        return HrDtoMapper.map_employee(employee)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling checklist item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


hr_router = router

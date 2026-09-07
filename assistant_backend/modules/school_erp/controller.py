from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import date
from starlette.responses import Response
from modules.access import require_module_enabled
from .commands import (
    TeacherCommand, TeacherUpdateCommand,
    SchoolClassCommand, SchoolClassUpdateCommand,
    StudentCommand, StudentUpdateCommand,
    AttendanceCommand, BulkAttendanceCommand,
    FeeStructureCommand, FeeStructureUpdateCommand,
    FeePaymentCommand,
    ExamCommand, ExamUpdateCommand,
    ExamResultCommand, ExamResultUpdateCommand, BulkExamResultCommand,
)
from .dto import (
    TeacherDto, SchoolClassDto, StudentDto, AttendanceDto,
    FeeStructureDto, FeePaymentDto, ExamDto, ExamResultDto,
    SchoolErpDtoMapper,
)
from .handlers import SchoolErpHandler
from config import logger

MODULE_KEY = "school_erp"

router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/school-erp",
    tags=["School ERP"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"},
    },
)

# default_enabled=True -- per project convention, every module (adopted and
# packaged) is enabled out of the box; a workspace can still opt out via the
# module toggle once that UI action exists.
gate = require_module_enabled(MODULE_KEY, default_enabled=True)


# -- Teachers ------------------------------------------------------------------

@router.post("/teachers", response_model=TeacherDto, status_code=status.HTTP_201_CREATED)
async def create_teacher(workspace_id: str, command: TeacherCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        teacher = SchoolErpHandler().create_teacher(command)
        return SchoolErpDtoMapper.map_teacher(teacher)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating teacher: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teachers", response_model=List[TeacherDto])
async def list_teachers(workspace_id: str, user: dict = Depends(gate)):
    try:
        teachers = SchoolErpHandler().list_teachers(workspace_id)
        return [SchoolErpDtoMapper.map_teacher(t) for t in teachers]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing teachers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teachers/{teacher_id}", response_model=TeacherDto)
async def get_teacher(workspace_id: str, teacher_id: str, user: dict = Depends(gate)):
    try:
        teacher = SchoolErpHandler().get_teacher(teacher_id)
        if str(teacher.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        return SchoolErpDtoMapper.map_teacher(teacher)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting teacher: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/teachers/{teacher_id}", response_model=TeacherDto)
async def update_teacher(workspace_id: str, teacher_id: str, command: TeacherUpdateCommand, user: dict = Depends(gate)):
    command.teacher_id = teacher_id
    try:
        teacher = SchoolErpHandler().update_teacher(command)
        return SchoolErpDtoMapper.map_teacher(teacher)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating teacher: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/teachers/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(workspace_id: str, teacher_id: str, user: dict = Depends(gate)):
    try:
        SchoolErpHandler().delete_teacher(teacher_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting teacher: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Classes ---------------------------------------------------------------

@router.post("/classes", response_model=SchoolClassDto, status_code=status.HTTP_201_CREATED)
async def create_class(workspace_id: str, command: SchoolClassCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        school_class = SchoolErpHandler().create_class(command)
        return SchoolErpDtoMapper.map_class(school_class)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating class: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes", response_model=List[SchoolClassDto])
async def list_classes(workspace_id: str, user: dict = Depends(gate)):
    try:
        classes = SchoolErpHandler().list_classes(workspace_id)
        return [SchoolErpDtoMapper.map_class(c) for c in classes]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing classes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/{class_id}", response_model=SchoolClassDto)
async def get_class(workspace_id: str, class_id: str, user: dict = Depends(gate)):
    try:
        school_class = SchoolErpHandler().get_class(class_id)
        if str(school_class.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
        return SchoolErpDtoMapper.map_class(school_class)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting class: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/classes/{class_id}", response_model=SchoolClassDto)
async def update_class(workspace_id: str, class_id: str, command: SchoolClassUpdateCommand, user: dict = Depends(gate)):
    command.class_id = class_id
    try:
        school_class = SchoolErpHandler().update_class(command)
        return SchoolErpDtoMapper.map_class(school_class)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating class: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(workspace_id: str, class_id: str, user: dict = Depends(gate)):
    try:
        SchoolErpHandler().delete_class(class_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting class: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Students ----------------------------------------------------------------

@router.post("/students", response_model=StudentDto, status_code=status.HTTP_201_CREATED)
async def create_student(workspace_id: str, command: StudentCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        student = SchoolErpHandler().create_student(command)
        return SchoolErpDtoMapper.map_student(student)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students", response_model=List[StudentDto])
async def list_students(workspace_id: str, class_id: Optional[str] = None, user: dict = Depends(gate)):
    try:
        students = SchoolErpHandler().list_students(workspace_id, class_id)
        return [SchoolErpDtoMapper.map_student(s) for s in students]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_id}", response_model=StudentDto)
async def get_student(workspace_id: str, student_id: str, user: dict = Depends(gate)):
    try:
        student = SchoolErpHandler().get_student(student_id)
        if str(student.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        return SchoolErpDtoMapper.map_student(student)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/students/{student_id}", response_model=StudentDto)
async def update_student(workspace_id: str, student_id: str, command: StudentUpdateCommand, user: dict = Depends(gate)):
    command.student_id = student_id
    try:
        student = SchoolErpHandler().update_student(command)
        return SchoolErpDtoMapper.map_student(student)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(workspace_id: str, student_id: str, user: dict = Depends(gate)):
    try:
        SchoolErpHandler().delete_student(student_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_id}/fee-balance")
async def get_fee_balance(workspace_id: str, student_id: str, user: dict = Depends(gate)):
    try:
        return SchoolErpHandler().get_fee_balance(student_id, workspace_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fee balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Attendance ----------------------------------------------------------------

@router.post("/attendance", response_model=AttendanceDto, status_code=status.HTTP_201_CREATED)
async def mark_attendance(workspace_id: str, command: AttendanceCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    command.marked_by = user.get("user_id")
    try:
        attendance = SchoolErpHandler().mark_attendance(command)
        return SchoolErpDtoMapper.map_attendance(attendance)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attendance/bulk", response_model=List[AttendanceDto], status_code=status.HTTP_201_CREATED)
async def bulk_mark_attendance(workspace_id: str, command: BulkAttendanceCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    command.marked_by = user.get("user_id")
    try:
        records = SchoolErpHandler().bulk_mark_attendance(command)
        return [SchoolErpDtoMapper.map_attendance(a) for a in records]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk marking attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attendance", response_model=List[AttendanceDto])
async def list_attendance(
    workspace_id: str,
    student_id: Optional[str] = None,
    class_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    user: dict = Depends(gate),
):
    try:
        records = SchoolErpHandler().list_attendance(workspace_id, student_id, class_id, date_from, date_to)
        return [SchoolErpDtoMapper.map_attendance(a) for a in records]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/attendance/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(workspace_id: str, attendance_id: str, user: dict = Depends(gate)):
    try:
        SchoolErpHandler().delete_attendance(attendance_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting attendance record: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Fee structures --------------------------------------------------------------

@router.post("/fee-structures", response_model=FeeStructureDto, status_code=status.HTTP_201_CREATED)
async def create_fee_structure(workspace_id: str, command: FeeStructureCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        fee_structure = SchoolErpHandler().create_fee_structure(command)
        return SchoolErpDtoMapper.map_fee_structure(fee_structure)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating fee structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fee-structures", response_model=List[FeeStructureDto])
async def list_fee_structures(workspace_id: str, class_id: Optional[str] = None, user: dict = Depends(gate)):
    try:
        fee_structures = SchoolErpHandler().list_fee_structures(workspace_id, class_id)
        return [SchoolErpDtoMapper.map_fee_structure(f) for f in fee_structures]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing fee structures: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/fee-structures/{fee_structure_id}", response_model=FeeStructureDto)
async def update_fee_structure(workspace_id: str, fee_structure_id: str, command: FeeStructureUpdateCommand, user: dict = Depends(gate)):
    command.fee_structure_id = fee_structure_id
    try:
        fee_structure = SchoolErpHandler().update_fee_structure(command)
        return SchoolErpDtoMapper.map_fee_structure(fee_structure)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating fee structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fee-structures/{fee_structure_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee_structure(workspace_id: str, fee_structure_id: str, user: dict = Depends(gate)):
    try:
        SchoolErpHandler().delete_fee_structure(fee_structure_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting fee structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Fee payments ------------------------------------------------------------------

@router.post("/fee-payments", response_model=FeePaymentDto, status_code=status.HTTP_201_CREATED)
async def create_fee_payment(workspace_id: str, command: FeePaymentCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        payment = SchoolErpHandler().create_fee_payment(command)
        return SchoolErpDtoMapper.map_fee_payment(payment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating fee payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fee-payments", response_model=List[FeePaymentDto])
async def list_fee_payments(workspace_id: str, student_id: Optional[str] = None, user: dict = Depends(gate)):
    try:
        payments = SchoolErpHandler().list_fee_payments(workspace_id, student_id)
        return [SchoolErpDtoMapper.map_fee_payment(p) for p in payments]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing fee payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fee-payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee_payment(workspace_id: str, payment_id: str, user: dict = Depends(gate)):
    try:
        SchoolErpHandler().delete_fee_payment(payment_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting fee payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Exams -------------------------------------------------------------------------

@router.post("/exams", response_model=ExamDto, status_code=status.HTTP_201_CREATED)
async def create_exam(workspace_id: str, command: ExamCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        exam = SchoolErpHandler().create_exam(command)
        return SchoolErpDtoMapper.map_exam(exam)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exams", response_model=List[ExamDto])
async def list_exams(workspace_id: str, class_id: Optional[str] = None, user: dict = Depends(gate)):
    try:
        exams = SchoolErpHandler().list_exams(workspace_id, class_id)
        return [SchoolErpDtoMapper.map_exam(e) for e in exams]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing exams: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exams/{exam_id}", response_model=ExamDto)
async def get_exam(workspace_id: str, exam_id: str, user: dict = Depends(gate)):
    try:
        exam = SchoolErpHandler().get_exam(exam_id)
        if str(exam.workspace_id) != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        return SchoolErpDtoMapper.map_exam(exam)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/exams/{exam_id}", response_model=ExamDto)
async def update_exam(workspace_id: str, exam_id: str, command: ExamUpdateCommand, user: dict = Depends(gate)):
    command.exam_id = exam_id
    try:
        exam = SchoolErpHandler().update_exam(command)
        return SchoolErpDtoMapper.map_exam(exam)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/exams/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(workspace_id: str, exam_id: str, user: dict = Depends(gate)):
    try:
        SchoolErpHandler().delete_exam(exam_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Exam results ------------------------------------------------------------------

@router.post("/exam-results", response_model=ExamResultDto, status_code=status.HTTP_201_CREATED)
async def create_exam_result(workspace_id: str, command: ExamResultCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        result = SchoolErpHandler().create_exam_result(command)
        return SchoolErpDtoMapper.map_exam_result(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating exam result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exam-results/bulk", response_model=List[ExamResultDto], status_code=status.HTTP_201_CREATED)
async def bulk_create_exam_results(workspace_id: str, command: BulkExamResultCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        results = SchoolErpHandler().bulk_create_exam_results(command)
        return [SchoolErpDtoMapper.map_exam_result(r) for r in results]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk creating exam results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exam-results", response_model=List[ExamResultDto])
async def list_exam_results(
    workspace_id: str,
    exam_id: Optional[str] = None,
    student_id: Optional[str] = None,
    user: dict = Depends(gate),
):
    try:
        results = SchoolErpHandler().list_exam_results(workspace_id, exam_id, student_id)
        return [SchoolErpDtoMapper.map_exam_result(r) for r in results]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing exam results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/exam-results/{result_id}", response_model=ExamResultDto)
async def update_exam_result(workspace_id: str, result_id: str, command: ExamResultUpdateCommand, user: dict = Depends(gate)):
    command.result_id = result_id
    try:
        result = SchoolErpHandler().update_exam_result(command)
        return SchoolErpDtoMapper.map_exam_result(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating exam result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/exam-results/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_result(workspace_id: str, result_id: str, user: dict = Depends(gate)):
    try:
        SchoolErpHandler().delete_exam_result(result_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting exam result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


school_erp_router = router

from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class TeacherDto(BaseModel):
    teacher_id: str
    workspace_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    subject_specialization: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SchoolClassDto(BaseModel):
    class_id: str
    workspace_id: str
    name: str
    academic_year: str
    capacity: Optional[int] = None
    homeroom_teacher_id: Optional[str] = None
    homeroom_teacher_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class StudentDto(BaseModel):
    student_id: str
    workspace_id: str
    first_name: str
    last_name: str
    admission_number: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_contact: Optional[str] = None
    email: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AttendanceDto(BaseModel):
    attendance_id: str
    workspace_id: str
    student_id: str
    student_name: Optional[str] = None
    class_id: Optional[str] = None
    date: date
    status: str
    marked_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class FeeStructureDto(BaseModel):
    fee_structure_id: str
    workspace_id: str
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    academic_year: str
    term: str
    amount: float
    due_date: Optional[date] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class FeePaymentDto(BaseModel):
    payment_id: str
    workspace_id: str
    student_id: str
    student_name: Optional[str] = None
    fee_structure_id: Optional[str] = None
    amount: float
    payment_date: date
    payment_method: str
    notes: Optional[str] = None
    created_at: datetime


class FeeBalanceDto(BaseModel):
    fee_structure_id: str
    term: str
    academic_year: str
    amount_due: float
    amount_paid: float
    balance: float


class ExamDto(BaseModel):
    exam_id: str
    workspace_id: str
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    name: str
    subject: str
    exam_date: Optional[date] = None
    max_marks: float
    academic_year: str
    created_at: datetime
    updated_at: datetime


class ExamResultDto(BaseModel):
    result_id: str
    workspace_id: str
    exam_id: str
    student_id: str
    student_name: Optional[str] = None
    marks_obtained: float
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime


def _full_name(first: Optional[str], last: Optional[str]) -> Optional[str]:
    if not first and not last:
        return None
    return f"{first or ''} {last or ''}".strip()


class SchoolErpDtoMapper:
    @staticmethod
    def map_teacher(teacher) -> TeacherDto:
        return TeacherDto(
            teacher_id=str(teacher.teacher_id),
            workspace_id=str(teacher.workspace_id),
            first_name=teacher.first_name,
            last_name=teacher.last_name,
            email=teacher.email,
            phone=teacher.phone,
            subject_specialization=teacher.subject_specialization,
            created_at=teacher.created_at,
            updated_at=teacher.updated_at,
        )

    @staticmethod
    def map_class(school_class) -> SchoolClassDto:
        teacher = school_class.homeroom_teacher
        return SchoolClassDto(
            class_id=str(school_class.class_id),
            workspace_id=str(school_class.workspace_id),
            name=school_class.name,
            academic_year=school_class.academic_year,
            capacity=school_class.capacity,
            homeroom_teacher_id=str(school_class.homeroom_teacher_id) if school_class.homeroom_teacher_id else None,
            homeroom_teacher_name=_full_name(teacher.first_name, teacher.last_name) if teacher else None,
            created_at=school_class.created_at,
            updated_at=school_class.updated_at,
        )

    @staticmethod
    def map_student(student) -> StudentDto:
        school_class = student.school_class
        return StudentDto(
            student_id=str(student.student_id),
            workspace_id=str(student.workspace_id),
            first_name=student.first_name,
            last_name=student.last_name,
            admission_number=student.admission_number,
            date_of_birth=student.date_of_birth,
            gender=student.gender,
            class_id=str(student.class_id) if student.class_id else None,
            class_name=school_class.name if school_class else None,
            guardian_name=student.guardian_name,
            guardian_contact=student.guardian_contact,
            email=student.email,
            is_active=student.is_active,
            created_at=student.created_at,
            updated_at=student.updated_at,
        )

    @staticmethod
    def map_attendance(attendance) -> AttendanceDto:
        student = attendance.student
        return AttendanceDto(
            attendance_id=str(attendance.attendance_id),
            workspace_id=str(attendance.workspace_id),
            student_id=str(attendance.student_id),
            student_name=_full_name(student.first_name, student.last_name) if student else None,
            class_id=str(attendance.class_id) if attendance.class_id else None,
            date=attendance.date,
            status=attendance.status,
            marked_by=str(attendance.marked_by) if attendance.marked_by else None,
            notes=attendance.notes,
            created_at=attendance.created_at,
            updated_at=attendance.updated_at,
        )

    @staticmethod
    def map_fee_structure(fee_structure) -> FeeStructureDto:
        school_class = fee_structure.school_class
        return FeeStructureDto(
            fee_structure_id=str(fee_structure.fee_structure_id),
            workspace_id=str(fee_structure.workspace_id),
            class_id=str(fee_structure.class_id) if fee_structure.class_id else None,
            class_name=school_class.name if school_class else None,
            academic_year=fee_structure.academic_year,
            term=fee_structure.term,
            amount=float(fee_structure.amount),
            due_date=fee_structure.due_date,
            description=fee_structure.description,
            created_at=fee_structure.created_at,
            updated_at=fee_structure.updated_at,
        )

    @staticmethod
    def map_fee_payment(payment) -> FeePaymentDto:
        student = payment.student
        return FeePaymentDto(
            payment_id=str(payment.payment_id),
            workspace_id=str(payment.workspace_id),
            student_id=str(payment.student_id),
            student_name=_full_name(student.first_name, student.last_name) if student else None,
            fee_structure_id=str(payment.fee_structure_id) if payment.fee_structure_id else None,
            amount=float(payment.amount),
            payment_date=payment.payment_date,
            payment_method=payment.payment_method,
            notes=payment.notes,
            created_at=payment.created_at,
        )

    @staticmethod
    def map_exam(exam) -> ExamDto:
        school_class = exam.school_class
        return ExamDto(
            exam_id=str(exam.exam_id),
            workspace_id=str(exam.workspace_id),
            class_id=str(exam.class_id) if exam.class_id else None,
            class_name=school_class.name if school_class else None,
            name=exam.name,
            subject=exam.subject,
            exam_date=exam.exam_date,
            max_marks=float(exam.max_marks),
            academic_year=exam.academic_year,
            created_at=exam.created_at,
            updated_at=exam.updated_at,
        )

    @staticmethod
    def map_exam_result(result) -> ExamResultDto:
        student = result.student
        return ExamResultDto(
            result_id=str(result.result_id),
            workspace_id=str(result.workspace_id),
            exam_id=str(result.exam_id),
            student_id=str(result.student_id),
            student_name=_full_name(student.first_name, student.last_name) if student else None,
            marks_obtained=float(result.marks_obtained),
            remarks=result.remarks,
            created_at=result.created_at,
            updated_at=result.updated_at,
        )

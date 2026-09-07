from pydantic import BaseModel
from typing import Optional, List
from datetime import date


# -- Teachers ------------------------------------------------------------------

class TeacherCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    subject_specialization: Optional[str] = None


class TeacherUpdateCommand(BaseModel):
    teacher_id: Optional[str] = None  # Set from the URL path by the controller
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    subject_specialization: Optional[str] = None


# -- Classes ---------------------------------------------------------------

class SchoolClassCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    name: str
    academic_year: str
    capacity: Optional[int] = None
    homeroom_teacher_id: Optional[str] = None


class SchoolClassUpdateCommand(BaseModel):
    class_id: Optional[str] = None  # Set from the URL path by the controller
    name: Optional[str] = None
    academic_year: Optional[str] = None
    capacity: Optional[int] = None
    # "" clears the homeroom teacher; None means "leave unchanged" -- same
    # convention Employee.manager_id update uses.
    homeroom_teacher_id: Optional[str] = None


# -- Students ----------------------------------------------------------------

class StudentCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    first_name: str
    last_name: str
    admission_number: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    class_id: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_contact: Optional[str] = None
    email: Optional[str] = None


class StudentUpdateCommand(BaseModel):
    student_id: Optional[str] = None  # Set from the URL path by the controller
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    class_id: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_contact: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


# -- Attendance ----------------------------------------------------------------

class AttendanceCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    student_id: str
    class_id: Optional[str] = None
    date: date
    status: str  # present | absent | late | excused
    marked_by: Optional[str] = None  # Set from the auth token by the controller
    notes: Optional[str] = None


class AttendanceRecordItem(BaseModel):
    student_id: str
    status: str
    notes: Optional[str] = None


class BulkAttendanceCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    class_id: str
    date: date
    marked_by: Optional[str] = None  # Set from the auth token by the controller
    records: List[AttendanceRecordItem]


# -- Fee structures ------------------------------------------------------------

class FeeStructureCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    class_id: Optional[str] = None
    academic_year: str
    term: str
    amount: float
    due_date: Optional[date] = None
    description: Optional[str] = None


class FeeStructureUpdateCommand(BaseModel):
    fee_structure_id: Optional[str] = None  # Set from the URL path by the controller
    class_id: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    description: Optional[str] = None


# -- Fee payments --------------------------------------------------------------

class FeePaymentCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    student_id: str
    fee_structure_id: Optional[str] = None
    amount: float
    payment_date: date
    payment_method: str = "cash"
    notes: Optional[str] = None


# -- Exams ---------------------------------------------------------------------

class ExamCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    class_id: Optional[str] = None
    name: str
    subject: str
    exam_date: Optional[date] = None
    max_marks: float
    academic_year: str


class ExamUpdateCommand(BaseModel):
    exam_id: Optional[str] = None  # Set from the URL path by the controller
    class_id: Optional[str] = None
    name: Optional[str] = None
    subject: Optional[str] = None
    exam_date: Optional[date] = None
    max_marks: Optional[float] = None
    academic_year: Optional[str] = None


# -- Exam results ----------------------------------------------------------------

class ExamResultCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    exam_id: str
    student_id: str
    marks_obtained: float
    remarks: Optional[str] = None


class ExamResultUpdateCommand(BaseModel):
    result_id: Optional[str] = None  # Set from the URL path by the controller
    marks_obtained: Optional[float] = None
    remarks: Optional[str] = None


class ExamResultItem(BaseModel):
    student_id: str
    marks_obtained: float
    remarks: Optional[str] = None


class BulkExamResultCommand(BaseModel):
    workspace_id: Optional[str] = None  # Set from the URL path by the controller
    exam_id: str
    results: List[ExamResultItem]

import datetime
import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Boolean, Integer, Text, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from adapters.orm.models.base import Base


class Teacher(Base):
    __tablename__ = "school_teachers"

    teacher_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    subject_specialization = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))


class SchoolClass(Base):
    __tablename__ = "school_classes"

    class_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)  # e.g. "Grade 5 - A"
    academic_year = Column(String, nullable=False)  # e.g. "2026-2027"
    capacity = Column(Integer, nullable=True)
    # SET NULL, not CASCADE -- deleting a teacher shouldn't delete the class,
    # same reasoning as Employee.manager_id in the HR module.
    homeroom_teacher_id = Column(UUID(as_uuid=True), ForeignKey("school_teachers.teacher_id", ondelete="SET NULL"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    homeroom_teacher = relationship("Teacher", foreign_keys=[homeroom_teacher_id])


class Student(Base):
    __tablename__ = "school_students"

    student_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    admission_number = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    # SET NULL, not CASCADE -- a class being removed shouldn't delete its
    # students, just leave them unassigned (same pattern as homeroom_teacher_id).
    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.class_id", ondelete="SET NULL"), nullable=True)
    guardian_name = Column(String, nullable=True)
    guardian_contact = Column(String, nullable=True)
    email = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    school_class = relationship("SchoolClass", foreign_keys=[class_id])

    __table_args__ = (
        # Unique per workspace, not globally -- two different schools
        # (workspaces) can both have an admission number "2026-001".
        UniqueConstraint("workspace_id", "admission_number", name="uq_school_students_workspace_admission_number"),
    )


class Attendance(Base):
    __tablename__ = "school_attendance"

    attendance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("school_students.student_id", ondelete="CASCADE"), nullable=False)
    # Captured at mark-time rather than looked up through student.class_id --
    # a student transferring classes later shouldn't rewrite history of
    # which class they were attending on a past date.
    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.class_id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, nullable=False)
    status = Column(String, nullable=False)  # present | absent | late | excused
    marked_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    student = relationship("Student", foreign_keys=[student_id])

    __table_args__ = (
        # One attendance record per student per day -- re-marking the same
        # day is an update, not a second row.
        UniqueConstraint("student_id", "date", name="uq_school_attendance_student_date"),
    )


class FeeStructure(Base):
    __tablename__ = "school_fee_structures"

    fee_structure_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    # Nullable -- a fee structure can apply school-wide (no class_id) or to
    # one specific class.
    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.class_id", ondelete="SET NULL"), nullable=True)
    academic_year = Column(String, nullable=False)
    term = Column(String, nullable=False)  # e.g. "Term 1"
    amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=True)
    description = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    school_class = relationship("SchoolClass", foreign_keys=[class_id])


class FeePayment(Base):
    __tablename__ = "school_fee_payments"

    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("school_students.student_id", ondelete="CASCADE"), nullable=False)
    fee_structure_id = Column(UUID(as_uuid=True), ForeignKey("school_fee_structures.fee_structure_id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String, nullable=False, default="cash")  # cash | card | bank_transfer | online | other
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))

    student = relationship("Student", foreign_keys=[student_id])
    fee_structure = relationship("FeeStructure", foreign_keys=[fee_structure_id])


class Exam(Base):
    __tablename__ = "school_exams"

    exam_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.class_id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)  # e.g. "Midterm"
    subject = Column(String, nullable=False)
    exam_date = Column(Date, nullable=True)
    max_marks = Column(Numeric(10, 2), nullable=False)
    academic_year = Column(String, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    school_class = relationship("SchoolClass", foreign_keys=[class_id])


class ExamResult(Base):
    __tablename__ = "school_exam_results"

    result_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("school_exams.exam_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("school_students.student_id", ondelete="CASCADE"), nullable=False)
    marks_obtained = Column(Numeric(10, 2), nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.UTC), onupdate=datetime.datetime.now(datetime.UTC))

    exam = relationship("Exam", foreign_keys=[exam_id])
    student = relationship("Student", foreign_keys=[student_id])

    __table_args__ = (
        # One result per student per exam -- re-entering a score is an
        # update, not a second row.
        UniqueConstraint("exam_id", "student_id", name="uq_school_exam_results_exam_student"),
    )

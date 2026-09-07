from uuid import UUID
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from fastapi import HTTPException, status
from adapters.orm.models.database import SessionLocal
from .models import Teacher, SchoolClass, Student, Attendance, FeeStructure, FeePayment, Exam, ExamResult
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
import logging

logger = logging.getLogger(__name__)

ATTENDANCE_STATUSES = ("present", "absent", "late", "excused")

_CLASS_LOAD_OPTS = (joinedload(SchoolClass.homeroom_teacher),)
_STUDENT_LOAD_OPTS = (joinedload(Student.school_class),)
_ATTENDANCE_LOAD_OPTS = (joinedload(Attendance.student),)
_FEE_STRUCTURE_LOAD_OPTS = (joinedload(FeeStructure.school_class),)
_FEE_PAYMENT_LOAD_OPTS = (joinedload(FeePayment.student),)
_EXAM_LOAD_OPTS = (joinedload(Exam.school_class),)
_EXAM_RESULT_LOAD_OPTS = (joinedload(ExamResult.student),)


class SchoolErpHandler:
    def __init__(self):
        self.db = SessionLocal()

    # -- force-load helpers ---------------------------------------------------
    # Every relationship the DTO mapper touches, force-loaded while this
    # handler's session is still open. Needed on any mutation path that
    # doesn't already fetch through a method whose joinedload options cover
    # it, since the mapper runs in the controller after the handler returns
    # and this session may already be closed by then.

    def _force_load_class(self, school_class: SchoolClass) -> None:
        _ = school_class.homeroom_teacher

    def _force_load_student(self, student: Student) -> None:
        _ = student.school_class

    def _force_load_attendance(self, attendance: Attendance) -> None:
        _ = attendance.student

    def _force_load_fee_structure(self, fee_structure: FeeStructure) -> None:
        _ = fee_structure.school_class

    def _force_load_fee_payment(self, payment: FeePayment) -> None:
        _ = payment.student

    def _force_load_exam(self, exam: Exam) -> None:
        _ = exam.school_class

    def _force_load_exam_result(self, result: ExamResult) -> None:
        _ = result.student

    # -- Teachers --------------------------------------------------------------

    def create_teacher(self, command: TeacherCommand) -> Teacher:
        try:
            teacher = Teacher(
                workspace_id=UUID(command.workspace_id),
                first_name=command.first_name,
                last_name=command.last_name,
                email=command.email,
                phone=command.phone,
                subject_specialization=command.subject_specialization,
            )
            self.db.add(teacher)
            self.db.commit()
            self.db.refresh(teacher)
            return teacher
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating teacher: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create teacher")

    def get_teacher(self, teacher_id: str) -> Teacher:
        teacher = self.db.query(Teacher).filter(
            Teacher.teacher_id == UUID(teacher_id),
            Teacher.is_deleted == False,
        ).first()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        return teacher

    def list_teachers(self, workspace_id: str) -> list[Teacher]:
        return self.db.query(Teacher).filter(
            Teacher.workspace_id == UUID(workspace_id),
            Teacher.is_deleted == False,
        ).order_by(Teacher.created_at.asc()).all()

    def update_teacher(self, command: TeacherUpdateCommand) -> Teacher:
        try:
            teacher = self.get_teacher(command.teacher_id)
            if command.first_name is not None:
                teacher.first_name = command.first_name
            if command.last_name is not None:
                teacher.last_name = command.last_name
            if command.email is not None:
                teacher.email = command.email
            if command.phone is not None:
                teacher.phone = command.phone
            if command.subject_specialization is not None:
                teacher.subject_specialization = command.subject_specialization
            self.db.commit()
            self.db.refresh(teacher)
            return teacher
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating teacher: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update teacher")

    def delete_teacher(self, teacher_id: str, workspace_id: str):
        try:
            teacher = self.db.query(Teacher).filter(
                Teacher.teacher_id == UUID(teacher_id),
                Teacher.workspace_id == UUID(workspace_id),
                Teacher.is_deleted == False,
            ).first()
            if not teacher:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

            # Unlink, don't cascade -- the FK's ON DELETE SET NULL never
            # fires here since this is a soft delete (same reasoning as
            # Employee.manager_id in the HR module).
            self.db.query(SchoolClass).filter(SchoolClass.homeroom_teacher_id == teacher.teacher_id).update({"homeroom_teacher_id": None})
            teacher.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting teacher: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete teacher")

    # -- Classes -----------------------------------------------------------------

    def _validate_teacher_ref(self, teacher_id: str, workspace_id: str) -> None:
        if not teacher_id:
            return
        exists = self.db.query(Teacher).filter(
            Teacher.teacher_id == UUID(teacher_id),
            Teacher.workspace_id == UUID(workspace_id),
            Teacher.is_deleted == False,
        ).first()
        if not exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="homeroom_teacher_id does not reference a valid teacher")

    def create_class(self, command: SchoolClassCommand) -> SchoolClass:
        try:
            self._validate_teacher_ref(command.homeroom_teacher_id, command.workspace_id)
            school_class = SchoolClass(
                workspace_id=UUID(command.workspace_id),
                name=command.name,
                academic_year=command.academic_year,
                capacity=command.capacity,
                homeroom_teacher_id=UUID(command.homeroom_teacher_id) if command.homeroom_teacher_id else None,
            )
            self.db.add(school_class)
            self.db.commit()
            self.db.refresh(school_class)
            self._force_load_class(school_class)
            return school_class
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating class: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create class")

    def get_class(self, class_id: str) -> SchoolClass:
        school_class = self.db.query(SchoolClass).options(*_CLASS_LOAD_OPTS).filter(
            SchoolClass.class_id == UUID(class_id),
            SchoolClass.is_deleted == False,
        ).first()
        if not school_class:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
        return school_class

    def list_classes(self, workspace_id: str) -> list[SchoolClass]:
        return self.db.query(SchoolClass).options(*_CLASS_LOAD_OPTS).filter(
            SchoolClass.workspace_id == UUID(workspace_id),
            SchoolClass.is_deleted == False,
        ).order_by(SchoolClass.created_at.asc()).all()

    def update_class(self, command: SchoolClassUpdateCommand) -> SchoolClass:
        try:
            school_class = self.get_class(command.class_id)
            if command.name is not None:
                school_class.name = command.name
            if command.academic_year is not None:
                school_class.academic_year = command.academic_year
            if command.capacity is not None:
                school_class.capacity = command.capacity
            if command.homeroom_teacher_id is not None:
                new_teacher_id = command.homeroom_teacher_id or None
                if new_teacher_id:
                    self._validate_teacher_ref(new_teacher_id, str(school_class.workspace_id))
                school_class.homeroom_teacher_id = UUID(new_teacher_id) if new_teacher_id else None
            self.db.commit()
            self.db.refresh(school_class)
            self._force_load_class(school_class)
            return school_class
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating class: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update class")

    def delete_class(self, class_id: str, workspace_id: str):
        try:
            school_class = self.db.query(SchoolClass).filter(
                SchoolClass.class_id == UUID(class_id),
                SchoolClass.workspace_id == UUID(workspace_id),
                SchoolClass.is_deleted == False,
            ).first()
            if not school_class:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

            # Unlink students rather than leaving a dangling reference --
            # same reasoning as delete_teacher above.
            self.db.query(Student).filter(Student.class_id == school_class.class_id).update({"class_id": None})
            school_class.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting class: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete class")

    # -- Students ------------------------------------------------------------------

    def _validate_class_ref(self, class_id: str, workspace_id: str) -> None:
        if not class_id:
            return
        exists = self.db.query(SchoolClass).filter(
            SchoolClass.class_id == UUID(class_id),
            SchoolClass.workspace_id == UUID(workspace_id),
            SchoolClass.is_deleted == False,
        ).first()
        if not exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="class_id does not reference a valid class")

    def create_student(self, command: StudentCommand) -> Student:
        try:
            self._validate_class_ref(command.class_id, command.workspace_id)
            student = Student(
                workspace_id=UUID(command.workspace_id),
                first_name=command.first_name,
                last_name=command.last_name,
                admission_number=command.admission_number,
                date_of_birth=command.date_of_birth,
                gender=command.gender,
                class_id=UUID(command.class_id) if command.class_id else None,
                guardian_name=command.guardian_name,
                guardian_contact=command.guardian_contact,
                email=command.email,
            )
            self.db.add(student)
            self.db.commit()
            self.db.refresh(student)
            self._force_load_student(student)
            return student
        except HTTPException:
            raise
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="admission_number is already in use in this workspace")
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating student: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create student")

    def get_student(self, student_id: str) -> Student:
        student = self.db.query(Student).options(*_STUDENT_LOAD_OPTS).filter(
            Student.student_id == UUID(student_id),
            Student.is_deleted == False,
        ).first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        return student

    def list_students(self, workspace_id: str, class_id: str = None) -> list[Student]:
        query = self.db.query(Student).options(*_STUDENT_LOAD_OPTS).filter(
            Student.workspace_id == UUID(workspace_id),
            Student.is_deleted == False,
        )
        if class_id:
            query = query.filter(Student.class_id == UUID(class_id))
        return query.order_by(Student.created_at.asc()).all()

    def update_student(self, command: StudentUpdateCommand) -> Student:
        try:
            student = self.get_student(command.student_id)
            if command.first_name is not None:
                student.first_name = command.first_name
            if command.last_name is not None:
                student.last_name = command.last_name
            if command.date_of_birth is not None:
                student.date_of_birth = command.date_of_birth
            if command.gender is not None:
                student.gender = command.gender
            if command.class_id is not None:
                new_class_id = command.class_id or None
                if new_class_id:
                    self._validate_class_ref(new_class_id, str(student.workspace_id))
                student.class_id = UUID(new_class_id) if new_class_id else None
            if command.guardian_name is not None:
                student.guardian_name = command.guardian_name
            if command.guardian_contact is not None:
                student.guardian_contact = command.guardian_contact
            if command.email is not None:
                student.email = command.email
            if command.is_active is not None:
                student.is_active = command.is_active
            self.db.commit()
            self.db.refresh(student)
            self._force_load_student(student)
            return student
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating student: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update student")

    def delete_student(self, student_id: str, workspace_id: str):
        try:
            student = self.db.query(Student).filter(
                Student.student_id == UUID(student_id),
                Student.workspace_id == UUID(workspace_id),
                Student.is_deleted == False,
            ).first()
            if not student:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
            # Attendance/fee-payment/exam-result history is left in place --
            # soft-deleting a student shouldn't erase past records.
            student.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting student: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete student")

    # -- Attendance --------------------------------------------------------------

    def _validate_attendance_status(self, value: str) -> None:
        if value not in ATTENDANCE_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"status must be one of {ATTENDANCE_STATUSES}")

    def mark_attendance(self, command: AttendanceCommand) -> Attendance:
        try:
            self._validate_attendance_status(command.status)
            # Re-marking the same student/date is a correction, not a
            # duplicate error -- upsert rather than reject.
            existing = self.db.query(Attendance).filter(
                Attendance.student_id == UUID(command.student_id),
                Attendance.date == command.date,
            ).first()
            if existing:
                existing.status = command.status
                existing.class_id = UUID(command.class_id) if command.class_id else existing.class_id
                existing.marked_by = UUID(command.marked_by) if command.marked_by else existing.marked_by
                existing.notes = command.notes
                attendance = existing
            else:
                attendance = Attendance(
                    workspace_id=UUID(command.workspace_id),
                    student_id=UUID(command.student_id),
                    class_id=UUID(command.class_id) if command.class_id else None,
                    date=command.date,
                    status=command.status,
                    marked_by=UUID(command.marked_by) if command.marked_by else None,
                    notes=command.notes,
                )
                self.db.add(attendance)
            self.db.commit()
            self.db.refresh(attendance)
            self._force_load_attendance(attendance)
            return attendance
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error marking attendance: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to mark attendance")

    def bulk_mark_attendance(self, command: BulkAttendanceCommand) -> list[Attendance]:
        results = []
        for item in command.records:
            single = AttendanceCommand(
                workspace_id=command.workspace_id,
                student_id=item.student_id,
                class_id=command.class_id,
                date=command.date,
                status=item.status,
                marked_by=command.marked_by,
                notes=item.notes,
            )
            results.append(self.mark_attendance(single))
        # Each iteration's commit() expires every object the session has
        # already loaded (SQLAlchemy's default expire_on_commit=True) --
        # including the .student force-loaded on *earlier* iterations'
        # records. Re-force-load the whole batch now that every commit in
        # this call is done, so nothing invalidates them again before the
        # controller maps this list after the session closes.
        for attendance in results:
            self._force_load_attendance(attendance)
        return results

    def get_attendance(self, attendance_id: str) -> Attendance:
        attendance = self.db.query(Attendance).options(*_ATTENDANCE_LOAD_OPTS).filter(
            Attendance.attendance_id == UUID(attendance_id),
        ).first()
        if not attendance:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
        return attendance

    def list_attendance(self, workspace_id: str, student_id: str = None, class_id: str = None,
                         date_from=None, date_to=None) -> list[Attendance]:
        query = self.db.query(Attendance).options(*_ATTENDANCE_LOAD_OPTS).filter(
            Attendance.workspace_id == UUID(workspace_id),
        )
        if student_id:
            query = query.filter(Attendance.student_id == UUID(student_id))
        if class_id:
            query = query.filter(Attendance.class_id == UUID(class_id))
        if date_from:
            query = query.filter(Attendance.date >= date_from)
        if date_to:
            query = query.filter(Attendance.date <= date_to)
        return query.order_by(Attendance.date.desc()).all()

    def delete_attendance(self, attendance_id: str, workspace_id: str):
        try:
            attendance = self.db.query(Attendance).filter(
                Attendance.attendance_id == UUID(attendance_id),
                Attendance.workspace_id == UUID(workspace_id),
            ).first()
            if not attendance:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
            # No is_deleted column on Attendance -- a hard delete is correct
            # here (same reasoning already applied to Reminder).
            self.db.delete(attendance)
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting attendance record: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete attendance record")

    # -- Fee structures ------------------------------------------------------------

    def create_fee_structure(self, command: FeeStructureCommand) -> FeeStructure:
        try:
            self._validate_class_ref(command.class_id, command.workspace_id)
            fee_structure = FeeStructure(
                workspace_id=UUID(command.workspace_id),
                class_id=UUID(command.class_id) if command.class_id else None,
                academic_year=command.academic_year,
                term=command.term,
                amount=command.amount,
                due_date=command.due_date,
                description=command.description,
            )
            self.db.add(fee_structure)
            self.db.commit()
            self.db.refresh(fee_structure)
            self._force_load_fee_structure(fee_structure)
            return fee_structure
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating fee structure: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create fee structure")

    def get_fee_structure(self, fee_structure_id: str) -> FeeStructure:
        fee_structure = self.db.query(FeeStructure).options(*_FEE_STRUCTURE_LOAD_OPTS).filter(
            FeeStructure.fee_structure_id == UUID(fee_structure_id),
            FeeStructure.is_deleted == False,
        ).first()
        if not fee_structure:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee structure not found")
        return fee_structure

    def list_fee_structures(self, workspace_id: str, class_id: str = None) -> list[FeeStructure]:
        query = self.db.query(FeeStructure).options(*_FEE_STRUCTURE_LOAD_OPTS).filter(
            FeeStructure.workspace_id == UUID(workspace_id),
            FeeStructure.is_deleted == False,
        )
        if class_id:
            query = query.filter(FeeStructure.class_id == UUID(class_id))
        return query.order_by(FeeStructure.due_date.asc().nullslast()).all()

    def update_fee_structure(self, command: FeeStructureUpdateCommand) -> FeeStructure:
        try:
            fee_structure = self.get_fee_structure(command.fee_structure_id)
            if command.class_id is not None:
                new_class_id = command.class_id or None
                if new_class_id:
                    self._validate_class_ref(new_class_id, str(fee_structure.workspace_id))
                fee_structure.class_id = UUID(new_class_id) if new_class_id else None
            if command.academic_year is not None:
                fee_structure.academic_year = command.academic_year
            if command.term is not None:
                fee_structure.term = command.term
            if command.amount is not None:
                fee_structure.amount = command.amount
            if command.due_date is not None:
                fee_structure.due_date = command.due_date
            if command.description is not None:
                fee_structure.description = command.description
            self.db.commit()
            self.db.refresh(fee_structure)
            self._force_load_fee_structure(fee_structure)
            return fee_structure
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating fee structure: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update fee structure")

    def delete_fee_structure(self, fee_structure_id: str, workspace_id: str):
        try:
            fee_structure = self.db.query(FeeStructure).filter(
                FeeStructure.fee_structure_id == UUID(fee_structure_id),
                FeeStructure.workspace_id == UUID(workspace_id),
                FeeStructure.is_deleted == False,
            ).first()
            if not fee_structure:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee structure not found")
            fee_structure.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting fee structure: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete fee structure")

    # -- Fee payments ----------------------------------------------------------------

    def create_fee_payment(self, command: FeePaymentCommand) -> FeePayment:
        try:
            student = self.db.query(Student).filter(
                Student.student_id == UUID(command.student_id),
                Student.workspace_id == UUID(command.workspace_id),
                Student.is_deleted == False,
            ).first()
            if not student:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
            if command.fee_structure_id:
                fee_structure = self.db.query(FeeStructure).filter(
                    FeeStructure.fee_structure_id == UUID(command.fee_structure_id),
                    FeeStructure.workspace_id == UUID(command.workspace_id),
                    FeeStructure.is_deleted == False,
                ).first()
                if not fee_structure:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="fee_structure_id does not reference a valid fee structure")

            payment = FeePayment(
                workspace_id=UUID(command.workspace_id),
                student_id=UUID(command.student_id),
                fee_structure_id=UUID(command.fee_structure_id) if command.fee_structure_id else None,
                amount=command.amount,
                payment_date=command.payment_date,
                payment_method=command.payment_method,
                notes=command.notes,
            )
            self.db.add(payment)
            self.db.commit()
            self.db.refresh(payment)
            self._force_load_fee_payment(payment)
            return payment
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating fee payment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create fee payment")

    def list_fee_payments(self, workspace_id: str, student_id: str = None) -> list[FeePayment]:
        query = self.db.query(FeePayment).options(*_FEE_PAYMENT_LOAD_OPTS).filter(
            FeePayment.workspace_id == UUID(workspace_id),
        )
        if student_id:
            query = query.filter(FeePayment.student_id == UUID(student_id))
        return query.order_by(FeePayment.payment_date.desc()).all()

    def delete_fee_payment(self, payment_id: str, workspace_id: str):
        try:
            payment = self.db.query(FeePayment).filter(
                FeePayment.payment_id == UUID(payment_id),
                FeePayment.workspace_id == UUID(workspace_id),
            ).first()
            if not payment:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee payment not found")
            # No is_deleted column -- payments are corrected by deleting a
            # mistaken entry outright, not by soft-deleting a ledger row.
            self.db.delete(payment)
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting fee payment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete fee payment")

    def get_fee_balance(self, student_id: str, workspace_id: str) -> list[dict]:
        student = self.db.query(Student).filter(
            Student.student_id == UUID(student_id),
            Student.workspace_id == UUID(workspace_id),
            Student.is_deleted == False,
        ).first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        # Applicable fee structures: the student's own class, or school-wide
        # (class_id is NULL) -- computed on demand rather than stored, same
        # reasoning as HR's leave-balance calculation, so it can never drift
        # out of sync with actual payments.
        query = self.db.query(FeeStructure).filter(
            FeeStructure.workspace_id == UUID(workspace_id),
            FeeStructure.is_deleted == False,
        )
        if student.class_id:
            query = query.filter(
                (FeeStructure.class_id == student.class_id) | (FeeStructure.class_id.is_(None))
            )
        else:
            query = query.filter(FeeStructure.class_id.is_(None))
        fee_structures = query.all()

        balances = []
        for fs in fee_structures:
            paid = self.db.query(FeePayment).filter(
                FeePayment.student_id == UUID(student_id),
                FeePayment.fee_structure_id == fs.fee_structure_id,
            ).all()
            amount_paid = sum(float(p.amount) for p in paid)
            amount_due = float(fs.amount)
            balances.append({
                "fee_structure_id": str(fs.fee_structure_id),
                "term": fs.term,
                "academic_year": fs.academic_year,
                "amount_due": amount_due,
                "amount_paid": amount_paid,
                "balance": amount_due - amount_paid,
            })
        return balances

    # -- Exams -----------------------------------------------------------------------

    def create_exam(self, command: ExamCommand) -> Exam:
        try:
            self._validate_class_ref(command.class_id, command.workspace_id)
            exam = Exam(
                workspace_id=UUID(command.workspace_id),
                class_id=UUID(command.class_id) if command.class_id else None,
                name=command.name,
                subject=command.subject,
                exam_date=command.exam_date,
                max_marks=command.max_marks,
                academic_year=command.academic_year,
            )
            self.db.add(exam)
            self.db.commit()
            self.db.refresh(exam)
            self._force_load_exam(exam)
            return exam
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating exam: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create exam")

    def get_exam(self, exam_id: str) -> Exam:
        exam = self.db.query(Exam).options(*_EXAM_LOAD_OPTS).filter(
            Exam.exam_id == UUID(exam_id),
            Exam.is_deleted == False,
        ).first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        return exam

    def list_exams(self, workspace_id: str, class_id: str = None) -> list[Exam]:
        query = self.db.query(Exam).options(*_EXAM_LOAD_OPTS).filter(
            Exam.workspace_id == UUID(workspace_id),
            Exam.is_deleted == False,
        )
        if class_id:
            query = query.filter(Exam.class_id == UUID(class_id))
        return query.order_by(Exam.exam_date.desc().nullslast()).all()

    def update_exam(self, command: ExamUpdateCommand) -> Exam:
        try:
            exam = self.get_exam(command.exam_id)
            if command.class_id is not None:
                new_class_id = command.class_id or None
                if new_class_id:
                    self._validate_class_ref(new_class_id, str(exam.workspace_id))
                exam.class_id = UUID(new_class_id) if new_class_id else None
            if command.name is not None:
                exam.name = command.name
            if command.subject is not None:
                exam.subject = command.subject
            if command.exam_date is not None:
                exam.exam_date = command.exam_date
            if command.max_marks is not None:
                exam.max_marks = command.max_marks
            if command.academic_year is not None:
                exam.academic_year = command.academic_year
            self.db.commit()
            self.db.refresh(exam)
            self._force_load_exam(exam)
            return exam
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating exam: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update exam")

    def delete_exam(self, exam_id: str, workspace_id: str):
        try:
            exam = self.db.query(Exam).filter(
                Exam.exam_id == UUID(exam_id),
                Exam.workspace_id == UUID(workspace_id),
                Exam.is_deleted == False,
            ).first()
            if not exam:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
            exam.is_deleted = True
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting exam: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete exam")

    # -- Exam results ------------------------------------------------------------------

    def create_exam_result(self, command: ExamResultCommand) -> ExamResult:
        try:
            exam = self.db.query(Exam).filter(
                Exam.exam_id == UUID(command.exam_id),
                Exam.workspace_id == UUID(command.workspace_id),
                Exam.is_deleted == False,
            ).first()
            if not exam:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
            student = self.db.query(Student).filter(
                Student.student_id == UUID(command.student_id),
                Student.workspace_id == UUID(command.workspace_id),
                Student.is_deleted == False,
            ).first()
            if not student:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
            if float(command.marks_obtained) > float(exam.max_marks):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="marks_obtained cannot exceed the exam's max_marks")

            # Re-entering a score is a correction, not a duplicate error --
            # upsert rather than reject (same pattern as mark_attendance).
            existing = self.db.query(ExamResult).filter(
                ExamResult.exam_id == UUID(command.exam_id),
                ExamResult.student_id == UUID(command.student_id),
            ).first()
            if existing:
                existing.marks_obtained = command.marks_obtained
                existing.remarks = command.remarks
                result = existing
            else:
                result = ExamResult(
                    workspace_id=UUID(command.workspace_id),
                    exam_id=UUID(command.exam_id),
                    student_id=UUID(command.student_id),
                    marks_obtained=command.marks_obtained,
                    remarks=command.remarks,
                )
                self.db.add(result)
            self.db.commit()
            self.db.refresh(result)
            self._force_load_exam_result(result)
            return result
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error creating exam result: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create exam result")

    def bulk_create_exam_results(self, command: BulkExamResultCommand) -> list[ExamResult]:
        results = []
        for item in command.results:
            single = ExamResultCommand(
                workspace_id=command.workspace_id,
                exam_id=command.exam_id,
                student_id=item.student_id,
                marks_obtained=item.marks_obtained,
                remarks=item.remarks,
            )
            results.append(self.create_exam_result(single))
        # Same reasoning as bulk_mark_attendance: each iteration's commit()
        # expires every object already loaded in this session, including
        # earlier iterations' force-loaded .student -- re-force-load the
        # whole batch once all commits are done.
        for result in results:
            self._force_load_exam_result(result)
        return results

    def list_exam_results(self, workspace_id: str, exam_id: str = None, student_id: str = None) -> list[ExamResult]:
        query = self.db.query(ExamResult).options(*_EXAM_RESULT_LOAD_OPTS).filter(
            ExamResult.workspace_id == UUID(workspace_id),
        )
        if exam_id:
            query = query.filter(ExamResult.exam_id == UUID(exam_id))
        if student_id:
            query = query.filter(ExamResult.student_id == UUID(student_id))
        return query.order_by(ExamResult.created_at.desc()).all()

    def update_exam_result(self, command: ExamResultUpdateCommand) -> ExamResult:
        try:
            result = self.db.query(ExamResult).options(*_EXAM_RESULT_LOAD_OPTS).filter(
                ExamResult.result_id == UUID(command.result_id),
            ).first()
            if not result:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam result not found")
            if command.marks_obtained is not None:
                exam = self.db.query(Exam).filter(Exam.exam_id == result.exam_id).first()
                if exam and float(command.marks_obtained) > float(exam.max_marks):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="marks_obtained cannot exceed the exam's max_marks")
                result.marks_obtained = command.marks_obtained
            if command.remarks is not None:
                result.remarks = command.remarks
            self.db.commit()
            self.db.refresh(result)
            self._force_load_exam_result(result)
            return result
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating exam result: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update exam result")

    def delete_exam_result(self, result_id: str, workspace_id: str):
        try:
            result = self.db.query(ExamResult).filter(
                ExamResult.result_id == UUID(result_id),
                ExamResult.workspace_id == UUID(workspace_id),
            ).first()
            if not result:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam result not found")
            self.db.delete(result)
            self.db.commit()
            return True
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting exam result: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete exam result")

    def __del__(self):
        self.db.close()

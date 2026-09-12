import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, HStack, VStack, Badge, IconButton, Button,
  useColorModeValue, useDisclosure, Spinner, Center, useToast,
  Tabs, TabList, TabPanels, Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Select, NumberInput, NumberInputField,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { MdSchool } from 'react-icons/md';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import SchoolErpService from '../../services/SchoolErpService';

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'];

export default function SchoolErpPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const toast = useToast();
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const selectedRowBg = useColorModeValue('teal.50', 'teal.900');

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [exams, setExams] = useState([]);

  const teacherModal = useDisclosure();
  const classModal = useDisclosure();
  const studentModal = useDisclosure();
  const feeStructureModal = useDisclosure();
  const feePaymentModal = useDisclosure();
  const examModal = useDisclosure();
  const examResultModal = useDisclosure();
  const balanceModal = useDisclosure();

  const [newTeacher, setNewTeacher] = useState({ first_name: '', last_name: '', email: '', phone: '', subject_specialization: '' });
  const [newClass, setNewClass] = useState({ name: '', academic_year: '', capacity: '', homeroom_teacher_id: '' });
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '', admission_number: '', class_id: '', guardian_name: '', guardian_contact: '' });
  const [newFeeStructure, setNewFeeStructure] = useState({ class_id: '', academic_year: '', term: '', amount: '', due_date: '', description: '' });
  const [newFeePayment, setNewFeePayment] = useState({ student_id: '', fee_structure_id: '', amount: '', payment_date: '', payment_method: 'cash' });
  const [newExam, setNewExam] = useState({ class_id: '', name: '', subject: '', exam_date: '', max_marks: '', academic_year: '' });
  const [newExamResult, setNewExamResult] = useState({ student_id: '', marks_obtained: '', remarks: '' });

  // Attendance tab: pick a class + date, mark the whole roster at once.
  const [attendanceClassId, setAttendanceClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceDraft, setAttendanceDraft] = useState({});
  const [attendanceLog, setAttendanceLog] = useState([]);

  // Exams tab: pick an exam to see/enter its results.
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examResults, setExamResults] = useState([]);

  // Fee balance lookup (Students tab).
  const [balanceStudent, setBalanceStudent] = useState(null);
  const [balanceRows, setBalanceRows] = useState([]);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      SchoolErpService.getTeachers(),
      SchoolErpService.getClasses(),
      SchoolErpService.getStudents(),
      SchoolErpService.getFeeStructures(),
      SchoolErpService.getFeePayments(),
      SchoolErpService.getExams(),
    ])
      .then(([t, c, s, fs, fp, e]) => {
        setTeachers(t.data);
        setClasses(c.data);
        setStudents(s.data);
        setFeeStructures(fs.data);
        setFeePayments(fp.data);
        setExams(e.data);
      })
      .catch(() => toast({ title: "Couldn't load School ERP data", status: 'error', duration: 3000, isClosable: true }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!attendanceClassId || !attendanceDate) { setAttendanceLog([]); return; }
    SchoolErpService.getAttendance({ class_id: attendanceClassId, date_from: attendanceDate, date_to: attendanceDate })
      .then(res => {
        setAttendanceLog(res.data);
        setAttendanceDraft(Object.fromEntries(res.data.map(a => [a.student_id, a.status])));
      })
      .catch(() => {});
  }, [attendanceClassId, attendanceDate]);

  useEffect(() => {
    if (!selectedExamId) { setExamResults([]); return; }
    SchoolErpService.getExamResults({ exam_id: selectedExamId }).then(res => setExamResults(res.data)).catch(() => {});
  }, [selectedExamId]);

  // -- Teachers --------------------------------------------------------------

  const handleCreateTeacher = async () => {
    if (!newTeacher.first_name.trim() || !newTeacher.last_name.trim()) return;
    try {
      await SchoolErpService.createTeacher(newTeacher);
      setNewTeacher({ first_name: '', last_name: '', email: '', phone: '', subject_specialization: '' });
      teacherModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't create teacher", description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    try {
      await SchoolErpService.removeTeacher(teacherId);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete teacher", status: 'error', duration: 3000, isClosable: true });
    }
  };

  // -- Classes -----------------------------------------------------------------

  const handleCreateClass = async () => {
    if (!newClass.name.trim() || !newClass.academic_year.trim()) return;
    try {
      await SchoolErpService.createClass({
        ...newClass,
        capacity: newClass.capacity === '' ? null : parseInt(newClass.capacity, 10),
        homeroom_teacher_id: newClass.homeroom_teacher_id || null,
      });
      setNewClass({ name: '', academic_year: '', capacity: '', homeroom_teacher_id: '' });
      classModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't create class", description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDeleteClass = async (classId) => {
    try {
      await SchoolErpService.removeClass(classId);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete class", status: 'error', duration: 3000, isClosable: true });
    }
  };

  // -- Students ------------------------------------------------------------------

  const handleCreateStudent = async () => {
    if (!newStudent.first_name.trim() || !newStudent.last_name.trim() || !newStudent.admission_number.trim()) return;
    try {
      await SchoolErpService.createStudent({ ...newStudent, class_id: newStudent.class_id || null });
      setNewStudent({ first_name: '', last_name: '', admission_number: '', class_id: '', guardian_name: '', guardian_contact: '' });
      studentModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't create student", description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      await SchoolErpService.removeStudent(studentId);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete student", status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleViewBalance = async (student) => {
    try {
      const res = await SchoolErpService.getFeeBalance(student.student_id);
      setBalanceStudent(student);
      setBalanceRows(res.data);
      balanceModal.onOpen();
    } catch {
      toast({ title: "Couldn't load fee balance", status: 'error', duration: 3000, isClosable: true });
    }
  };

  // -- Attendance ----------------------------------------------------------------

  const handleSaveAttendance = async () => {
    const rosterInClass = students.filter(s => s.class_id === attendanceClassId);
    const records = rosterInClass
      .filter(s => attendanceDraft[s.student_id])
      .map(s => ({ student_id: s.student_id, status: attendanceDraft[s.student_id] }));
    if (records.length === 0) return;
    try {
      await SchoolErpService.bulkMarkAttendance({ class_id: attendanceClassId, date: attendanceDate, records });
      toast({ title: 'Attendance saved', status: 'success', duration: 2000, isClosable: true });
      const res = await SchoolErpService.getAttendance({ class_id: attendanceClassId, date_from: attendanceDate, date_to: attendanceDate });
      setAttendanceLog(res.data);
    } catch (error) {
      toast({ title: "Couldn't save attendance", description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true });
    }
  };

  // -- Fees ------------------------------------------------------------------------

  const handleCreateFeeStructure = async () => {
    if (!newFeeStructure.academic_year.trim() || !newFeeStructure.term.trim() || newFeeStructure.amount === '') return;
    try {
      await SchoolErpService.createFeeStructure({
        ...newFeeStructure,
        class_id: newFeeStructure.class_id || null,
        amount: parseFloat(newFeeStructure.amount),
        due_date: newFeeStructure.due_date || null,
      });
      setNewFeeStructure({ class_id: '', academic_year: '', term: '', amount: '', due_date: '', description: '' });
      feeStructureModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't create fee structure", description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDeleteFeeStructure = async (id) => {
    try {
      await SchoolErpService.removeFeeStructure(id);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete fee structure", status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleCreateFeePayment = async () => {
    if (!newFeePayment.student_id || newFeePayment.amount === '' || !newFeePayment.payment_date) return;
    try {
      await SchoolErpService.createFeePayment({
        ...newFeePayment,
        fee_structure_id: newFeePayment.fee_structure_id || null,
        amount: parseFloat(newFeePayment.amount),
      });
      setNewFeePayment({ student_id: '', fee_structure_id: '', amount: '', payment_date: '', payment_method: 'cash' });
      feePaymentModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't record payment", description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDeleteFeePayment = async (id) => {
    try {
      await SchoolErpService.removeFeePayment(id);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete payment", status: 'error', duration: 3000, isClosable: true });
    }
  };

  // -- Exams -----------------------------------------------------------------------

  const handleCreateExam = async () => {
    if (!newExam.name.trim() || !newExam.subject.trim() || newExam.max_marks === '' || !newExam.academic_year.trim()) return;
    try {
      await SchoolErpService.createExam({
        ...newExam,
        class_id: newExam.class_id || null,
        max_marks: parseFloat(newExam.max_marks),
        exam_date: newExam.exam_date || null,
      });
      setNewExam({ class_id: '', name: '', subject: '', exam_date: '', max_marks: '', academic_year: '' });
      examModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't create exam", description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDeleteExam = async (examId) => {
    try {
      await SchoolErpService.removeExam(examId);
      if (selectedExamId === examId) setSelectedExamId('');
      loadAll();
    } catch {
      toast({ title: "Couldn't delete exam", status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleCreateExamResult = async () => {
    if (!newExamResult.student_id || newExamResult.marks_obtained === '' || !selectedExamId) return;
    try {
      await SchoolErpService.createExamResult({
        exam_id: selectedExamId,
        student_id: newExamResult.student_id,
        marks_obtained: parseFloat(newExamResult.marks_obtained),
        remarks: newExamResult.remarks || null,
      });
      setNewExamResult({ student_id: '', marks_obtained: '', remarks: '' });
      examResultModal.onClose();
      const res = await SchoolErpService.getExamResults({ exam_id: selectedExamId });
      setExamResults(res.data);
    } catch (error) {
      toast({ title: "Couldn't save result", description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleDeleteExamResult = async (resultId) => {
    try {
      await SchoolErpService.removeExamResult(resultId);
      const res = await SchoolErpService.getExamResults({ exam_id: selectedExamId });
      setExamResults(res.data);
    } catch {
      toast({ title: "Couldn't delete result", status: 'error', duration: 3000, isClosable: true });
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Spinner /></Center>
        </Box>
      </Box>
    );
  }

  const rosterInAttendanceClass = students.filter(s => s.class_id === attendanceClassId);

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack mb={4}>
            <MdSchool size={20} />
            <Heading size="lg">School ERP</Heading>
          </HStack>

          <Tabs colorScheme="teal">
            <TabList overflowX="auto" overflowY="hidden">
              <Tab>Students</Tab>
              <Tab>Classes</Tab>
              <Tab>Teachers</Tab>
              <Tab>Attendance</Tab>
              <Tab>Fees</Tab>
              <Tab>Exams</Tab>
            </TabList>
            <TabPanels>

              {/* Students */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={studentModal.onOpen}>
                    New Student
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Admission #</Th>
                        <Th>Name</Th>
                        <Th>Class</Th>
                        <Th>Guardian</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {students.map(student => (
                        <Tr key={student.student_id}>
                          <Td>{student.admission_number}</Td>
                          <Td>{student.first_name} {student.last_name}</Td>
                          <Td>{student.class_name || '-'}</Td>
                          <Td>{student.guardian_name || '-'}</Td>
                          <Td>
                            <HStack spacing={1}>
                              <Button size="xs" variant="ghost" onClick={() => handleViewBalance(student)}>Balance</Button>
                              <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete student" onClick={() => handleDeleteStudent(student.student_id)} />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {students.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No students yet.</Text>}
                </Box>
              </TabPanel>

              {/* Classes */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={classModal.onOpen}>
                    New Class
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Academic Year</Th>
                        <Th isNumeric>Capacity</Th>
                        <Th>Homeroom Teacher</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {classes.map(cls => (
                        <Tr key={cls.class_id}>
                          <Td>{cls.name}</Td>
                          <Td>{cls.academic_year}</Td>
                          <Td isNumeric>{cls.capacity ?? '-'}</Td>
                          <Td>{cls.homeroom_teacher_name || '-'}</Td>
                          <Td>
                            <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete class" onClick={() => handleDeleteClass(cls.class_id)} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {classes.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No classes yet.</Text>}
                </Box>
              </TabPanel>

              {/* Teachers */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={teacherModal.onOpen}>
                    New Teacher
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Email</Th>
                        <Th>Subject</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {teachers.map(teacher => (
                        <Tr key={teacher.teacher_id}>
                          <Td>{teacher.first_name} {teacher.last_name}</Td>
                          <Td>{teacher.email || '-'}</Td>
                          <Td>{teacher.subject_specialization || '-'}</Td>
                          <Td>
                            <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete teacher" onClick={() => handleDeleteTeacher(teacher.teacher_id)} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {teachers.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No teachers yet.</Text>}
                </Box>
              </TabPanel>

              {/* Attendance */}
              <TabPanel px={0}>
                <HStack mb={3} spacing={3} flexWrap="wrap">
                  <Select size="sm" placeholder="Select class" maxW="240px" value={attendanceClassId} onChange={(e) => setAttendanceClassId(e.target.value)}>
                    {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                  </Select>
                  <Input size="sm" type="date" maxW="180px" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                  <Button size="sm" colorScheme="teal" onClick={handleSaveAttendance} isDisabled={!attendanceClassId}>
                    Save Attendance
                  </Button>
                </HStack>
                {!attendanceClassId ? (
                  <Text fontSize="sm" color="gray.400">Pick a class to mark attendance.</Text>
                ) : (
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Student</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {rosterInAttendanceClass.map(student => (
                          <Tr key={student.student_id}>
                            <Td>{student.first_name} {student.last_name}</Td>
                            <Td>
                              <Select
                                size="sm"
                                maxW="160px"
                                placeholder="Not marked"
                                value={attendanceDraft[student.student_id] || ''}
                                onChange={(e) => setAttendanceDraft(d => ({ ...d, [student.student_id]: e.target.value }))}
                              >
                                {ATTENDANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </Select>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                    {rosterInAttendanceClass.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No students in this class.</Text>}
                  </Box>
                )}
              </TabPanel>

              {/* Fees */}
              <TabPanel px={0}>
                <Heading size="sm" mb={2}>Fee Structures</Heading>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={feeStructureModal.onOpen}>
                    New Fee Structure
                  </Button>
                </HStack>
                <Box overflowX="auto" mb={6}>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Class</Th>
                        <Th>Term</Th>
                        <Th>Academic Year</Th>
                        <Th isNumeric>Amount</Th>
                        <Th>Due Date</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {feeStructures.map(fs => (
                        <Tr key={fs.fee_structure_id}>
                          <Td>{fs.class_name || 'School-wide'}</Td>
                          <Td>{fs.term}</Td>
                          <Td>{fs.academic_year}</Td>
                          <Td isNumeric>{fs.amount.toFixed(2)}</Td>
                          <Td>{fs.due_date || '-'}</Td>
                          <Td>
                            <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete fee structure" onClick={() => handleDeleteFeeStructure(fs.fee_structure_id)} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {feeStructures.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No fee structures yet.</Text>}
                </Box>

                <Heading size="sm" mb={2}>Payments</Heading>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={feePaymentModal.onOpen}>
                    Record Payment
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Student</Th>
                        <Th>Date</Th>
                        <Th isNumeric>Amount</Th>
                        <Th>Method</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {feePayments.map(fp => (
                        <Tr key={fp.payment_id}>
                          <Td>{fp.student_name}</Td>
                          <Td>{fp.payment_date}</Td>
                          <Td isNumeric>{fp.amount.toFixed(2)}</Td>
                          <Td>{fp.payment_method}</Td>
                          <Td>
                            <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete payment" onClick={() => handleDeleteFeePayment(fp.payment_id)} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {feePayments.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No payments recorded yet.</Text>}
                </Box>
              </TabPanel>

              {/* Exams */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={examModal.onOpen}>
                    New Exam
                  </Button>
                </HStack>
                <Box overflowX="auto" mb={6}>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Subject</Th>
                        <Th>Class</Th>
                        <Th>Date</Th>
                        <Th isNumeric>Max Marks</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {exams.map(exam => (
                        <Tr
                          key={exam.exam_id}
                          bg={selectedExamId === exam.exam_id ? selectedRowBg : undefined}
                          cursor="pointer"
                          onClick={() => setSelectedExamId(exam.exam_id)}
                        >
                          <Td>{exam.name}</Td>
                          <Td>{exam.subject}</Td>
                          <Td>{exam.class_name || '-'}</Td>
                          <Td>{exam.exam_date || '-'}</Td>
                          <Td isNumeric>{exam.max_marks}</Td>
                          <Td>
                            <IconButton
                              icon={<FiTrash2 />}
                              size="xs"
                              variant="ghost"
                              aria-label="Delete exam"
                              onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.exam_id); }}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {exams.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No exams yet.</Text>}
                </Box>

                {selectedExamId && (
                  <>
                    <HStack justify="space-between" mb={2}>
                      <Heading size="sm">Results -- {exams.find(e => e.exam_id === selectedExamId)?.name}</Heading>
                      <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={examResultModal.onOpen}>
                        Add Result
                      </Button>
                    </HStack>
                    <Box overflowX="auto">
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Student</Th>
                            <Th isNumeric>Marks</Th>
                            <Th>Remarks</Th>
                            <Th></Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {examResults.map(result => (
                            <Tr key={result.result_id}>
                              <Td>{result.student_name}</Td>
                              <Td isNumeric>{result.marks_obtained}</Td>
                              <Td>{result.remarks || '-'}</Td>
                              <Td>
                                <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete result" onClick={() => handleDeleteExamResult(result.result_id)} />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      {examResults.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No results entered yet.</Text>}
                    </Box>
                  </>
                )}
              </TabPanel>

            </TabPanels>
          </Tabs>
        </Box>
      </Box>

      {/* New Teacher Modal */}
      <Modal isOpen={teacherModal.isOpen} onClose={teacherModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Teacher</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">First Name</FormLabel>
                <Input size="sm" value={newTeacher.first_name} onChange={(e) => setNewTeacher(t => ({ ...t, first_name: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Last Name</FormLabel>
                <Input size="sm" value={newTeacher.last_name} onChange={(e) => setNewTeacher(t => ({ ...t, last_name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Email</FormLabel>
                <Input size="sm" type="email" value={newTeacher.email} onChange={(e) => setNewTeacher(t => ({ ...t, email: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Phone</FormLabel>
                <Input size="sm" value={newTeacher.phone} onChange={(e) => setNewTeacher(t => ({ ...t, phone: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Subject Specialization</FormLabel>
                <Input size="sm" value={newTeacher.subject_specialization} onChange={(e) => setNewTeacher(t => ({ ...t, subject_specialization: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={teacherModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateTeacher}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Class Modal */}
      <Modal isOpen={classModal.isOpen} onClose={classModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Class</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" placeholder="e.g. Grade 5 - A" value={newClass.name} onChange={(e) => setNewClass(c => ({ ...c, name: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Academic Year</FormLabel>
                <Input size="sm" placeholder="e.g. 2026-2027" value={newClass.academic_year} onChange={(e) => setNewClass(c => ({ ...c, academic_year: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Capacity</FormLabel>
                <NumberInput size="sm" value={newClass.capacity} onChange={(v) => setNewClass(c => ({ ...c, capacity: v }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Homeroom Teacher</FormLabel>
                <Select size="sm" placeholder="None" value={newClass.homeroom_teacher_id} onChange={(e) => setNewClass(c => ({ ...c, homeroom_teacher_id: e.target.value }))}>
                  {teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.first_name} {t.last_name}</option>)}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={classModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateClass}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Student Modal */}
      <Modal isOpen={studentModal.isOpen} onClose={studentModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Student</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">First Name</FormLabel>
                <Input size="sm" value={newStudent.first_name} onChange={(e) => setNewStudent(s => ({ ...s, first_name: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Last Name</FormLabel>
                <Input size="sm" value={newStudent.last_name} onChange={(e) => setNewStudent(s => ({ ...s, last_name: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Admission Number</FormLabel>
                <Input size="sm" value={newStudent.admission_number} onChange={(e) => setNewStudent(s => ({ ...s, admission_number: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Class</FormLabel>
                <Select size="sm" placeholder="Unassigned" value={newStudent.class_id} onChange={(e) => setNewStudent(s => ({ ...s, class_id: e.target.value }))}>
                  {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Guardian Name</FormLabel>
                <Input size="sm" value={newStudent.guardian_name} onChange={(e) => setNewStudent(s => ({ ...s, guardian_name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Guardian Contact</FormLabel>
                <Input size="sm" value={newStudent.guardian_contact} onChange={(e) => setNewStudent(s => ({ ...s, guardian_contact: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={studentModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateStudent}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Fee Balance Modal */}
      <Modal isOpen={balanceModal.isOpen} onClose={balanceModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Fee Balance -- {balanceStudent ? `${balanceStudent.first_name} ${balanceStudent.last_name}` : ''}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Term</Th>
                  <Th isNumeric>Due</Th>
                  <Th isNumeric>Paid</Th>
                  <Th isNumeric>Balance</Th>
                </Tr>
              </Thead>
              <Tbody>
                {balanceRows.map(row => (
                  <Tr key={row.fee_structure_id}>
                    <Td>{row.term} ({row.academic_year})</Td>
                    <Td isNumeric>{row.amount_due.toFixed(2)}</Td>
                    <Td isNumeric>{row.amount_paid.toFixed(2)}</Td>
                    <Td isNumeric>
                      <Badge colorScheme={row.balance > 0 ? 'red' : 'green'}>{row.balance.toFixed(2)}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {balanceRows.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No applicable fee structures.</Text>}
          </ModalBody>
          <ModalFooter>
            <Button onClick={balanceModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Fee Structure Modal */}
      <Modal isOpen={feeStructureModal.isOpen} onClose={feeStructureModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Fee Structure</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">Class</FormLabel>
                <Select size="sm" placeholder="School-wide" value={newFeeStructure.class_id} onChange={(e) => setNewFeeStructure(f => ({ ...f, class_id: e.target.value }))}>
                  {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Academic Year</FormLabel>
                <Input size="sm" placeholder="e.g. 2026-2027" value={newFeeStructure.academic_year} onChange={(e) => setNewFeeStructure(f => ({ ...f, academic_year: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Term</FormLabel>
                <Input size="sm" placeholder="e.g. Term 1" value={newFeeStructure.term} onChange={(e) => setNewFeeStructure(f => ({ ...f, term: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Amount</FormLabel>
                <NumberInput size="sm" value={newFeeStructure.amount} onChange={(v) => setNewFeeStructure(f => ({ ...f, amount: v }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Due Date</FormLabel>
                <Input size="sm" type="date" value={newFeeStructure.due_date} onChange={(e) => setNewFeeStructure(f => ({ ...f, due_date: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Description</FormLabel>
                <Input size="sm" value={newFeeStructure.description} onChange={(e) => setNewFeeStructure(f => ({ ...f, description: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={feeStructureModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateFeeStructure}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={feePaymentModal.isOpen} onClose={feePaymentModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Student</FormLabel>
                <Select size="sm" placeholder="Select student" value={newFeePayment.student_id} onChange={(e) => setNewFeePayment(p => ({ ...p, student_id: e.target.value }))}>
                  {students.map(s => <option key={s.student_id} value={s.student_id}>{s.first_name} {s.last_name}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Fee Structure</FormLabel>
                <Select size="sm" placeholder="Unlinked" value={newFeePayment.fee_structure_id} onChange={(e) => setNewFeePayment(p => ({ ...p, fee_structure_id: e.target.value }))}>
                  {feeStructures.map(fs => <option key={fs.fee_structure_id} value={fs.fee_structure_id}>{fs.term} ({fs.academic_year})</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Amount</FormLabel>
                <NumberInput size="sm" value={newFeePayment.amount} onChange={(v) => setNewFeePayment(p => ({ ...p, amount: v }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Payment Date</FormLabel>
                <Input size="sm" type="date" value={newFeePayment.payment_date} onChange={(e) => setNewFeePayment(p => ({ ...p, payment_date: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Method</FormLabel>
                <Select size="sm" value={newFeePayment.payment_method} onChange={(e) => setNewFeePayment(p => ({ ...p, payment_method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={feePaymentModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateFeePayment}>Record</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Exam Modal */}
      <Modal isOpen={examModal.isOpen} onClose={examModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Exam</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" placeholder="e.g. Midterm" value={newExam.name} onChange={(e) => setNewExam(x => ({ ...x, name: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Subject</FormLabel>
                <Input size="sm" value={newExam.subject} onChange={(e) => setNewExam(x => ({ ...x, subject: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Class</FormLabel>
                <Select size="sm" placeholder="School-wide" value={newExam.class_id} onChange={(e) => setNewExam(x => ({ ...x, class_id: e.target.value }))}>
                  {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Exam Date</FormLabel>
                <Input size="sm" type="date" value={newExam.exam_date} onChange={(e) => setNewExam(x => ({ ...x, exam_date: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Max Marks</FormLabel>
                <NumberInput size="sm" value={newExam.max_marks} onChange={(v) => setNewExam(x => ({ ...x, max_marks: v }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Academic Year</FormLabel>
                <Input size="sm" placeholder="e.g. 2026-2027" value={newExam.academic_year} onChange={(e) => setNewExam(x => ({ ...x, academic_year: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={examModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateExam}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Exam Result Modal */}
      <Modal isOpen={examResultModal.isOpen} onClose={examResultModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Result</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Student</FormLabel>
                <Select size="sm" placeholder="Select student" value={newExamResult.student_id} onChange={(e) => setNewExamResult(r => ({ ...r, student_id: e.target.value }))}>
                  {students.map(s => <option key={s.student_id} value={s.student_id}>{s.first_name} {s.last_name}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Marks Obtained</FormLabel>
                <NumberInput size="sm" value={newExamResult.marks_obtained} onChange={(v) => setNewExamResult(r => ({ ...r, marks_obtained: v }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Remarks</FormLabel>
                <Input size="sm" value={newExamResult.remarks} onChange={(e) => setNewExamResult(r => ({ ...r, remarks: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={examResultModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateExamResult}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

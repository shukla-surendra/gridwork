import http from "../http-common";
import ConfigService from "../utils/config";

const base = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return `/api/v1/workspaces/${workspace_id}/school-erp`;
};

// Teachers
const getTeachers = () => http.get(`${base()}/teachers`);
const createTeacher = (data) => http.post(`${base()}/teachers`, data);
const updateTeacher = (id, data) => http.put(`${base()}/teachers/${id}`, data);
const removeTeacher = (id) => http.delete(`${base()}/teachers/${id}`);

// Classes
const getClasses = () => http.get(`${base()}/classes`);
const createClass = (data) => http.post(`${base()}/classes`, data);
const updateClass = (id, data) => http.put(`${base()}/classes/${id}`, data);
const removeClass = (id) => http.delete(`${base()}/classes/${id}`);

// Students
const getStudents = (params = {}) => http.get(`${base()}/students`, { params });
const createStudent = (data) => http.post(`${base()}/students`, data);
const updateStudent = (id, data) => http.put(`${base()}/students/${id}`, data);
const removeStudent = (id) => http.delete(`${base()}/students/${id}`);
const getFeeBalance = (studentId) => http.get(`${base()}/students/${studentId}/fee-balance`);

// Attendance
const getAttendance = (params = {}) => http.get(`${base()}/attendance`, { params });
const markAttendance = (data) => http.post(`${base()}/attendance`, data);
const bulkMarkAttendance = (data) => http.post(`${base()}/attendance/bulk`, data);
const removeAttendance = (id) => http.delete(`${base()}/attendance/${id}`);

// Fee structures
const getFeeStructures = (params = {}) => http.get(`${base()}/fee-structures`, { params });
const createFeeStructure = (data) => http.post(`${base()}/fee-structures`, data);
const removeFeeStructure = (id) => http.delete(`${base()}/fee-structures/${id}`);

// Fee payments
const getFeePayments = (params = {}) => http.get(`${base()}/fee-payments`, { params });
const createFeePayment = (data) => http.post(`${base()}/fee-payments`, data);
const removeFeePayment = (id) => http.delete(`${base()}/fee-payments/${id}`);

// Exams
const getExams = (params = {}) => http.get(`${base()}/exams`, { params });
const createExam = (data) => http.post(`${base()}/exams`, data);
const removeExam = (id) => http.delete(`${base()}/exams/${id}`);

// Exam results
const getExamResults = (params = {}) => http.get(`${base()}/exam-results`, { params });
const createExamResult = (data) => http.post(`${base()}/exam-results`, data);
const bulkCreateExamResults = (data) => http.post(`${base()}/exam-results/bulk`, data);
const removeExamResult = (id) => http.delete(`${base()}/exam-results/${id}`);

const SchoolErpService = {
  getTeachers, createTeacher, updateTeacher, removeTeacher,
  getClasses, createClass, updateClass, removeClass,
  getStudents, createStudent, updateStudent, removeStudent, getFeeBalance,
  getAttendance, markAttendance, bulkMarkAttendance, removeAttendance,
  getFeeStructures, createFeeStructure, removeFeeStructure,
  getFeePayments, createFeePayment, removeFeePayment,
  getExams, createExam, removeExam,
  getExamResults, createExamResult, bulkCreateExamResults, removeExamResult,
};

export default SchoolErpService;

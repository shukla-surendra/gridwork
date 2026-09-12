import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Heading, Text, HStack, VStack, Button, Icon, Badge, useColorModeValue,
  useDisclosure, useToast, Spinner, Center, Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, FormControl, FormLabel, Input, Select,
  Textarea, IconButton, Avatar, Checkbox, Progress, SimpleGrid, Card, CardBody,
  Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { FiPlus, FiUsers, FiTrash2, FiChevronDown, FiCheck, FiX } from 'react-icons/fi';
import Head from 'next/head';
import Navbar from '@/components/dashboard/Navbar';
import Header from '@/components/dashboard/Header';
import MemberService from '@/services/MemberService';
import ConfigService from '@/utils/config';
import {
  fetchEmployees, addEmployee, editEmployee, removeEmployee,
  fetchLeaveRequests, addLeaveRequest, reviewLeaveRequest, cancelLeaveRequest,
  fetchOnboardingTemplates, addOnboardingTemplate, removeOnboardingTemplate,
  applyOnboardingTemplate, toggleChecklistItem,
} from '@/slices/hr';

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor", "intern"];
const EMPLOYEE_STATUSES = ["active", "on_leave", "terminated"];
const LEAVE_TYPES = ["vacation", "sick", "personal", "unpaid", "other"];

const STATUS_COLOR = { active: "green", on_leave: "orange", terminated: "red" };
const LEAVE_STATUS_COLOR = { pending: "yellow", approved: "green", rejected: "red", cancelled: "gray" };

function displayName(employee) {
  if (!employee?.user) return "Unknown";
  return `${employee.user.first_name} ${employee.user.last_name}`;
}

function AddEmployeeModal({ isOpen, onClose, employees, workspaceId }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    user_id: '', job_title: '', department: '', employment_type: 'full_time',
    start_date: '', manager_id: '', vacation_days: 20, sick_days: 10,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && workspaceId) {
      MemberService.getMembers(workspaceId).then(res => setMembers(res.data || [])).catch(() => setMembers([]));
    }
  }, [isOpen, workspaceId]);

  const employeeUserIds = new Set(employees.map(e => e.user_id));
  const availableMembers = members.filter(m => !employeeUserIds.has(m.user_id));

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = () => {
    if (!form.user_id) {
      toast({ title: 'Pick a workspace member', status: 'warning', duration: 2500, isClosable: true });
      return;
    }
    setIsSaving(true);
    dispatch(addEmployee({
      user_id: form.user_id,
      job_title: form.job_title || null,
      department: form.department || null,
      employment_type: form.employment_type,
      start_date: form.start_date || null,
      manager_id: form.manager_id || null,
      leave_allocations: {
        vacation: Number(form.vacation_days) || 0,
        sick: Number(form.sick_days) || 0,
      },
    }))
      .unwrap()
      .then(() => {
        toast({ title: 'Employee added', status: 'success', duration: 2000, isClosable: true });
        onClose();
        setForm({ user_id: '', job_title: '', department: '', employment_type: 'full_time', start_date: '', manager_id: '', vacation_days: 20, sick_days: 10 });
      })
      .catch(err => toast({ title: "Couldn't add employee", description: err, status: 'error', duration: 3500, isClosable: true }))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Employee</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Workspace member</FormLabel>
              <Select name="user_id" placeholder="Select a member" value={form.user_id} onChange={handleChange}>
                {availableMembers.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>
                ))}
              </Select>
            </FormControl>
            <HStack>
              <FormControl>
                <FormLabel>Job Title</FormLabel>
                <Input name="job_title" value={form.job_title} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Department</FormLabel>
                <Input name="department" value={form.department} onChange={handleChange} />
              </FormControl>
            </HStack>
            <HStack>
              <FormControl>
                <FormLabel>Employment Type</FormLabel>
                <Select name="employment_type" value={form.employment_type} onChange={handleChange}>
                  {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Start Date</FormLabel>
                <Input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel>Manager</FormLabel>
              <Select name="manager_id" placeholder="No manager" value={form.manager_id} onChange={handleChange}>
                {employees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>{displayName(e)}</option>
                ))}
              </Select>
            </FormControl>
            <HStack>
              <FormControl>
                <FormLabel>Annual Vacation Days</FormLabel>
                <Input name="vacation_days" type="number" value={form.vacation_days} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Annual Sick Days</FormLabel>
                <Input name="sick_days" type="number" value={form.sick_days} onChange={handleChange} />
              </FormControl>
            </HStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleCreate} isLoading={isSaving}>Add</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function EditEmployeeModal({ isOpen, onClose, employee, employees }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        job_title: employee.job_title || '',
        department: employee.department || '',
        employment_type: employee.employment_type || 'full_time',
        status: employee.status || 'active',
        manager_id: employee.manager_id || '',
        vacation_days: employee.leave_allocations?.vacation ?? 20,
        sick_days: employee.leave_allocations?.sick ?? 10,
      });
    }
  }, [employee]);

  if (!employee) return null;

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = () => {
    setIsSaving(true);
    dispatch(editEmployee({
      employeeId: employee.employee_id,
      data: {
        job_title: form.job_title,
        department: form.department,
        employment_type: form.employment_type,
        status: form.status,
        manager_id: form.manager_id || "",
        leave_allocations: { vacation: Number(form.vacation_days) || 0, sick: Number(form.sick_days) || 0 },
      },
    }))
      .unwrap()
      .then(() => {
        toast({ title: 'Employee updated', status: 'success', duration: 2000, isClosable: true });
        onClose();
      })
      .catch(err => toast({ title: "Couldn't update employee", description: err, status: 'error', duration: 3500, isClosable: true }))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit {displayName(employee)}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack>
              <FormControl>
                <FormLabel>Job Title</FormLabel>
                <Input name="job_title" value={form.job_title || ''} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Department</FormLabel>
                <Input name="department" value={form.department || ''} onChange={handleChange} />
              </FormControl>
            </HStack>
            <HStack>
              <FormControl>
                <FormLabel>Employment Type</FormLabel>
                <Select name="employment_type" value={form.employment_type} onChange={handleChange}>
                  {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select name="status" value={form.status} onChange={handleChange}>
                  {EMPLOYEE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </Select>
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel>Manager</FormLabel>
              <Select name="manager_id" placeholder="No manager" value={form.manager_id || ''} onChange={handleChange}>
                {employees.filter(e => e.employee_id !== employee.employee_id).map(e => (
                  <option key={e.employee_id} value={e.employee_id}>{displayName(e)}</option>
                ))}
              </Select>
            </FormControl>
            <HStack>
              <FormControl>
                <FormLabel>Annual Vacation Days</FormLabel>
                <Input name="vacation_days" type="number" value={form.vacation_days ?? 0} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Annual Sick Days</FormLabel>
                <Input name="sick_days" type="number" value={form.sick_days ?? 0} onChange={handleChange} />
              </FormControl>
            </HStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSave} isLoading={isSaving}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function DirectoryTab({ employees, loading }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [workspaceId, setWorkspaceId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    try { setWorkspaceId(ConfigService.getDefaultWorkspace()?.workspace_id); } catch (e) { setWorkspaceId(null); }
  }, []);

  const handleDelete = (employeeId) => {
    dispatch(removeEmployee(employeeId))
      .unwrap()
      .then(() => toast({ title: 'Employee removed', status: 'success', duration: 2000, isClosable: true }))
      .catch(err => toast({ title: "Couldn't remove employee", description: err, status: 'error', duration: 3500, isClosable: true }));
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Text color="gray.500" fontSize="sm">{employees.length} employee{employees.length === 1 ? '' : 's'}</Text>
        <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" onClick={addModal.onOpen}>Add Employee</Button>
      </HStack>
      {loading ? <Center py={10}><Spinner /></Center> : (
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Job Title</Th>
              <Th>Department</Th>
              <Th>Manager</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {employees.map(e => (
              <Tr key={e.employee_id}>
                <Td>
                  <HStack>
                    <Avatar size="xs" name={displayName(e)} src={e.user?.avatar_url} />
                    <Text>{displayName(e)}</Text>
                  </HStack>
                </Td>
                <Td>{e.job_title || '-'}</Td>
                <Td>{e.department || '-'}</Td>
                <Td>{e.manager_name || '-'}</Td>
                <Td><Badge colorScheme={STATUS_COLOR[e.status] || 'gray'}>{e.status}</Badge></Td>
                <Td>
                  <HStack spacing={2}>
                    <Button size="xs" onClick={() => { setSelectedEmployee(e); editModal.onOpen(); }}>Edit</Button>
                    <IconButton size="xs" icon={<FiTrash2 />} aria-label="Remove" colorScheme="red" variant="ghost" onClick={() => handleDelete(e.employee_id)} />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <AddEmployeeModal isOpen={addModal.isOpen} onClose={addModal.onClose} employees={employees} workspaceId={workspaceId} />
      <EditEmployeeModal isOpen={editModal.isOpen} onClose={editModal.onClose} employee={selectedEmployee} employees={employees} />
    </Box>
  );
}

function OrgChartNode({ employee, childrenByManager, depth }) {
  const cardBg = useColorModeValue('white', 'gray.700');
  const children = childrenByManager[employee.employee_id] || [];
  return (
    <Box ml={`${depth * 32}px`} mb={2}>
      <Card bg={cardBg} size="sm" display="inline-block" minW="220px">
        <CardBody py={2}>
          <HStack>
            <Avatar size="xs" name={displayName(employee)} src={employee.user?.avatar_url} />
            <Box>
              <Text fontSize="sm" fontWeight="medium">{displayName(employee)}</Text>
              <Text fontSize="xs" color="gray.500">{employee.job_title || 'No title'}{employee.department ? ` · ${employee.department}` : ''}</Text>
            </Box>
          </HStack>
        </CardBody>
      </Card>
      {children.map(child => (
        <OrgChartNode key={child.employee_id} employee={child} childrenByManager={childrenByManager} depth={depth + 1} />
      ))}
    </Box>
  );
}

function OrgChartTab({ employees }) {
  const childrenByManager = useMemo(() => {
    const grouped = {};
    for (const e of employees) {
      const key = e.manager_id || 'root';
      (grouped[key] || (grouped[key] = [])).push(e);
    }
    return grouped;
  }, [employees]);

  const roots = childrenByManager.root || [];

  if (employees.length === 0) {
    return <Text color="gray.500" fontSize="sm">No employees yet -- add one in the Directory tab first.</Text>;
  }

  return (
    <Box>
      {roots.map(root => (
        <OrgChartNode key={root.employee_id} employee={root} childrenByManager={childrenByManager} depth={0} />
      ))}
    </Box>
  );
}

function RequestLeaveModal({ isOpen, onClose, employees }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [form, setForm] = useState({ employee_id: '', leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = () => {
    if (!form.employee_id || !form.start_date || !form.end_date) {
      toast({ title: 'Employee, start date, and end date are required', status: 'warning', duration: 2500, isClosable: true });
      return;
    }
    setIsSaving(true);
    dispatch(addLeaveRequest(form))
      .unwrap()
      .then(() => {
        toast({ title: 'Leave request submitted', status: 'success', duration: 2000, isClosable: true });
        onClose();
        setForm({ employee_id: '', leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
      })
      .catch(err => toast({ title: "Couldn't submit request", description: err, status: 'error', duration: 3500, isClosable: true }))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Request Leave</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Employee</FormLabel>
              <Select name="employee_id" placeholder="Select employee" value={form.employee_id} onChange={handleChange}>
                {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{displayName(e)}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Leave Type</FormLabel>
              <Select name="leave_type" value={form.leave_type} onChange={handleChange}>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormControl>
            <HStack>
              <FormControl isRequired>
                <FormLabel>Start Date</FormLabel>
                <Input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>End Date</FormLabel>
                <Input name="end_date" type="date" value={form.end_date} onChange={handleChange} />
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel>Reason (optional)</FormLabel>
              <Textarea name="reason" value={form.reason} onChange={handleChange} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={isSaving}>Submit</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function LeaveRequestsTab({ leaveRequests, employees, loading }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const requestModal = useDisclosure();

  const handleReview = (leaveRequestId, reviewStatus) => {
    dispatch(reviewLeaveRequest({ leaveRequestId, data: { status: reviewStatus } }))
      .unwrap()
      .then(() => toast({ title: `Leave ${reviewStatus}`, status: 'success', duration: 2000, isClosable: true }))
      .catch(err => toast({ title: "Couldn't review request", description: err, status: 'error', duration: 3500, isClosable: true }));
  };

  const handleCancel = (leaveRequestId) => {
    dispatch(cancelLeaveRequest(leaveRequestId))
      .unwrap()
      .then(() => toast({ title: 'Leave request cancelled', status: 'success', duration: 2000, isClosable: true }))
      .catch(err => toast({ title: "Couldn't cancel request", description: err, status: 'error', duration: 3500, isClosable: true }));
  };

  return (
    <Box>
      <HStack justify="flex-end" mb={4}>
        <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" onClick={requestModal.onOpen}>Request Leave</Button>
      </HStack>
      {loading ? <Center py={10}><Spinner /></Center> : (
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Employee</Th>
              <Th>Type</Th>
              <Th>Dates</Th>
              <Th>Days</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leaveRequests.map(l => (
              <Tr key={l.leave_request_id}>
                <Td>{l.employee_name || '-'}</Td>
                <Td>{l.leave_type}</Td>
                <Td>{l.start_date} &rarr; {l.end_date}</Td>
                <Td>{l.days}</Td>
                <Td><Badge colorScheme={LEAVE_STATUS_COLOR[l.status] || 'gray'}>{l.status}</Badge></Td>
                <Td>
                  {l.status === 'pending' && (
                    <HStack spacing={2}>
                      <IconButton size="xs" icon={<FiCheck />} colorScheme="green" aria-label="Approve" onClick={() => handleReview(l.leave_request_id, 'approved')} />
                      <IconButton size="xs" icon={<FiX />} colorScheme="red" aria-label="Reject" onClick={() => handleReview(l.leave_request_id, 'rejected')} />
                    </HStack>
                  )}
                  {(l.status === 'pending' || l.status === 'approved') && (
                    <Button size="xs" variant="ghost" ml={2} onClick={() => handleCancel(l.leave_request_id)}>Cancel</Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <RequestLeaveModal isOpen={requestModal.isOpen} onClose={requestModal.onClose} employees={employees} />
    </Box>
  );
}

function OnboardingTab({ employees, templates }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateItems, setNewTemplateItems] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const cardBg = useColorModeValue('white', 'gray.700');

  const selectedEmployee = employees.find(e => e.employee_id === selectedEmployeeId);

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    const items = newTemplateItems.split(',').map(i => i.trim()).filter(Boolean);
    dispatch(addOnboardingTemplate({ name: newTemplateName.trim(), items }))
      .unwrap()
      .then(() => {
        toast({ title: 'Template created', status: 'success', duration: 2000, isClosable: true });
        setNewTemplateName('');
        setNewTemplateItems('');
      })
      .catch(err => toast({ title: "Couldn't create template", description: err, status: 'error', duration: 3500, isClosable: true }));
  };

  const handleApply = () => {
    if (!selectedEmployeeId || !selectedTemplateId) {
      toast({ title: 'Pick an employee and a template', status: 'warning', duration: 2500, isClosable: true });
      return;
    }
    dispatch(applyOnboardingTemplate({ employeeId: selectedEmployeeId, templateId: selectedTemplateId }))
      .unwrap()
      .then(() => toast({ title: 'Checklist assigned', status: 'success', duration: 2000, isClosable: true }))
      .catch(err => toast({ title: "Couldn't apply template", description: err, status: 'error', duration: 3500, isClosable: true }));
  };

  const handleToggleItem = (itemId, done) => {
    dispatch(toggleChecklistItem({ employeeId: selectedEmployeeId, itemId, done }))
      .catch(() => toast({ title: "Couldn't update item", status: 'error', duration: 3000, isClosable: true }));
  };

  const handleDeleteTemplate = (templateId) => {
    dispatch(removeOnboardingTemplate(templateId))
      .catch(() => toast({ title: "Couldn't delete template", status: 'error', duration: 3000, isClosable: true }));
  };

  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
      <Box>
        <Text fontWeight="semibold" mb={3}>Templates</Text>
        <VStack align="stretch" spacing={2} mb={4}>
          {templates.map(t => (
            <Card key={t.template_id} bg={cardBg}>
              <CardBody py={2}>
                <HStack justify="space-between">
                  <Box>
                    <Text fontWeight="medium" fontSize="sm">{t.name}</Text>
                    <Text fontSize="xs" color="gray.500">{(t.items || []).join(', ')}</Text>
                  </Box>
                  <IconButton size="xs" icon={<FiTrash2 />} variant="ghost" colorScheme="red" aria-label="Delete template" onClick={() => handleDeleteTemplate(t.template_id)} />
                </HStack>
              </CardBody>
            </Card>
          ))}
          {templates.length === 0 && <Text fontSize="sm" color="gray.500">No templates yet.</Text>}
        </VStack>
        <VStack align="stretch" spacing={2} p={3} borderWidth="1px" borderRadius="md">
          <Text fontSize="sm" fontWeight="medium">New Template</Text>
          <Input placeholder="Template name" size="sm" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} />
          <Textarea placeholder="Items, comma-separated (e.g. Set up laptop, Sign NDA)" size="sm" value={newTemplateItems} onChange={e => setNewTemplateItems(e.target.value)} />
          <Button size="sm" colorScheme="blue" onClick={handleCreateTemplate}>Create Template</Button>
        </VStack>
      </Box>

      <Box>
        <Text fontWeight="semibold" mb={3}>Employee Checklist</Text>
        <VStack align="stretch" spacing={3} mb={4}>
          <Select placeholder="Select employee" size="sm" value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)}>
            {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{displayName(e)}</option>)}
          </Select>
          <HStack>
            <Select placeholder="Select template to apply" size="sm" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
              {templates.map(t => <option key={t.template_id} value={t.template_id}>{t.name}</option>)}
            </Select>
            <Button size="sm" onClick={handleApply} flexShrink={0}>Apply</Button>
          </HStack>
        </VStack>
        {selectedEmployee && (
          <Box>
            {selectedEmployee.onboarding_checklist?.length > 0 ? (
              <>
                <Progress
                  size="xs" borderRadius="full" colorScheme="green" mb={2}
                  value={(selectedEmployee.onboarding_checklist.filter(i => i.done).length / selectedEmployee.onboarding_checklist.length) * 100}
                />
                <VStack align="stretch" spacing={1}>
                  {selectedEmployee.onboarding_checklist.map(item => (
                    <Checkbox key={item.id} isChecked={item.done} onChange={e => handleToggleItem(item.id, e.target.checked)}>
                      <Text fontSize="sm" textDecoration={item.done ? 'line-through' : 'none'} color={item.done ? 'gray.500' : undefined}>
                        {item.text}
                      </Text>
                    </Checkbox>
                  ))}
                </VStack>
              </>
            ) : (
              <Text fontSize="sm" color="gray.500">No checklist assigned yet.</Text>
            )}
          </Box>
        )}
      </Box>
    </SimpleGrid>
  );
}

export default function HrPage() {
  const dispatch = useDispatch();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const { employees, leaveRequests, onboardingTemplates, loading } = useSelector(state => state.hr);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchLeaveRequests());
    dispatch(fetchOnboardingTemplates());
  }, [dispatch]);

  return (
    <>
      <Head>
        <title>HR - GridWork</title>
        <meta name="description" content="Employee directory, leave requests, onboarding, and org chart" />
      </Head>
      <Box minH="100vh" bg={bgColor}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
            <HStack mb={4}>
              <Icon as={FiUsers} color="teal.500" />
              <Heading size="lg">HR</Heading>
            </HStack>
            <Tabs colorScheme="teal">
              <TabList>
                <Tab>Directory</Tab>
                <Tab>Org Chart</Tab>
                <Tab>Leave Requests</Tab>
                <Tab>Onboarding</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <DirectoryTab employees={employees} loading={loading} />
                </TabPanel>
                <TabPanel px={0}>
                  <OrgChartTab employees={employees} />
                </TabPanel>
                <TabPanel px={0}>
                  <LeaveRequestsTab leaveRequests={leaveRequests} employees={employees} loading={loading} />
                </TabPanel>
                <TabPanel px={0}>
                  <OnboardingTab employees={employees} templates={onboardingTemplates} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </Box>
      </Box>
    </>
  );
}

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import HrService from "../services/HrService";

export const fetchEmployees = createAsyncThunk(
  "hr/fetchEmployees",
  async (_, { rejectWithValue }) => {
    try {
      const res = await HrService.getEmployees();
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load employees");
    }
  }
);

export const addEmployee = createAsyncThunk(
  "hr/addEmployee",
  async (data, { rejectWithValue }) => {
    try {
      const res = await HrService.createEmployee(data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to add employee");
    }
  }
);

export const editEmployee = createAsyncThunk(
  "hr/editEmployee",
  async ({ employeeId, data }, { rejectWithValue }) => {
    try {
      const res = await HrService.updateEmployee(employeeId, data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update employee");
    }
  }
);

export const removeEmployee = createAsyncThunk(
  "hr/removeEmployee",
  async (employeeId, { rejectWithValue }) => {
    try {
      await HrService.removeEmployee(employeeId);
      return employeeId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to remove employee");
    }
  }
);

export const fetchLeaveRequests = createAsyncThunk(
  "hr/fetchLeaveRequests",
  async (params, { rejectWithValue }) => {
    try {
      const res = await HrService.getLeaveRequests(params);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load leave requests");
    }
  }
);

export const addLeaveRequest = createAsyncThunk(
  "hr/addLeaveRequest",
  async (data, { rejectWithValue }) => {
    try {
      const res = await HrService.createLeaveRequest(data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to submit leave request");
    }
  }
);

export const reviewLeaveRequest = createAsyncThunk(
  "hr/reviewLeaveRequest",
  async ({ leaveRequestId, data }, { rejectWithValue }) => {
    try {
      const res = await HrService.reviewLeaveRequest(leaveRequestId, data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to review leave request");
    }
  }
);

export const cancelLeaveRequest = createAsyncThunk(
  "hr/cancelLeaveRequest",
  async (leaveRequestId, { rejectWithValue }) => {
    try {
      await HrService.cancelLeaveRequest(leaveRequestId);
      return leaveRequestId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to cancel leave request");
    }
  }
);

export const fetchOnboardingTemplates = createAsyncThunk(
  "hr/fetchOnboardingTemplates",
  async (_, { rejectWithValue }) => {
    try {
      const res = await HrService.getOnboardingTemplates();
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to load onboarding templates");
    }
  }
);

export const addOnboardingTemplate = createAsyncThunk(
  "hr/addOnboardingTemplate",
  async (data, { rejectWithValue }) => {
    try {
      const res = await HrService.createOnboardingTemplate(data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to create template");
    }
  }
);

export const removeOnboardingTemplate = createAsyncThunk(
  "hr/removeOnboardingTemplate",
  async (templateId, { rejectWithValue }) => {
    try {
      await HrService.removeOnboardingTemplate(templateId);
      return templateId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to delete template");
    }
  }
);

export const applyOnboardingTemplate = createAsyncThunk(
  "hr/applyOnboardingTemplate",
  async ({ employeeId, templateId }, { rejectWithValue }) => {
    try {
      const res = await HrService.applyOnboardingTemplate(employeeId, templateId);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to apply template");
    }
  }
);

export const toggleChecklistItem = createAsyncThunk(
  "hr/toggleChecklistItem",
  async ({ employeeId, itemId, done }, { rejectWithValue }) => {
    try {
      const res = await HrService.toggleChecklistItem(employeeId, itemId, done);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update checklist item");
    }
  }
);

const initialState = {
  employees: [],
  leaveRequests: [],
  onboardingTemplates: [],
  loading: false,
  error: null,
};

const upsertEmployee = (state, employee) => {
  const index = state.employees.findIndex(e => e.employee_id === employee.employee_id);
  if (index !== -1) state.employees[index] = employee;
  else state.employees.push(employee);
};

const hrSlice = createSlice({
  name: "hr",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchEmployees.fulfilled, (state, action) => { state.loading = false; state.employees = action.payload; })
      .addCase(fetchEmployees.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(addEmployee.fulfilled, (state, action) => { state.employees.push(action.payload); })
      .addCase(editEmployee.fulfilled, (state, action) => upsertEmployee(state, action.payload))
      .addCase(removeEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.filter(e => e.employee_id !== action.payload);
      })
      .addCase(applyOnboardingTemplate.fulfilled, (state, action) => upsertEmployee(state, action.payload))
      .addCase(toggleChecklistItem.fulfilled, (state, action) => upsertEmployee(state, action.payload))

      .addCase(fetchLeaveRequests.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLeaveRequests.fulfilled, (state, action) => { state.loading = false; state.leaveRequests = action.payload; })
      .addCase(fetchLeaveRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(addLeaveRequest.fulfilled, (state, action) => { state.leaveRequests.unshift(action.payload); })
      .addCase(reviewLeaveRequest.fulfilled, (state, action) => {
        const index = state.leaveRequests.findIndex(l => l.leave_request_id === action.payload.leave_request_id);
        if (index !== -1) state.leaveRequests[index] = action.payload;
      })
      .addCase(cancelLeaveRequest.fulfilled, (state, action) => {
        state.leaveRequests = state.leaveRequests.filter(l => l.leave_request_id !== action.payload);
      })

      .addCase(fetchOnboardingTemplates.fulfilled, (state, action) => { state.onboardingTemplates = action.payload; })
      .addCase(addOnboardingTemplate.fulfilled, (state, action) => { state.onboardingTemplates.push(action.payload); })
      .addCase(removeOnboardingTemplate.fulfilled, (state, action) => {
        state.onboardingTemplates = state.onboardingTemplates.filter(t => t.template_id !== action.payload);
      });
  },
});

export default hrSlice.reducer;

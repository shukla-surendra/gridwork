import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getLeads, createLead, updateLead, deleteLead, convertLead } from '../../services/crmService';

export const fetchLeads = createAsyncThunk(
    'leads/fetchLeads',
    async (workspaceId) => {
        const response = await getLeads(workspaceId);
        return response;
    }
);

export const addLead = createAsyncThunk(
    'leads/addLead',
    async ({ workspaceId, leadData }) => {
        const response = await createLead(workspaceId, leadData);
        return response;
    }
);

export const editLead = createAsyncThunk(
    'leads/editLead',
    async ({ workspaceId, leadId, leadData }) => {
        const response = await updateLead(workspaceId, leadId, leadData);
        return response;
    }
);

export const removeLead = createAsyncThunk(
    'leads/removeLead',
    async ({ workspaceId, leadId }) => {
        await deleteLead(workspaceId, leadId);
        return leadId;
    }
);

// Fulfilled payload is a LeadConversionResult ({lead, contact, company,
// deal}), not just a Lead -- convertLead.fulfilled below updates the
// leads list from .lead, and the calling component (ConvertLeadModal)
// reads .contact/.company/.deal itself to show what conversion created.
export const convertLeadThunk = createAsyncThunk(
    'leads/convertLead',
    async ({ workspaceId, leadId, conversionData }) => {
        const response = await convertLead(workspaceId, leadId, conversionData);
        return response;
    }
);

const leadsSlice = createSlice({
    name: 'leads',
    initialState: {
        leads: [],
        loading: false,
        error: null
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchLeads.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchLeads.fulfilled, (state, action) => {
                state.loading = false;
                state.leads = action.payload;
            })
            .addCase(fetchLeads.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(addLead.fulfilled, (state, action) => {
                state.leads.unshift(action.payload);
            })
            .addCase(editLead.fulfilled, (state, action) => {
                const index = state.leads.findIndex(l => l.lead_id === action.payload.lead_id);
                if (index !== -1) {
                    state.leads[index] = action.payload;
                }
            })
            .addCase(removeLead.fulfilled, (state, action) => {
                state.leads = state.leads.filter(l => l.lead_id !== action.payload);
            })
            .addCase(convertLeadThunk.fulfilled, (state, action) => {
                const index = state.leads.findIndex(l => l.lead_id === action.payload.lead.lead_id);
                if (index !== -1) {
                    state.leads[index] = action.payload.lead;
                }
            });
    }
});

export default leadsSlice.reducer;

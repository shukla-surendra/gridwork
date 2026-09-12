import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../../services/crmService';

export const fetchCompanies = createAsyncThunk(
    'companies/fetchCompanies',
    async (workspaceId) => {
        const response = await getCompanies(workspaceId);
        return response;
    }
);

export const addCompany = createAsyncThunk(
    'companies/addCompany',
    async ({ workspaceId, companyData }) => {
        const response = await createCompany(workspaceId, companyData);
        return response;
    }
);

export const editCompany = createAsyncThunk(
    'companies/editCompany',
    async ({ workspaceId, companyId, companyData }) => {
        const response = await updateCompany(workspaceId, companyId, companyData);
        return response;
    }
);

export const removeCompany = createAsyncThunk(
    'companies/removeCompany',
    async ({ workspaceId, companyId }) => {
        await deleteCompany(workspaceId, companyId);
        return companyId;
    }
);

const companiesSlice = createSlice({
    name: 'companies',
    initialState: {
        companies: [],
        loading: false,
        error: null
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCompanies.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCompanies.fulfilled, (state, action) => {
                state.loading = false;
                state.companies = action.payload;
            })
            .addCase(fetchCompanies.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(addCompany.fulfilled, (state, action) => {
                state.companies.push(action.payload);
            })
            .addCase(editCompany.fulfilled, (state, action) => {
                const index = state.companies.findIndex(c => c.company_id === action.payload.company_id);
                if (index !== -1) {
                    state.companies[index] = action.payload;
                }
            })
            .addCase(removeCompany.fulfilled, (state, action) => {
                state.companies = state.companies.filter(c => c.company_id !== action.payload);
            });
    }
});

export default companiesSlice.reducer;

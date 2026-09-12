import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDeals, createDeal, updateDeal, deleteDeal } from '../../services/crmService';

export const fetchDeals = createAsyncThunk(
    'deals/fetchDeals',
    async (workspaceId) => {
        const response = await getDeals(workspaceId);
        return response;
    }
);

export const addDeal = createAsyncThunk(
    'deals/addDeal',
    async ({ workspaceId, dealData }) => {
        const response = await createDeal(workspaceId, dealData);
        return response;
    }
);

export const editDeal = createAsyncThunk(
    'deals/editDeal',
    async ({ workspaceId, dealId, dealData }) => {
        const response = await updateDeal(workspaceId, dealId, dealData);
        return response;
    }
);

export const removeDeal = createAsyncThunk(
    'deals/removeDeal',
    async ({ workspaceId, dealId }) => {
        await deleteDeal(workspaceId, dealId);
        return dealId;
    }
);

const dealsSlice = createSlice({
    name: 'deals',
    initialState: {
        deals: [],
        loading: false,
        error: null
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDeals.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDeals.fulfilled, (state, action) => {
                state.loading = false;
                state.deals = action.payload;
            })
            .addCase(fetchDeals.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(addDeal.fulfilled, (state, action) => {
                state.deals.push(action.payload);
            })
            .addCase(editDeal.fulfilled, (state, action) => {
                const index = state.deals.findIndex(d => d.deal_id === action.payload.deal_id);
                if (index !== -1) {
                    state.deals[index] = action.payload;
                }
            })
            .addCase(removeDeal.fulfilled, (state, action) => {
                state.deals = state.deals.filter(d => d.deal_id !== action.payload);
            });
    }
});

export default dealsSlice.reducer; 
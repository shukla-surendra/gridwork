import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    createContactActivity, createDealActivity,
    updateContactActivity, updateDealActivity,
    deleteContactActivity, deleteDealActivity
} from '../../services/crmService';

// Every thunk here is scoped by entityType ('contact' | 'deal') + entityId --
// CRM activities only exist nested under a contact or a deal
// (crm_controller.py has no standalone /activities collection), so there's
// no generic "activities" endpoint to call the way the old version of this
// file assumed.
export const addActivity = createAsyncThunk(
    'activities/addActivity',
    async ({ workspaceId, entityType, entityId, activityData }, { getState }) => {
        const userId = getState().auth?.user?.user_id;
        const payload = {
            ...activityData,
            workspace_id: workspaceId,
            user_id: userId,
            ...(entityType === 'contact' ? { contact_id: entityId } : { deal_id: entityId }),
        };
        const response = entityType === 'contact'
            ? await createContactActivity(workspaceId, entityId, payload)
            : await createDealActivity(workspaceId, entityId, payload);
        return { ...response, entity_type: entityType, entity_id: entityId };
    }
);

export const editActivity = createAsyncThunk(
    'activities/editActivity',
    async ({ workspaceId, entityType, entityId, activityId, activityData }) => {
        const response = entityType === 'contact'
            ? await updateContactActivity(workspaceId, entityId, activityId, activityData)
            : await updateDealActivity(workspaceId, entityId, activityId, activityData);
        return { ...response, entity_type: entityType, entity_id: entityId };
    }
);

export const removeActivity = createAsyncThunk(
    'activities/removeActivity',
    async ({ workspaceId, entityType, entityId, activityId }) => {
        if (entityType === 'contact') {
            await deleteContactActivity(workspaceId, entityId, activityId);
        } else {
            await deleteDealActivity(workspaceId, entityId, activityId);
        }
        return activityId;
    }
);

const activitiesSlice = createSlice({
    name: 'activities',
    initialState: {
        activities: [],
        loading: false,
        error: null,
        filters: {
            type: '',
            dateRange: null,
            tags: []
        },
        sort: {
            field: 'date',
            direction: 'desc'
        }
    },
    reducers: {
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setSort: (state, action) => {
            state.sort = action.payload;
        },
        clearFilters: (state) => {
            state.filters = {
                type: '',
                dateRange: null,
                tags: []
            };
        },
        // Populated by ActivitiesPanel's own fetch (it merges contact- and
        // deal-scoped activity lists client-side, since there's no single
        // backend endpoint that returns both at once).
        setActivities: (state, action) => {
            state.activities = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(addActivity.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addActivity.fulfilled, (state, action) => {
                state.loading = false;
                state.activities.push(action.payload);
            })
            .addCase(addActivity.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(editActivity.fulfilled, (state, action) => {
                const index = state.activities.findIndex(a => a.activity_id === action.payload.activity_id);
                if (index !== -1) {
                    // Merge, not replace -- the backend response doesn't carry
                    // the client-side display fields (contact_name/deal_name/
                    // date) that ActivitiesPanel's fetch tagged onto this item.
                    state.activities[index] = { ...state.activities[index], ...action.payload };
                }
            })
            .addCase(removeActivity.fulfilled, (state, action) => {
                state.activities = state.activities.filter(a => a.activity_id !== action.payload);
            });
    }
});

export const { setFilters, setSort, clearFilters, setActivities } = activitiesSlice.actions;
export default activitiesSlice.reducer;

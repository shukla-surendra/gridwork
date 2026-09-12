import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getContacts, createContact, updateContact, deleteContact } from '../../services/crmService';

export const fetchContacts = createAsyncThunk(
    'contacts/fetchContacts',
    async (workspaceId) => {
        const response = await getContacts(workspaceId);
        return response;
    }
);

export const addContact = createAsyncThunk(
    'contacts/addContact',
    async ({ workspaceId, contactData }) => {
        const response = await createContact(workspaceId, contactData);
        return response;
    }
);

export const editContact = createAsyncThunk(
    'contacts/editContact',
    async ({ workspaceId, contactId, contactData }) => {
        const response = await updateContact(workspaceId, contactId, contactData);
        return response;
    }
);

export const removeContact = createAsyncThunk(
    'contacts/removeContact',
    async ({ workspaceId, contactId }) => {
        await deleteContact(workspaceId, contactId);
        return contactId;
    }
);

const contactsSlice = createSlice({
    name: 'contacts',
    initialState: {
        contacts: [],
        loading: false,
        error: null
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchContacts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchContacts.fulfilled, (state, action) => {
                state.loading = false;
                state.contacts = action.payload;
            })
            .addCase(fetchContacts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(addContact.fulfilled, (state, action) => {
                state.contacts.push(action.payload);
            })
            .addCase(editContact.fulfilled, (state, action) => {
                const index = state.contacts.findIndex(c => c.contact_id === action.payload.contact_id);
                if (index !== -1) {
                    state.contacts[index] = action.payload;
                }
            })
            .addCase(removeContact.fulfilled, (state, action) => {
                state.contacts = state.contacts.filter(c => c.contact_id !== action.payload);
            });
    }
});

export default contactsSlice.reducer; 
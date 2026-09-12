import http from "../http-common";

// Company APIs
export const getCompanies = async (workspaceId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/companies`);
    return response.data;
};

export const createCompany = async (workspaceId, companyData) => {
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/crm/companies`, { ...companyData, workspace_id: workspaceId });
    return response.data;
};

export const getCompanyContacts = async (workspaceId, companyId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/companies/${companyId}/contacts`);
    return response.data;
};

export const updateCompany = async (workspaceId, companyId, companyData) => {
    const response = await http.put(`/api/v1/workspaces/${workspaceId}/crm/companies/${companyId}`, companyData);
    return response.data;
};

export const deleteCompany = async (workspaceId, companyId) => {
    const response = await http.delete(`/api/v1/workspaces/${workspaceId}/crm/companies/${companyId}`);
    return response.data;
};

// Contact APIs
export const getContacts = async (workspaceId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/contacts`);
    return response.data;
};

export const createContact = async (workspaceId, contactData) => {
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/crm/contacts`, contactData);
    return response.data;
};

export const getContact = async (workspaceId, contactId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/contacts/${contactId}`);
    return response.data;
};

export const getWorkspaceContacts = async (workspaceId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/contacts`);
    return response.data;
};

export const updateContact = async (workspaceId, contactId, contactData) => {
    const response = await http.put(`/api/v1/workspaces/${workspaceId}/crm/contacts/${contactId}`, contactData);
    return response.data;
};

export const deleteContact = async (workspaceId, contactId) => {
    const response = await http.delete(`/api/v1/workspaces/${workspaceId}/crm/contacts/${contactId}`);
    return response.data;
};

// Deal APIs
export const getDeals = async (workspaceId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/deals`);
    return response.data;
};

export const createDeal = async (workspaceId, dealData) => {
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/crm/deals`, dealData);
    return response.data;
};

export const getDeal = async (workspaceId, dealId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/deals/${dealId}`);
    return response.data;
};

export const getContactDeals = async (workspaceId, contactId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/contacts/${contactId}/deals`);
    return response.data;
};

export const updateDeal = async (workspaceId, dealId, dealData) => {
    const response = await http.put(`/api/v1/workspaces/${workspaceId}/crm/deals/${dealId}`, dealData);
    return response.data;
};

export const deleteDeal = async (workspaceId, dealId) => {
    const response = await http.delete(`/api/v1/workspaces/${workspaceId}/crm/deals/${dealId}`);
    return response.data;
};

// Activity APIs
export const createContactActivity = async (workspaceId, contactId, activityData) => {
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/crm/contacts/${contactId}/activities`, activityData);
    return response.data;
};

export const getContactActivities = async (workspaceId, contactId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/contacts/${contactId}/activities`);
    return response.data;
};

export const createDealActivity = async (workspaceId, dealId, activityData) => {
    const response = await http.post(`/api/v1/workspaces/${workspaceId}/crm/deals/${dealId}/activities`, activityData);
    return response.data;
};

export const getDealActivities = async (workspaceId, dealId) => {
    const response = await http.get(`/api/v1/workspaces/${workspaceId}/crm/deals/${dealId}/activities`);
    return response.data;
};

export const updateContactActivity = async (workspaceId, contactId, activityId, activityData) => {
    const response = await http.put(
        `/api/v1/workspaces/${workspaceId}/crm/contacts/${contactId}/activities/${activityId}`,
        activityData
    );
    return response.data;
};

export const deleteContactActivity = async (workspaceId, contactId, activityId) => {
    const response = await http.delete(
        `/api/v1/workspaces/${workspaceId}/crm/contacts/${contactId}/activities/${activityId}`
    );
    return response.data;
};

export const updateDealActivity = async (workspaceId, dealId, activityId, activityData) => {
    const response = await http.put(
        `/api/v1/workspaces/${workspaceId}/crm/deals/${dealId}/activities/${activityId}`,
        activityData
    );
    return response.data;
};

export const deleteDealActivity = async (workspaceId, dealId, activityId) => {
    const response = await http.delete(
        `/api/v1/workspaces/${workspaceId}/crm/deals/${dealId}/activities/${activityId}`
    );
    return response.data;
}; 
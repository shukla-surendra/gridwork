import http from "../http-common";
import ConfigService from "../utils/config";

const base = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return `/api/v1/workspaces/${workspace_id}/billing`;
};

const getCustomers = () => http.get(`${base()}/customers`);
const createCustomer = (data) => http.post(`${base()}/customers`, data);
const updateCustomer = (id, data) => http.put(`${base()}/customers/${id}`, data);
const removeCustomer = (id) => http.delete(`${base()}/customers/${id}`);

const getItems = () => http.get(`${base()}/items`);
const createItem = (data) => http.post(`${base()}/items`, data);
const updateItem = (id, data) => http.put(`${base()}/items/${id}`, data);
const removeItem = (id) => http.delete(`${base()}/items/${id}`);

const getQuotes = (params = {}) => http.get(`${base()}/quotes`, { params });
const getQuote = (id) => http.get(`${base()}/quotes/${id}`);
const createQuote = (data) => http.post(`${base()}/quotes`, data);
const updateQuote = (id, data) => http.put(`${base()}/quotes/${id}`, data);
const removeQuote = (id) => http.delete(`${base()}/quotes/${id}`);
const sendQuote = (id) => http.post(`${base()}/quotes/${id}/send`);
const acceptQuote = (id) => http.post(`${base()}/quotes/${id}/accept`);
const declineQuote = (id) => http.post(`${base()}/quotes/${id}/decline`);
const convertQuoteToInvoice = (id) => http.post(`${base()}/quotes/${id}/convert-to-invoice`);

const getInvoices = (params = {}) => http.get(`${base()}/invoices`, { params });
const getInvoice = (id) => http.get(`${base()}/invoices/${id}`);
const createInvoice = (data) => http.post(`${base()}/invoices`, data);
const updateInvoice = (id, data) => http.put(`${base()}/invoices/${id}`, data);
const removeInvoice = (id) => http.delete(`${base()}/invoices/${id}`);
const sendInvoice = (id) => http.post(`${base()}/invoices/${id}/send`);
const voidInvoice = (id) => http.post(`${base()}/invoices/${id}/void`);

const recordPayment = (invoiceId, data) => http.post(`${base()}/invoices/${invoiceId}/payments`, data);
const getPayments = (invoiceId) => http.get(`${base()}/invoices/${invoiceId}/payments`);
const removePayment = (paymentId) => http.delete(`${base()}/payments/${paymentId}`);

const getSummary = () => http.get(`${base()}/summary`);

const BillingService = {
  getCustomers, createCustomer, updateCustomer, removeCustomer,
  getItems, createItem, updateItem, removeItem,
  getQuotes, getQuote, createQuote, updateQuote, removeQuote,
  sendQuote, acceptQuote, declineQuote, convertQuoteToInvoice,
  getInvoices, getInvoice, createInvoice, updateInvoice, removeInvoice,
  sendInvoice, voidInvoice,
  recordPayment, getPayments, removePayment,
  getSummary,
};

export default BillingService;

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Heading, Text, HStack, VStack, Badge, IconButton, Button, SimpleGrid,
  useColorModeValue, useDisclosure, Spinner, Center, useToast, Tooltip,
  Tabs, TabList, TabPanels, Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Select, NumberInput, NumberInputField, Textarea,
  Stat, StatLabel, StatNumber, Card, CardBody, Divider,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiEdit2, FiEye, FiSend, FiCheck, FiX, FiRepeat, FiDollarSign } from 'react-icons/fi';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import BillingService from '../../services/BillingService';

const todayIso = () => new Date().toISOString().slice(0, 10);

const QUOTE_STATUS_COLORS = { draft: 'gray', sent: 'blue', accepted: 'green', declined: 'red', expired: 'orange' };
const INVOICE_STATUS_COLORS = { draft: 'gray', sent: 'blue', partially_paid: 'yellow', paid: 'green', void: 'red' };

const emptyLine = () => ({ item_id: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0 });
const emptyQuoteForm = () => ({ customer_id: '', issue_date: todayIso(), expiry_date: '', notes: '', lines: [emptyLine()] });
const emptyInvoiceForm = () => ({ customer_id: '', issue_date: todayIso(), due_date: '', notes: '', lines: [emptyLine()] });
const emptyCustomerForm = { name: '', email: '', phone: '', billing_address: '', tax_id: '' };
const emptyItemForm = { name: '', description: '', unit_price: 0, tax_rate: 0 };
const emptyPaymentForm = { amount: '', payment_date: todayIso(), method: 'bank_transfer', reference: '', notes: '' };

function lineEstimatedTotal(line) {
  return round2(Number(line.quantity || 0) * Number(line.unit_price || 0) * (1 + Number(line.tax_rate || 0) / 100));
}
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function LineItemsEditor({ lines, setLines, items, readOnly, borderColor }) {
  const updateLine = (index, patch) => {
    setLines(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };
  const applyItem = (index, itemId) => {
    const item = items.find(i => i.item_id === itemId);
    if (!item) {
      updateLine(index, { item_id: '' });
      return;
    }
    updateLine(index, { item_id: itemId, description: item.name, unit_price: item.unit_price, tax_rate: item.tax_rate });
  };
  const removeLine = (index) => setLines(prev => prev.filter((_, i) => i !== index));
  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const estimatedTotal = useMemo(() => round2(lines.reduce((sum, l) => sum + lineEstimatedTotal(l), 0)), [lines]);

  return (
    <Box w="100%">
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Item</Th>
              <Th>Description</Th>
              <Th isNumeric>Qty</Th>
              <Th isNumeric>Price</Th>
              <Th isNumeric>Tax %</Th>
              <Th isNumeric>Total</Th>
              {!readOnly && <Th></Th>}
            </Tr>
          </Thead>
          <Tbody>
            {lines.map((line, index) => (
              <Tr key={index}>
                <Td minW="140px">
                  {readOnly ? (line.item_id && items.find(i => i.item_id === line.item_id)?.name) || '-' : (
                    <Select size="sm" placeholder="Custom" value={line.item_id} onChange={(e) => applyItem(index, e.target.value)}>
                      {items.map(i => <option key={i.item_id} value={i.item_id}>{i.name}</option>)}
                    </Select>
                  )}
                </Td>
                <Td minW="160px">
                  {readOnly ? line.description : (
                    <Input size="sm" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} />
                  )}
                </Td>
                <Td isNumeric minW="80px">
                  {readOnly ? line.quantity : (
                    <NumberInput size="sm" min={0} value={line.quantity} onChange={(v) => updateLine(index, { quantity: v })}>
                      <NumberInputField textAlign="right" />
                    </NumberInput>
                  )}
                </Td>
                <Td isNumeric minW="90px">
                  {readOnly ? line.unit_price.toFixed(2) : (
                    <NumberInput size="sm" min={0} value={line.unit_price} onChange={(v) => updateLine(index, { unit_price: v })}>
                      <NumberInputField textAlign="right" />
                    </NumberInput>
                  )}
                </Td>
                <Td isNumeric minW="80px">
                  {readOnly ? line.tax_rate : (
                    <NumberInput size="sm" min={0} max={100} value={line.tax_rate} onChange={(v) => updateLine(index, { tax_rate: v })}>
                      <NumberInputField textAlign="right" />
                    </NumberInput>
                  )}
                </Td>
                <Td isNumeric>{(line.line_total ?? lineEstimatedTotal(line)).toFixed(2)}</Td>
                {!readOnly && (
                  <Td>
                    <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Remove line" onClick={() => removeLine(index)} isDisabled={lines.length <= 1} />
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      {!readOnly && (
        <Button size="xs" leftIcon={<FiPlus />} variant="ghost" mt={2} onClick={addLine}>Add Line</Button>
      )}
      <HStack justify="flex-end" mt={2} pt={2} borderTop="1px solid" borderColor={borderColor}>
        <Text fontWeight="bold">Total: {estimatedTotal.toFixed(2)}</Text>
      </HStack>
    </Box>
  );
}

export default function BillingPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const toast = useToast();
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('white', 'gray.700');

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      BillingService.getCustomers(),
      BillingService.getItems(),
      BillingService.getQuotes(),
      BillingService.getInvoices(),
      BillingService.getSummary(),
    ])
      .then(([c, i, q, inv, s]) => {
        setCustomers(c.data);
        setItems(i.data);
        setQuotes(q.data);
        setInvoices(inv.data);
        setSummary(s.data);
      })
      .catch(() => toast({ title: "Couldn't load billing", status: "error", duration: 3000, isClosable: true }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // -- Customers --------------------------------------------------------------

  const customerModal = useDisclosure();
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);

  const openNewCustomer = () => { setEditingCustomer(null); setCustomerForm(emptyCustomerForm); customerModal.onOpen(); };
  const openEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({ name: customer.name, email: customer.email || '', phone: customer.phone || '', billing_address: customer.billing_address || '', tax_id: customer.tax_id || '' });
    customerModal.onOpen();
  };
  const handleSaveCustomer = async () => {
    if (!customerForm.name.trim()) return;
    try {
      if (editingCustomer) {
        await BillingService.updateCustomer(editingCustomer.customer_id, customerForm);
      } else {
        await BillingService.createCustomer(customerForm);
      }
      customerModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't save customer", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };
  const handleDeleteCustomer = async (id) => {
    try {
      await BillingService.removeCustomer(id);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete customer", status: "error", duration: 3000, isClosable: true });
    }
  };

  // -- Items ------------------------------------------------------------------

  const itemModal = useDisclosure();
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const openNewItem = () => { setEditingItem(null); setItemForm(emptyItemForm); itemModal.onOpen(); };
  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({ name: item.name, description: item.description || '', unit_price: item.unit_price, tax_rate: item.tax_rate });
    itemModal.onOpen();
  };
  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) return;
    try {
      const payload = { ...itemForm, unit_price: parseFloat(itemForm.unit_price) || 0, tax_rate: parseFloat(itemForm.tax_rate) || 0 };
      if (editingItem) {
        await BillingService.updateItem(editingItem.item_id, payload);
      } else {
        await BillingService.createItem(payload);
      }
      itemModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't save item", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };
  const handleDeleteItem = async (id) => {
    try {
      await BillingService.removeItem(id);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete item", status: "error", duration: 3000, isClosable: true });
    }
  };

  // -- Quotes -----------------------------------------------------------------

  const quoteModal = useDisclosure();
  const [editingQuote, setEditingQuote] = useState(null);
  const [quoteForm, setQuoteForm] = useState(emptyQuoteForm());
  const quoteEditable = !editingQuote || editingQuote.status === 'draft';

  const openNewQuote = () => { setEditingQuote(null); setQuoteForm(emptyQuoteForm()); quoteModal.onOpen(); };
  const openViewQuote = (quote) => {
    setEditingQuote(quote);
    setQuoteForm({
      customer_id: quote.customer_id, issue_date: quote.issue_date, expiry_date: quote.expiry_date || '', notes: quote.notes || '',
      lines: quote.lines.map(l => ({ ...l })),
    });
    quoteModal.onOpen();
  };
  const handleSaveQuote = async () => {
    if (!quoteForm.customer_id || quoteForm.lines.length === 0) return;
    const payload = {
      customer_id: quoteForm.customer_id,
      issue_date: quoteForm.issue_date,
      expiry_date: quoteForm.expiry_date || null,
      notes: quoteForm.notes,
      lines: quoteForm.lines.map(l => ({ item_id: l.item_id || null, description: l.description, quantity: parseFloat(l.quantity) || 0, unit_price: parseFloat(l.unit_price) || 0, tax_rate: parseFloat(l.tax_rate) || 0 })),
    };
    try {
      if (editingQuote) {
        await BillingService.updateQuote(editingQuote.quote_id, payload);
      } else {
        await BillingService.createQuote(payload);
      }
      quoteModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't save quote", description: error.response?.data?.detail, status: "error", duration: 4000, isClosable: true });
    }
  };
  const quoteAction = async (fn, successMsg) => {
    try {
      await fn();
      toast({ title: successMsg, status: 'success', duration: 2000, isClosable: true });
      quoteModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Action failed", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };
  const handleDeleteQuote = async (id) => {
    try {
      await BillingService.removeQuote(id);
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't delete quote", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };

  // -- Invoices ---------------------------------------------------------------

  const invoiceModal = useDisclosure();
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm());
  const [invoicePayments, setInvoicePayments] = useState([]);
  const invoiceEditable = !editingInvoice || editingInvoice.status === 'draft';

  const openNewInvoice = () => { setEditingInvoice(null); setInvoiceForm(emptyInvoiceForm()); setInvoicePayments([]); invoiceModal.onOpen(); };
  const openViewInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      customer_id: invoice.customer_id, issue_date: invoice.issue_date, due_date: invoice.due_date, notes: invoice.notes || '',
      lines: invoice.lines.map(l => ({ ...l })),
    });
    invoiceModal.onOpen();
    if (invoice.status !== 'draft') {
      BillingService.getPayments(invoice.invoice_id).then(res => setInvoicePayments(res.data)).catch(() => setInvoicePayments([]));
    } else {
      setInvoicePayments([]);
    }
  };
  const handleSaveInvoice = async () => {
    if (!invoiceForm.customer_id || invoiceForm.lines.length === 0) return;
    const payload = {
      customer_id: invoiceForm.customer_id,
      issue_date: invoiceForm.issue_date,
      due_date: invoiceForm.due_date || null,
      notes: invoiceForm.notes,
      lines: invoiceForm.lines.map(l => ({ item_id: l.item_id || null, description: l.description, quantity: parseFloat(l.quantity) || 0, unit_price: parseFloat(l.unit_price) || 0, tax_rate: parseFloat(l.tax_rate) || 0 })),
    };
    try {
      if (editingInvoice) {
        await BillingService.updateInvoice(editingInvoice.invoice_id, payload);
      } else {
        await BillingService.createInvoice(payload);
      }
      invoiceModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't save invoice", description: error.response?.data?.detail, status: "error", duration: 4000, isClosable: true });
    }
  };
  const invoiceAction = async (fn, successMsg) => {
    try {
      await fn();
      toast({ title: successMsg, status: 'success', duration: 2000, isClosable: true });
      invoiceModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Action failed", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };
  const handleDeleteInvoice = async (id) => {
    try {
      await BillingService.removeInvoice(id);
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't delete invoice", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };

  // -- Payments -----------------------------------------------------------

  const paymentModal = useDisclosure();
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const openRecordPayment = () => { setPaymentForm(emptyPaymentForm); paymentModal.onOpen(); };
  const handleRecordPayment = async () => {
    if (!editingInvoice || !paymentForm.amount) return;
    try {
      await BillingService.recordPayment(editingInvoice.invoice_id, { ...paymentForm, amount: parseFloat(paymentForm.amount) });
      paymentModal.onClose();
      const refreshed = await BillingService.getInvoice(editingInvoice.invoice_id);
      setEditingInvoice(refreshed.data);
      const payments = await BillingService.getPayments(editingInvoice.invoice_id);
      setInvoicePayments(payments.data);
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't record payment", description: error.response?.data?.detail, status: "error", duration: 3500, isClosable: true });
    }
  };
  const handleDeletePayment = async (paymentId) => {
    try {
      await BillingService.removePayment(paymentId);
      const refreshed = await BillingService.getInvoice(editingInvoice.invoice_id);
      setEditingInvoice(refreshed.data);
      const payments = await BillingService.getPayments(editingInvoice.invoice_id);
      setInvoicePayments(payments.data);
      loadAll();
    } catch {
      toast({ title: "Couldn't remove payment", status: "error", duration: 3000, isClosable: true });
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Spinner /></Center>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack mb={4}>
            <FiDollarSign size={20} />
            <Heading size="lg">Invoicing &amp; Billing</Heading>
          </HStack>

          <Tabs colorScheme="teal">
            <TabList overflowX="auto" overflowY="hidden">
              <Tab>Dashboard</Tab>
              <Tab>Quotes</Tab>
              <Tab>Invoices</Tab>
              <Tab>Customers</Tab>
              <Tab>Items</Tab>
            </TabList>
            <TabPanels>
              {/* Dashboard */}
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} spacing={4}>
                  <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                    <CardBody><Stat><StatLabel>Outstanding</StatLabel><StatNumber>{summary?.total_outstanding.toFixed(2)}</StatNumber></Stat></CardBody>
                  </Card>
                  <Card bg={cardBg} borderWidth="1px" borderColor="red.300">
                    <CardBody><Stat><StatLabel>Overdue</StatLabel><StatNumber color="red.500">{summary?.total_overdue.toFixed(2)}</StatNumber></Stat></CardBody>
                  </Card>
                  <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                    <CardBody><Stat><StatLabel>Overdue Invoices</StatLabel><StatNumber>{summary?.overdue_invoice_count}</StatNumber></Stat></CardBody>
                  </Card>
                  <Card bg={cardBg} borderWidth="1px" borderColor="green.300">
                    <CardBody><Stat><StatLabel>Revenue This Month</StatLabel><StatNumber color="green.500">{summary?.revenue_this_month.toFixed(2)}</StatNumber></Stat></CardBody>
                  </Card>
                  <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                    <CardBody><Stat><StatLabel>Quotes (Draft / Sent)</StatLabel><StatNumber>{summary?.draft_quote_count} / {summary?.sent_quote_count}</StatNumber></Stat></CardBody>
                  </Card>
                </SimpleGrid>
              </TabPanel>

              {/* Quotes */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={openNewQuote} isDisabled={customers.length === 0}>
                    New Quote
                  </Button>
                </HStack>
                {customers.length === 0 && <Text fontSize="sm" color="gray.400" mb={2}>Add a customer first.</Text>}
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Number</Th><Th>Customer</Th><Th>Issue Date</Th><Th isNumeric>Total</Th><Th>Status</Th><Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {quotes.map(q => (
                        <Tr key={q.quote_id} cursor="pointer" onClick={() => openViewQuote(q)}>
                          <Td>{q.display_number}</Td>
                          <Td>{q.customer_name}</Td>
                          <Td>{q.issue_date}</Td>
                          <Td isNumeric>{q.total.toFixed(2)}</Td>
                          <Td><Badge colorScheme={QUOTE_STATUS_COLORS[q.status]}>{q.status}</Badge></Td>
                          <Td onClick={(e) => e.stopPropagation()}>
                            <IconButton icon={<FiEye />} size="xs" variant="ghost" aria-label="View quote" onClick={() => openViewQuote(q)} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {quotes.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No quotes yet.</Text>}
                </Box>
              </TabPanel>

              {/* Invoices */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={openNewInvoice} isDisabled={customers.length === 0}>
                    New Invoice
                  </Button>
                </HStack>
                {customers.length === 0 && <Text fontSize="sm" color="gray.400" mb={2}>Add a customer first.</Text>}
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Number</Th><Th>Customer</Th><Th>Due Date</Th><Th isNumeric>Total</Th><Th isNumeric>Balance</Th><Th>Status</Th><Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {invoices.map(inv => (
                        <Tr key={inv.invoice_id} cursor="pointer" onClick={() => openViewInvoice(inv)}>
                          <Td>{inv.display_number}</Td>
                          <Td>{inv.customer_name}</Td>
                          <Td>{inv.due_date}</Td>
                          <Td isNumeric>{inv.total.toFixed(2)}</Td>
                          <Td isNumeric>{inv.balance_due.toFixed(2)}</Td>
                          <Td>
                            <Badge colorScheme={inv.is_overdue ? 'red' : INVOICE_STATUS_COLORS[inv.status]}>
                              {inv.is_overdue ? 'overdue' : inv.status}
                            </Badge>
                          </Td>
                          <Td onClick={(e) => e.stopPropagation()}>
                            <IconButton icon={<FiEye />} size="xs" variant="ghost" aria-label="View invoice" onClick={() => openViewInvoice(inv)} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {invoices.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No invoices yet.</Text>}
                </Box>
              </TabPanel>

              {/* Customers */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={openNewCustomer}>New Customer</Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Tax ID</Th><Th></Th></Tr></Thead>
                    <Tbody>
                      {customers.map(c => (
                        <Tr key={c.customer_id}>
                          <Td>{c.name}</Td>
                          <Td>{c.email || '-'}</Td>
                          <Td>{c.phone || '-'}</Td>
                          <Td>{c.tax_id || '-'}</Td>
                          <Td>
                            <HStack spacing={1}>
                              <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" aria-label="Edit customer" onClick={() => openEditCustomer(c)} />
                              <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete customer" onClick={() => handleDeleteCustomer(c.customer_id)} />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {customers.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No customers yet.</Text>}
                </Box>
              </TabPanel>

              {/* Items */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={openNewItem}>New Item</Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead><Tr><Th>Name</Th><Th isNumeric>Price</Th><Th isNumeric>Tax %</Th><Th></Th></Tr></Thead>
                    <Tbody>
                      {items.map(i => (
                        <Tr key={i.item_id}>
                          <Td>{i.name}</Td>
                          <Td isNumeric>{i.unit_price.toFixed(2)}</Td>
                          <Td isNumeric>{i.tax_rate}</Td>
                          <Td>
                            <HStack spacing={1}>
                              <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" aria-label="Edit item" onClick={() => openEditItem(i)} />
                              <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete item" onClick={() => handleDeleteItem(i.item_id)} />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {items.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No items yet.</Text>}
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Box>

      {/* Customer Modal */}
      <Modal isOpen={customerModal.isOpen} onClose={customerModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCustomer ? 'Edit Customer' : 'New Customer'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired><FormLabel fontSize="sm">Name</FormLabel><Input size="sm" value={customerForm.name} onChange={(e) => setCustomerForm(f => ({ ...f, name: e.target.value }))} /></FormControl>
              <FormControl><FormLabel fontSize="sm">Email</FormLabel><Input size="sm" type="email" value={customerForm.email} onChange={(e) => setCustomerForm(f => ({ ...f, email: e.target.value }))} /></FormControl>
              <FormControl><FormLabel fontSize="sm">Phone</FormLabel><Input size="sm" value={customerForm.phone} onChange={(e) => setCustomerForm(f => ({ ...f, phone: e.target.value }))} /></FormControl>
              <FormControl><FormLabel fontSize="sm">Billing Address</FormLabel><Textarea size="sm" value={customerForm.billing_address} onChange={(e) => setCustomerForm(f => ({ ...f, billing_address: e.target.value }))} /></FormControl>
              <FormControl><FormLabel fontSize="sm">Tax ID</FormLabel><Input size="sm" value={customerForm.tax_id} onChange={(e) => setCustomerForm(f => ({ ...f, tax_id: e.target.value }))} /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={customerModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSaveCustomer}>{editingCustomer ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Item Modal */}
      <Modal isOpen={itemModal.isOpen} onClose={itemModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingItem ? 'Edit Item' : 'New Item'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired><FormLabel fontSize="sm">Name</FormLabel><Input size="sm" value={itemForm.name} onChange={(e) => setItemForm(f => ({ ...f, name: e.target.value }))} /></FormControl>
              <FormControl><FormLabel fontSize="sm">Description</FormLabel><Textarea size="sm" value={itemForm.description} onChange={(e) => setItemForm(f => ({ ...f, description: e.target.value }))} /></FormControl>
              <HStack w="100%">
                <FormControl><FormLabel fontSize="sm">Unit Price</FormLabel><NumberInput size="sm" min={0} value={itemForm.unit_price} onChange={(v) => setItemForm(f => ({ ...f, unit_price: v }))}><NumberInputField /></NumberInput></FormControl>
                <FormControl><FormLabel fontSize="sm">Tax Rate %</FormLabel><NumberInput size="sm" min={0} max={100} value={itemForm.tax_rate} onChange={(v) => setItemForm(f => ({ ...f, tax_rate: v }))}><NumberInputField /></NumberInput></FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={itemModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSaveItem}>{editingItem ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Quote Modal */}
      <Modal isOpen={quoteModal.isOpen} onClose={quoteModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingQuote ? `${editingQuote.display_number}` : 'New Quote'}
            {editingQuote && <Badge ml={2} colorScheme={QUOTE_STATUS_COLORS[editingQuote.status]}>{editingQuote.status}</Badge>}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <HStack w="100%">
                <FormControl isRequired isDisabled={!quoteEditable}>
                  <FormLabel fontSize="sm">Customer</FormLabel>
                  <Select size="sm" placeholder="Select customer" value={quoteForm.customer_id} onChange={(e) => setQuoteForm(f => ({ ...f, customer_id: e.target.value }))}>
                    {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name}</option>)}
                  </Select>
                </FormControl>
              </HStack>
              <HStack w="100%">
                <FormControl isDisabled={!quoteEditable}><FormLabel fontSize="sm">Issue Date</FormLabel><Input size="sm" type="date" value={quoteForm.issue_date} onChange={(e) => setQuoteForm(f => ({ ...f, issue_date: e.target.value }))} /></FormControl>
                <FormControl isDisabled={!quoteEditable}><FormLabel fontSize="sm">Expiry Date</FormLabel><Input size="sm" type="date" value={quoteForm.expiry_date} onChange={(e) => setQuoteForm(f => ({ ...f, expiry_date: e.target.value }))} /></FormControl>
              </HStack>
              <FormControl isDisabled={!quoteEditable}><FormLabel fontSize="sm">Notes</FormLabel><Textarea size="sm" value={quoteForm.notes} onChange={(e) => setQuoteForm(f => ({ ...f, notes: e.target.value }))} /></FormControl>
              <Divider />
              <LineItemsEditor lines={quoteForm.lines} setLines={(fn) => setQuoteForm(f => ({ ...f, lines: typeof fn === 'function' ? fn(f.lines) : fn }))} items={items} readOnly={!quoteEditable} borderColor={borderColor} />
            </VStack>
          </ModalBody>
          <ModalFooter flexWrap="wrap" gap={2}>
            {!editingQuote && <Button colorScheme="teal" onClick={handleSaveQuote}>Create Quote</Button>}
            {editingQuote && editingQuote.status === 'draft' && (
              <>
                <Button colorScheme="teal" onClick={handleSaveQuote}>Save</Button>
                <Button leftIcon={<FiSend />} onClick={() => quoteAction(() => BillingService.sendQuote(editingQuote.quote_id), 'Quote sent')}>Send</Button>
                <Button leftIcon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { handleDeleteQuote(editingQuote.quote_id); quoteModal.onClose(); }}>Delete</Button>
              </>
            )}
            {editingQuote && editingQuote.status === 'sent' && (
              <>
                <Button leftIcon={<FiCheck />} colorScheme="green" onClick={() => quoteAction(() => BillingService.acceptQuote(editingQuote.quote_id), 'Quote accepted')}>Accept</Button>
                <Button leftIcon={<FiX />} colorScheme="red" variant="outline" onClick={() => quoteAction(() => BillingService.declineQuote(editingQuote.quote_id), 'Quote declined')}>Decline</Button>
              </>
            )}
            {editingQuote && editingQuote.status === 'accepted' && (
              <Button leftIcon={<FiRepeat />} colorScheme="teal" onClick={() => quoteAction(() => BillingService.convertQuoteToInvoice(editingQuote.quote_id), 'Converted to invoice')}>
                Convert to Invoice
              </Button>
            )}
            <Button variant="ghost" onClick={quoteModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Invoice Modal */}
      <Modal isOpen={invoiceModal.isOpen} onClose={invoiceModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingInvoice ? `${editingInvoice.display_number}` : 'New Invoice'}
            {editingInvoice && <Badge ml={2} colorScheme={editingInvoice.is_overdue ? 'red' : INVOICE_STATUS_COLORS[editingInvoice.status]}>{editingInvoice.is_overdue ? 'overdue' : editingInvoice.status}</Badge>}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <FormControl isRequired isDisabled={!invoiceEditable}>
                <FormLabel fontSize="sm">Customer</FormLabel>
                <Select size="sm" placeholder="Select customer" value={invoiceForm.customer_id} onChange={(e) => setInvoiceForm(f => ({ ...f, customer_id: e.target.value }))}>
                  {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name}</option>)}
                </Select>
              </FormControl>
              <HStack w="100%">
                <FormControl isDisabled={!invoiceEditable}><FormLabel fontSize="sm">Issue Date</FormLabel><Input size="sm" type="date" value={invoiceForm.issue_date} onChange={(e) => setInvoiceForm(f => ({ ...f, issue_date: e.target.value }))} /></FormControl>
                <FormControl isDisabled={!invoiceEditable}><FormLabel fontSize="sm">Due Date</FormLabel><Input size="sm" type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))} /></FormControl>
              </HStack>
              <FormControl isDisabled={!invoiceEditable}><FormLabel fontSize="sm">Notes</FormLabel><Textarea size="sm" value={invoiceForm.notes} onChange={(e) => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} /></FormControl>
              <Divider />
              <LineItemsEditor lines={invoiceForm.lines} setLines={(fn) => setInvoiceForm(f => ({ ...f, lines: typeof fn === 'function' ? fn(f.lines) : fn }))} items={items} readOnly={!invoiceEditable} borderColor={borderColor} />

              {editingInvoice && editingInvoice.status !== 'draft' && (
                <>
                  <Divider />
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Payments (paid {editingInvoice.amount_paid.toFixed(2)} / balance {editingInvoice.balance_due.toFixed(2)})</Text>
                    {editingInvoice.status !== 'void' && editingInvoice.balance_due > 0 && (
                      <Button size="xs" leftIcon={<FiPlus />} onClick={openRecordPayment}>Record Payment</Button>
                    )}
                  </HStack>
                  <Table size="sm">
                    <Thead><Tr><Th>Date</Th><Th>Method</Th><Th isNumeric>Amount</Th><Th>Reference</Th><Th></Th></Tr></Thead>
                    <Tbody>
                      {invoicePayments.map(p => (
                        <Tr key={p.payment_id}>
                          <Td>{p.payment_date}</Td>
                          <Td>{p.method}</Td>
                          <Td isNumeric>{p.amount.toFixed(2)}</Td>
                          <Td>{p.reference || '-'}</Td>
                          <Td><IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Remove payment" onClick={() => handleDeletePayment(p.payment_id)} /></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {invoicePayments.length === 0 && <Text fontSize="sm" color="gray.400">No payments recorded yet.</Text>}
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter flexWrap="wrap" gap={2}>
            {!editingInvoice && <Button colorScheme="teal" onClick={handleSaveInvoice}>Create Invoice</Button>}
            {editingInvoice && editingInvoice.status === 'draft' && (
              <>
                <Button colorScheme="teal" onClick={handleSaveInvoice}>Save</Button>
                <Button leftIcon={<FiSend />} onClick={() => invoiceAction(() => BillingService.sendInvoice(editingInvoice.invoice_id), 'Invoice sent')}>Send</Button>
                <Button leftIcon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { handleDeleteInvoice(editingInvoice.invoice_id); invoiceModal.onClose(); }}>Delete</Button>
              </>
            )}
            {editingInvoice && !['draft', 'void'].includes(editingInvoice.status) && (
              <Button leftIcon={<FiX />} colorScheme="red" variant="outline" onClick={() => invoiceAction(() => BillingService.voidInvoice(editingInvoice.invoice_id), 'Invoice voided')}>Void</Button>
            )}
            <Button variant="ghost" onClick={invoiceModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={paymentModal.isOpen} onClose={paymentModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Amount</FormLabel>
                <NumberInput size="sm" min={0} value={paymentForm.amount} onChange={(v) => setPaymentForm(f => ({ ...f, amount: v }))}><NumberInputField /></NumberInput>
              </FormControl>
              <FormControl><FormLabel fontSize="sm">Date</FormLabel><Input size="sm" type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} /></FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Method</FormLabel>
                <Select size="sm" value={paymentForm.method} onChange={(e) => setPaymentForm(f => ({ ...f, method: e.target.value }))}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
              <FormControl><FormLabel fontSize="sm">Reference</FormLabel><Input size="sm" placeholder="e.g. txn id" value={paymentForm.reference} onChange={(e) => setPaymentForm(f => ({ ...f, reference: e.target.value }))} /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={paymentModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleRecordPayment} isDisabled={!paymentForm.amount}>Record</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

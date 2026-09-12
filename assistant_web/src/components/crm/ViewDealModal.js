import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    Text,
    Badge,
    VStack,
    HStack,
    Divider,
    Box,
    Spinner,
    useToast
} from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { editDeal } from '../../slices/crm/dealsSlice';
import { selectIsModuleEnabled } from '../../slices/modules';
import BillingService from '../../services/BillingService';

const QUOTE_STATUS_COLORS = { draft: 'gray', sent: 'blue', accepted: 'green', declined: 'red', expired: 'orange' };

const ViewDealModal = ({ isOpen, onClose, deal, workspaceId }) => {
    const dispatch = useDispatch();
    const toast = useToast();
    const billingEnabled = useSelector((state) => selectIsModuleEnabled(state, 'billing'));

    const [quoteId, setQuoteId] = useState(deal?.quote_id || null);
    const [quote, setQuote] = useState(null);
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [creatingQuote, setCreatingQuote] = useState(false);

    useEffect(() => {
        setQuoteId(deal?.quote_id || null);
        setQuote(null);
    }, [deal]);

    const loadQuote = useCallback(async (id) => {
        setLoadingQuote(true);
        try {
            const res = await BillingService.getQuote(id);
            setQuote(res.data);
        } catch {
            setQuote(null);
        } finally {
            setLoadingQuote(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && quoteId && billingEnabled) {
            loadQuote(quoteId);
        }
    }, [isOpen, quoteId, billingEnabled, loadQuote]);

    const handleCreateQuote = async () => {
        setCreatingQuote(true);
        try {
            const contact = deal.contact;
            const customerName = contact ? `${contact.first_name} ${contact.last_name}` : deal.title;

            // Find-or-create a Billing Customer for this deal's contact --
            // Billing keeps its own Customer list (it must work standalone
            // even when CRM is disabled), so the two aren't the same record.
            const existing = await BillingService.getCustomers();
            let customer = contact?.email
                ? existing.data.find(c => c.email && c.email.toLowerCase() === contact.email.toLowerCase())
                : null;
            if (!customer) {
                const created = await BillingService.createCustomer({
                    name: customerName,
                    email: contact?.email || null,
                    phone: contact?.phone || null,
                });
                customer = created.data;
            }

            const newQuote = await BillingService.createQuote({
                customer_id: customer.customer_id,
                lines: [{ description: deal.title, quantity: 1, unit_price: deal.value || 0, tax_rate: 0 }],
            });

            await dispatch(editDeal({ workspaceId, dealId: deal.deal_id, dealData: { quote_id: newQuote.data.quote_id } })).unwrap();

            setQuoteId(newQuote.data.quote_id);
            setQuote(newQuote.data);
            toast({ title: `Quote ${newQuote.data.display_number} created`, status: 'success', duration: 3000, isClosable: true });
        } catch (error) {
            toast({ title: "Couldn't create quote", description: error.response?.data?.detail || error.message, status: 'error', duration: 4000, isClosable: true });
        } finally {
            setCreatingQuote(false);
        }
    };

    if (!deal) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Deal Details</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <Box>
                            <Text fontWeight="bold" fontSize="lg">{deal.title}</Text>
                            {deal.contact?.company && <Text color="gray.600">{deal.contact.company}</Text>}
                        </Box>

                        <Divider />

                        <Box>
                            <Text fontWeight="bold">Value</Text>
                            <Text>${deal.value?.toLocaleString() || '0'}</Text>
                        </Box>

                        <Box>
                            <Text fontWeight="bold">Stage</Text>
                            <Badge colorScheme={deal.stage === 'won' ? 'green' : deal.stage === 'lost' ? 'red' : 'blue'}>
                                {deal.stage}
                            </Badge>
                        </Box>

                        <Box>
                            <Text fontWeight="bold">Status</Text>
                            <Badge colorScheme={deal.status === 'active' ? 'green' : 'gray'}>
                                {deal.status}
                            </Badge>
                        </Box>

                        {deal.description && (
                            <Box>
                                <Text fontWeight="bold">Description</Text>
                                <Text>{deal.description}</Text>
                            </Box>
                        )}

                        {deal.expected_close_date && (
                            <Box>
                                <Text fontWeight="bold">Expected Close Date</Text>
                                <Text>{new Date(deal.expected_close_date).toLocaleDateString()}</Text>
                            </Box>
                        )}

                        {deal.contact && (
                            <Box>
                                <Text fontWeight="bold">Contact</Text>
                                <Text>{deal.contact.first_name} {deal.contact.last_name}</Text>
                            </Box>
                        )}

                        <Divider />

                        <Box>
                            <Text fontWeight="bold" mb={1}>Quote</Text>
                            {!billingEnabled && (
                                <Text fontSize="sm" color="gray.500">Enable the Invoicing &amp; Billing module to create quotes for this deal.</Text>
                            )}
                            {billingEnabled && loadingQuote && <Spinner size="sm" />}
                            {billingEnabled && !loadingQuote && quoteId && quote && (
                                <HStack>
                                    <Text>{quote.display_number}</Text>
                                    <Badge colorScheme={QUOTE_STATUS_COLORS[quote.status] || 'gray'}>{quote.status}</Badge>
                                    <Text color="gray.500">${quote.total.toFixed(2)}</Text>
                                </HStack>
                            )}
                            {billingEnabled && !loadingQuote && !quoteId && (
                                <Button size="sm" colorScheme="teal" onClick={handleCreateQuote} isLoading={creatingQuote}>
                                    Create Quote
                                </Button>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" mr={3} onClick={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ViewDealModal;

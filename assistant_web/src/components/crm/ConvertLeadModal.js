import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    Checkbox,
    VStack,
    HStack,
    Text,
    Box,
    Divider,
    NumberInput,
    NumberInputField,
    useToast
} from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { convertLeadThunk } from '../../slices/crm/leadsSlice';
import { fetchCompanies } from '../../slices/crm/companiesSlice';
import { DEAL_STAGES, STAGE_LABELS } from './dealStages';

// Mirrors Zoho's "Convert Lead" dialog: a Contact is always created, and
// Company/Deal are each optional -- an existing Company can be linked
// instead of minting a new one for a lead from an org already in the CRM.
const ConvertLeadModal = ({ isOpen, onClose, lead, workspaceId }) => {
    const dispatch = useDispatch();
    const toast = useToast();
    const { companies } = useSelector((state) => state.companies || {});
    const [createCompany, setCreateCompany] = useState(true);
    const [companyId, setCompanyId] = useState('');
    const [createDeal, setCreateDeal] = useState(true);
    const [dealTitle, setDealTitle] = useState('');
    const [dealValue, setDealValue] = useState('');
    const [dealStage, setDealStage] = useState('new');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && workspaceId) {
            dispatch(fetchCompanies(workspaceId));
        }
    }, [isOpen, workspaceId, dispatch]);

    useEffect(() => {
        if (lead) {
            setCreateCompany(!!lead.company_name);
            setCompanyId('');
            setCreateDeal(true);
            setDealTitle(`${lead.first_name} ${lead.last_name} Deal`);
            setDealValue('');
            setDealStage('new');
        }
    }, [lead]);

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            const payload = {
                create_company: !companyId && createCompany,
                company_id: companyId || null,
                create_deal: createDeal,
                deal_title: createDeal ? (dealTitle || undefined) : undefined,
                deal_value: createDeal && dealValue !== '' ? parseInt(dealValue, 10) : null,
                deal_stage: createDeal ? dealStage : undefined,
            };
            const result = await dispatch(convertLeadThunk({ workspaceId, leadId: lead.lead_id, conversionData: payload })).unwrap();
            onClose();
            toast({
                title: 'Lead converted',
                description: [
                    `Contact "${result.contact.first_name} ${result.contact.last_name}" created`,
                    result.company ? `linked to company "${result.company.name}"` : null,
                    result.deal ? `deal "${result.deal.title}" opened` : null,
                ].filter(Boolean).join(', '),
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            toast({ title: 'Couldn’t convert lead', description: error.message, status: 'error', duration: 5000, isClosable: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!lead) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Convert Lead</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <Box>
                            <Text fontWeight="bold">{lead.first_name} {lead.last_name}</Text>
                            {lead.company_name && <Text color="gray.500">{lead.company_name}</Text>}
                        </Box>

                        <Divider />

                        <Box>
                            <Text fontWeight="semibold" mb={1}>Contact</Text>
                            <Text fontSize="sm" color="gray.500">Always created from this lead&rsquo;s details.</Text>
                        </Box>

                        <Divider />

                        <Box>
                            <Text fontWeight="semibold" mb={2}>Company</Text>
                            <FormControl mb={2}>
                                <Select placeholder="Link an existing company instead" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                                    {(companies || []).map((c) => (
                                        <option key={c.company_id} value={c.company_id}>{c.name}</option>
                                    ))}
                                </Select>
                            </FormControl>
                            {!companyId && (
                                <Checkbox isChecked={createCompany} onChange={(e) => setCreateCompany(e.target.checked)} isDisabled={!lead.company_name}>
                                    Create a new company{lead.company_name ? ` ("${lead.company_name}")` : ' (no company name on this lead)'}
                                </Checkbox>
                            )}
                        </Box>

                        <Divider />

                        <Box>
                            <Checkbox isChecked={createDeal} onChange={(e) => setCreateDeal(e.target.checked)} mb={createDeal ? 3 : 0}>
                                <Text fontWeight="semibold">Create a Deal</Text>
                            </Checkbox>
                            {createDeal && (
                                <VStack align="stretch" spacing={3} pl={6}>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Deal Title</FormLabel>
                                        <Input size="sm" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
                                    </FormControl>
                                    <HStack>
                                        <FormControl>
                                            <FormLabel fontSize="sm">Value</FormLabel>
                                            <NumberInput size="sm" min={0} value={dealValue} onChange={(v) => setDealValue(v)}>
                                                <NumberInputField />
                                            </NumberInput>
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel fontSize="sm">Stage</FormLabel>
                                            <Select size="sm" value={dealStage} onChange={(e) => setDealStage(e.target.value)}>
                                                {DEAL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                                            </Select>
                                        </FormControl>
                                    </HStack>
                                </VStack>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
                    <Button colorScheme="green" onClick={handleSubmit} isLoading={isSubmitting}>Convert</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ConvertLeadModal;

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    useDisclosure,
    Input,
    InputGroup,
    InputLeftElement,
    Select,
    Flex,
    Spacer,
    useToast,
    Text
} from '@chakra-ui/react';
import { SearchIcon, AddIcon } from '@chakra-ui/icons';
import { removeLead } from '../../slices/crm/leadsSlice';
import CreateLeadModal from './CreateLeadModal';
import EditLeadModal from './EditLeadModal';
import ConvertLeadModal from './ConvertLeadModal';

const STATUS_COLORS = {
    new: 'gray',
    contacted: 'blue',
    qualified: 'purple',
    unqualified: 'red',
    converted: 'green',
};

const LeadsPanel = () => {
    const dispatch = useDispatch();
    const toast = useToast();
    const { leads, loading } = useSelector((state) => state.leads);
    const { selectedWorkspace } = useSelector((state) => state.workspaces || {});
    const workspaceId = selectedWorkspace?.workspace_id;
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedLead, setSelectedLead] = useState(null);

    const createModal = useDisclosure();
    const editModal = useDisclosure();
    const convertModal = useDisclosure();

    const handleDelete = async (leadId) => {
        try {
            await dispatch(removeLead({ workspaceId, leadId })).unwrap();
            toast({ title: 'Lead deleted', status: 'success', duration: 3000, isClosable: true });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete lead', status: 'error', duration: 5000, isClosable: true });
        }
    };

    const handleEdit = (lead) => {
        setSelectedLead(lead);
        editModal.onOpen();
    };

    const handleConvert = (lead) => {
        setSelectedLead(lead);
        convertModal.onOpen();
    };

    const filteredLeads = (leads || []).filter((lead) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            lead.first_name?.toLowerCase().includes(searchLower) ||
            lead.last_name?.toLowerCase().includes(searchLower) ||
            lead.email?.toLowerCase().includes(searchLower) ||
            lead.company_name?.toLowerCase().includes(searchLower);
        const matchesStatus = !statusFilter || lead.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <Box>
            <Flex mb={4} gap={4}>
                <InputGroup maxW="360px">
                    <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </InputGroup>
                <Select maxW="200px" placeholder="All statuses" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="unqualified">Unqualified</option>
                    <option value="converted">Converted</option>
                </Select>
                <Spacer />
                <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={createModal.onOpen}>
                    New Lead
                </Button>
            </Flex>

            <Table variant="simple">
                <Thead>
                    <Tr>
                        <Th>Name</Th>
                        <Th>Company</Th>
                        <Th>Email</Th>
                        <Th>Source</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {filteredLeads.map((lead) => (
                        <Tr key={lead.lead_id}>
                            <Td>
                                <Text fontWeight="medium">{lead.first_name} {lead.last_name}</Text>
                            </Td>
                            <Td>{lead.company_name || '-'}</Td>
                            <Td>{lead.email || '-'}</Td>
                            <Td>{lead.source || '-'}</Td>
                            <Td>
                                <Badge colorScheme={STATUS_COLORS[lead.status] || 'gray'}>{lead.status}</Badge>
                            </Td>
                            <Td>
                                <Button size="sm" mr={2} onClick={() => handleEdit(lead)}>
                                    {lead.status === 'converted' ? 'View' : 'Edit'}
                                </Button>
                                {lead.status !== 'converted' && (
                                    <Button size="sm" mr={2} colorScheme="green" onClick={() => handleConvert(lead)}>
                                        Convert
                                    </Button>
                                )}
                                <Button size="sm" colorScheme="red" onClick={() => handleDelete(lead.lead_id)}>
                                    Delete
                                </Button>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
            {!loading && filteredLeads.length === 0 && (
                <Text color="gray.500" py={4} textAlign="center">No leads yet.</Text>
            )}

            <CreateLeadModal isOpen={createModal.isOpen} onClose={createModal.onClose} workspaceId={workspaceId} />

            {selectedLead && (
                <>
                    <EditLeadModal isOpen={editModal.isOpen} onClose={editModal.onClose} lead={selectedLead} workspaceId={workspaceId} />
                    <ConvertLeadModal isOpen={convertModal.isOpen} onClose={convertModal.onClose} lead={selectedLead} workspaceId={workspaceId} />
                </>
            )}
        </Box>
    );
};

export default LeadsPanel;

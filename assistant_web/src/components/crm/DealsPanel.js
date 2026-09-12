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
    Flex,
    Spacer,
    useToast,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Text,
    Progress
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { removeDeal } from '../../slices/crm/dealsSlice';
import CreateDealModal from './CreateDealModal';
import EditDealModal from './EditDealModal';
import ViewDealModal from './ViewDealModal';
import DealsPipeline from './DealsPipeline';
import { getStageColor } from './dealStages';

const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
        case 'won':
            return 'green';
        case 'lost':
            return 'red';
        case 'in progress':
            return 'blue';
        default:
            return 'gray';
    }
};

const DealsPanel = () => {
    const dispatch = useDispatch();
    const toast = useToast();
    const { deals, loading } = useSelector((state) => state.deals);
    const { selectedWorkspace } = useSelector((state) => state.workspaces || {});
    const workspaceId = selectedWorkspace?.workspace_id;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline', 'list', or 'grid'

    const {
        isOpen: isCreateOpen,
        onOpen: onCreateOpen,
        onClose: onCreateClose
    } = useDisclosure();

    const {
        isOpen: isEditOpen,
        onOpen: onEditOpen,
        onClose: onEditClose
    } = useDisclosure();

    const {
        isOpen: isViewOpen,
        onOpen: onViewOpen,
        onClose: onViewClose
    } = useDisclosure();

    const handleDelete = async (dealId) => {
        try {
            await dispatch(removeDeal({ workspaceId, dealId })).unwrap();
            toast({
                title: 'Deal deleted',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete deal',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleEdit = (deal) => {
        setSelectedDeal(deal);
        onEditOpen();
    };

    const handleView = (deal) => {
        setSelectedDeal(deal);
        onViewOpen();
    };

    const handleDealUpdated = () => {
        toast({
            title: 'Deal updated',
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
    };

    const filteredDeals = deals.filter((deal) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            (deal.name?.toLowerCase() || '').includes(searchLower) ||
            (deal.company?.toLowerCase() || '').includes(searchLower) ||
            (deal.contact_name?.toLowerCase() || '').includes(searchLower)
        );
    });

    return (
        <Box>
            <Flex mb={4} gap={4}>
                <InputGroup maxW="400px">
                    <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search deals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </InputGroup>
                <Spacer />
                <Menu>
                    <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                        View: {viewMode === 'pipeline' ? 'Pipeline' : viewMode === 'list' ? 'List' : 'Grid'}
                    </MenuButton>
                    <MenuList>
                        <MenuItem onClick={() => setViewMode('pipeline')}>Pipeline View</MenuItem>
                        <MenuItem onClick={() => setViewMode('list')}>List View</MenuItem>
                        <MenuItem onClick={() => setViewMode('grid')}>Grid View</MenuItem>
                    </MenuList>
                </Menu>
                <Button
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={onCreateOpen}
                >
                    New Deal
                </Button>
            </Flex>

            {viewMode === 'pipeline' ? (
                <DealsPipeline deals={filteredDeals} workspaceId={workspaceId} onCardClick={handleView} />
            ) : viewMode === 'list' ? (
                <Table variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Company</Th>
                            <Th>Contact</Th>
                            <Th>Value</Th>
                            <Th>Stage</Th>
                            <Th>Status</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {filteredDeals.map((deal) => (
                            <Tr key={deal.deal_id}>
                                <Td>
                                    <Text fontWeight="medium">{deal.title}</Text>
                                </Td>
                                <Td>{deal.contact?.company || '-'}</Td>
                                <Td>{deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : '-'}</Td>
                                <Td>${deal.value?.toLocaleString() || '0'}</Td>
                                <Td>
                                    <Badge colorScheme={getStageColor(deal.stage)}>
                                        {deal.stage}
                                    </Badge>
                                </Td>
                                <Td>
                                    <Badge colorScheme={getStatusColor(deal.status)}>
                                        {deal.status}
                                    </Badge>
                                </Td>
                                <Td>
                                    <Button
                                        size="sm"
                                        mr={2}
                                        onClick={() => handleView(deal)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        mr={2}
                                        onClick={() => handleEdit(deal)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        colorScheme="red"
                                        onClick={() => handleDelete(deal.deal_id)}
                                    >
                                        Delete
                                    </Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            ) : (
                <Box
                    display="grid"
                    gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
                    gap={4}
                >
                    {filteredDeals.map((deal) => (
                        <Box
                            key={deal.deal_id}
                            p={4}
                            borderWidth="1px"
                            borderRadius="lg"
                            boxShadow="sm"
                        >
                            <Text fontSize="lg" fontWeight="bold" mb={2}>
                                {deal.title}
                            </Text>
                            <Text mb={1}>Company: {deal.contact?.company || '-'}</Text>
                            <Text mb={1}>Contact: {deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : '-'}</Text>
                            <Text mb={1}>Value: ${deal.value?.toLocaleString() || '0'}</Text>
                            <Flex mb={2} gap={2}>
                                <Badge colorScheme={getStageColor(deal.stage)}>
                                    {deal.stage}
                                </Badge>
                                <Badge colorScheme={getStatusColor(deal.status)}>
                                    {deal.status}
                                </Badge>
                            </Flex>
                            <Progress
                                value={deal.probability}
                                colorScheme="blue"
                                mb={3}
                            />
                            <Flex gap={2}>
                                <Button
                                    size="sm"
                                    onClick={() => handleView(deal)}
                                >
                                    View
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleEdit(deal)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => handleDelete(deal.deal_id)}
                                >
                                    Delete
                                </Button>
                            </Flex>
                        </Box>
                    ))}
                </Box>
            )}

            <CreateDealModal
                isOpen={isCreateOpen}
                onClose={onCreateClose}
                workspaceId={workspaceId}
            />

            {selectedDeal && (
                <>
                    <EditDealModal
                        isOpen={isEditOpen}
                        onClose={onEditClose}
                        deal={selectedDeal}
                        workspaceId={workspaceId}
                        onSuccess={handleDealUpdated}
                    />
                    <ViewDealModal
                        isOpen={isViewOpen}
                        onClose={onViewClose}
                        deal={selectedDeal}
                    />
                </>
            )}
        </Box>
    );
};

export default DealsPanel; 
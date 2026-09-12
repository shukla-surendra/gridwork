import React, { useEffect, useState } from 'react';
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
    Text
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { fetchCompanies, removeCompany } from '../../slices/crm/companiesSlice';
import CreateCompanyModal from './CreateCompanyModal';
import EditCompanyModal from './EditCompanyModal';
import ViewCompanyModal from './ViewCompanyModal';

const CompaniesPanel = () => {
    const dispatch = useDispatch();
    const toast = useToast();
    const { companies } = useSelector((state) => state.companies);
    const { selectedWorkspace } = useSelector((state) => state.workspaces || {});
    const workspaceId = selectedWorkspace?.workspace_id;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

    useEffect(() => {
        if (workspaceId) {
            dispatch(fetchCompanies(workspaceId));
        }
    }, [dispatch, workspaceId]);

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

    const handleDelete = async (companyId) => {
        try {
            await dispatch(removeCompany({ workspaceId, companyId })).unwrap();
            toast({
                title: 'Company deleted',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete company',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleEdit = (company) => {
        setSelectedCompany(company);
        onEditOpen();
    };

    const handleView = (company) => {
        setSelectedCompany(company);
        onViewOpen();
    };

    const filteredCompanies = (companies || []).filter((company) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            company.name?.toLowerCase().includes(searchLower) ||
            company.industry?.toLowerCase().includes(searchLower) ||
            company.website?.toLowerCase().includes(searchLower)
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
                        placeholder="Search companies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </InputGroup>
                <Spacer />
                <Menu>
                    <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                        View: {viewMode === 'list' ? 'List' : 'Grid'}
                    </MenuButton>
                    <MenuList>
                        <MenuItem onClick={() => setViewMode('list')}>List View</MenuItem>
                        <MenuItem onClick={() => setViewMode('grid')}>Grid View</MenuItem>
                    </MenuList>
                </Menu>
                <Button
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={onCreateOpen}
                >
                    New Company
                </Button>
            </Flex>

            {viewMode === 'list' ? (
                <Table variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Industry</Th>
                            <Th>Website</Th>
                            <Th>Size</Th>
                            <Th>Phone</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {filteredCompanies.map((company) => (
                            <Tr key={company.company_id}>
                                <Td>
                                    <Text fontWeight="medium">{company.name}</Text>
                                </Td>
                                <Td>{company.industry}</Td>
                                <Td>{company.website}</Td>
                                <Td>{company.size}</Td>
                                <Td>{company.phone}</Td>
                                <Td>
                                    <Button
                                        size="sm"
                                        mr={2}
                                        onClick={() => handleView(company)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        mr={2}
                                        onClick={() => handleEdit(company)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        colorScheme="red"
                                        onClick={() => handleDelete(company.company_id)}
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
                    {filteredCompanies.map((company) => (
                        <Box
                            key={company.company_id}
                            p={4}
                            borderWidth="1px"
                            borderRadius="lg"
                            boxShadow="sm"
                        >
                            <Text fontSize="lg" fontWeight="bold" mb={2}>
                                {company.name}
                            </Text>
                            <Text mb={1}>{company.industry}</Text>
                            <Text mb={1}>{company.website}</Text>
                            <Text mb={1}>{company.size}</Text>
                            <Text mb={3}>{company.phone}</Text>
                            <Flex gap={2}>
                                <Button
                                    size="sm"
                                    onClick={() => handleView(company)}
                                >
                                    View
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleEdit(company)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => handleDelete(company.company_id)}
                                >
                                    Delete
                                </Button>
                            </Flex>
                        </Box>
                    ))}
                </Box>
            )}

            <CreateCompanyModal
                isOpen={isCreateOpen}
                onClose={onCreateClose}
                workspaceId={workspaceId}
            />

            {selectedCompany && (
                <>
                    <EditCompanyModal
                        isOpen={isEditOpen}
                        onClose={onEditClose}
                        company={selectedCompany}
                        workspaceId={workspaceId}
                    />
                    <ViewCompanyModal
                        isOpen={isViewOpen}
                        onClose={onViewClose}
                        company={selectedCompany}
                        workspaceId={workspaceId}
                    />
                </>
            )}
        </Box>
    );
};

export default CompaniesPanel;

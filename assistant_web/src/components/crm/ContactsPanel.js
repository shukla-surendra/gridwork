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
    IconButton,
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
import { removeContact } from '../../slices/crm/contactsSlice';
import CreateContactModal from './CreateContactModal';
import EditContactModal from './EditContactModal';
import ViewContactModal from './ViewContactModal';

const ContactsPanel = () => {
    const dispatch = useDispatch();
    const toast = useToast();
    const { contacts, loading } = useSelector((state) => state.contacts);
    const { selectedWorkspace } = useSelector((state) => state.workspaces || {});
    const workspaceId = selectedWorkspace?.workspace_id;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContact, setSelectedContact] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

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

    const handleDelete = async (contactId) => {
        try {
            await dispatch(removeContact({ workspaceId, contactId })).unwrap();
            toast({
                title: 'Contact deleted',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete contact',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleEdit = (contact) => {
        setSelectedContact(contact);
        onEditOpen();
    };

    const handleView = (contact) => {
        setSelectedContact(contact);
        onViewOpen();
    };

    const filteredContacts = contacts.filter((contact) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            contact.first_name?.toLowerCase().includes(searchLower) ||
            contact.last_name?.toLowerCase().includes(searchLower) ||
            contact.email?.toLowerCase().includes(searchLower) ||
            contact.company?.toLowerCase().includes(searchLower) ||
            contact.company_ref?.name?.toLowerCase().includes(searchLower)
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
                        placeholder="Search contacts..."
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
                    New Contact
                </Button>
            </Flex>

            {viewMode === 'list' ? (
                <Table variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Name</Th>
                            <Th>Email</Th>
                            <Th>Phone</Th>
                            <Th>Company</Th>
                            <Th>Job Title</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {filteredContacts.map((contact) => (
                            <Tr key={contact.contact_id}>
                                <Td>
                                    <Text fontWeight="medium">
                                        {contact.first_name} {contact.last_name}
                                    </Text>
                                </Td>
                                <Td>{contact.email}</Td>
                                <Td>{contact.phone}</Td>
                                <Td>{contact.company}</Td>
                                <Td>{contact.job_title}</Td>
                                <Td>
                                    <Button
                                        size="sm"
                                        mr={2}
                                        onClick={() => handleView(contact)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        mr={2}
                                        onClick={() => handleEdit(contact)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        colorScheme="red"
                                        onClick={() => handleDelete(contact.contact_id)}
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
                    {filteredContacts.map((contact) => (
                        <Box
                            key={contact.contact_id}
                            p={4}
                            borderWidth="1px"
                            borderRadius="lg"
                            boxShadow="sm"
                        >
                            <Text fontSize="lg" fontWeight="bold" mb={2}>
                                {contact.first_name} {contact.last_name}
                            </Text>
                            <Text mb={1}>{contact.email}</Text>
                            <Text mb={1}>{contact.phone}</Text>
                            <Text mb={1}>{contact.company}</Text>
                            <Text mb={3}>{contact.job_title}</Text>
                            <Flex gap={2}>
                                <Button
                                    size="sm"
                                    onClick={() => handleView(contact)}
                                >
                                    View
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleEdit(contact)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => handleDelete(contact.contact_id)}
                                >
                                    Delete
                                </Button>
                            </Flex>
                        </Box>
                    ))}
                </Box>
            )}

            <CreateContactModal
                isOpen={isCreateOpen}
                onClose={onCreateClose}
                workspaceId={workspaceId}
            />

            {selectedContact && (
                <>
                    <EditContactModal
                        isOpen={isEditOpen}
                        onClose={onEditClose}
                        contact={selectedContact}
                        workspaceId={workspaceId}
                    />
                    <ViewContactModal
                        isOpen={isViewOpen}
                        onClose={onViewClose}
                        contact={selectedContact}
                    />
                </>
            )}
        </Box>
    );
};

export default ContactsPanel; 
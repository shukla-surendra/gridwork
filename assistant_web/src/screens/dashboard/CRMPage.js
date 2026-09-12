import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    Flex,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Heading,
    Spinner,
    Text,
    useToast,
    Button,
    VStack,
    useColorModeValue,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription
} from '@chakra-ui/react';
import { fetchContacts } from '../../slices/crm/contactsSlice';
import { fetchDeals } from '../../slices/crm/dealsSlice';
import { fetchCompanies } from '../../slices/crm/companiesSlice';
import ActivitiesPanel from '../../components/crm/ActivitiesPanel';
import ContactsPanel from '../../components/crm/ContactsPanel';
import DealsPanel from '../../components/crm/DealsPanel';
import CompaniesPanel from '../../components/crm/CompaniesPanel';
import { useRouter } from 'next/router';
import { selectWorkspace, fetchWorkspaces } from '../../slices/workspaces';
import config from '../../utils/config';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';

const CRMPage = () => {
    const dispatch = useDispatch();
    const router = useRouter();
  const navigate = (path) => router.push(path);
    const toast = useToast();
    const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
    const { selectedWorkspace, workspaces } = useSelector((state) => state.workspaces || {});
    const { contacts, loading: contactsLoading, error: contactsError } = useSelector((state) => state.contacts || {});
    const { deals, loading: dealsLoading, error: dealsError } = useSelector((state) => state.deals || {});
    // Activities has no top-level fetch of its own -- ActivitiesPanel loads
    // its data (merged from the contact- and deal-scoped endpoints) on mount.
    const { activities } = useSelector((state) => state.activities || {});
    const bgColor = useColorModeValue('gray.50', 'gray.900');

    const isLoading = contactsLoading || dealsLoading;
    const hasError = contactsError || dealsError;

    // Initialize workspaces and select default workspace
    useEffect(() => {
        const initializeWorkspace = async () => {
            try {
                await dispatch(fetchWorkspaces());

                const workspaceFromStorage = localStorage.getItem('workspace');
                if (workspaceFromStorage) {
                    const defaultWorkspace = JSON.parse(workspaceFromStorage);
                    if (defaultWorkspace && defaultWorkspace.workspace_id) {
                        dispatch(selectWorkspace(defaultWorkspace));
                    }
                } else {
                    toast({
                        title: 'No Workspace Selected',
                        description: 'Please select a workspace to continue.',
                        status: 'warning',
                        duration: 5000,
                        isClosable: true,
                    });
                }
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to initialize workspace. Please try again.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        };

        initializeWorkspace();
    }, [dispatch, toast]);

    useEffect(() => {
        if (selectedWorkspace) {
            dispatch(fetchContacts(selectedWorkspace.workspace_id));
            dispatch(fetchDeals(selectedWorkspace.workspace_id));
            dispatch(fetchCompanies(selectedWorkspace.workspace_id));
        }
    }, [dispatch, selectedWorkspace]);

    useEffect(() => {
        if (hasError) {
            toast({
                title: 'Error',
                description: 'Failed to load CRM data. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [hasError, toast]);

    if (!selectedWorkspace) {
        return (
            <Box minH="100vh" bg={bgColor}>
                <Navbar isCollapsed={isMenuCollapsed} />
                <Box
                    ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }}
                    transition="all 0.3s ease"
                    minH="100vh"
                >
                    <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
                    <Box p={3}>
                        <VStack spacing={4} align="center" justify="center" minH="50vh">
                            <Text fontSize="xl">Please select a workspace to view CRM data.</Text>
                            <Button colorScheme="blue" onClick={() => navigate('/workspaces')}>
                                Go to Workspaces
                            </Button>
                        </VStack>
                    </Box>
                </Box>
            </Box>
        );
    }

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
                <Spinner size="xl" />
            </Box>
        );
    }

    if (hasError) {
        return (
            <Box p={3}>
                <Alert status="error">
                    <AlertIcon />
                    <AlertTitle>Error loading CRM data</AlertTitle>
                    <AlertDescription>
                        {contactsError && <Text>Error loading contacts: {contactsError}</Text>}
                        {dealsError && <Text>Error loading deals: {dealsError}</Text>}
                    </AlertDescription>
                </Alert>
            </Box>
        );
    }

    return (
        <Box bg={bgColor} minH="100vh">
            <Navbar isCollapsed={isMenuCollapsed} onToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
            <Box
                ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}
                transition="all 0.3s ease"
                minH="100vh"
            >
                <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
                <Box p={4}>
                    <Heading size="lg" mb={4}>CRM</Heading>
                    <Tabs variant="enclosed">
                        <TabList>
                            <Tab>Contacts</Tab>
                            <Tab>Companies</Tab>
                            <Tab>Deals</Tab>
                            <Tab>Activities</Tab>
                        </TabList>
                        <TabPanels>
                            <TabPanel>
                                <ContactsPanel />
                            </TabPanel>
                            <TabPanel>
                                <CompaniesPanel />
                            </TabPanel>
                            <TabPanel>
                                <DealsPanel />
                            </TabPanel>
                            <TabPanel>
                                <ActivitiesPanel
                                    contacts={contacts || []}
                                    deals={deals || []}
                                    workspaceId={selectedWorkspace?.workspace_id}
                                />
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </Box>
            </Box>
        </Box>
    );
};

export default CRMPage; 
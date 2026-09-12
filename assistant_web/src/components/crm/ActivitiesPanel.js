import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Input,
    InputGroup,
    InputLeftElement,
    Button,
    HStack,
    Badge,
    useDisclosure,
    useToast,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Text,
    Select,
    Flex,
    Spinner,
    Checkbox,
    ButtonGroup,
    useColorModeValue,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    PopoverArrow,
    PopoverCloseButton,
    PopoverHeader,
    VStack,
    Divider,
    Tag,
    TagLabel,
    TagCloseButton,
    InputRightElement,
    useDisclosure as usePopoverDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    SimpleGrid,
    Progress,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    FormControl,
    FormLabel,
    Switch,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Textarea,
    useBreakpointValue,
    Spacer
} from '@chakra-ui/react';
import { 
    SearchIcon, 
    ChevronDownIcon, 
    AddIcon, 
    ChevronLeftIcon, 
    ChevronRightIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    DeleteIcon,
    DownloadIcon,
    CalendarIcon,
    FilterIcon,
    TagIcon,
    InfoIcon,
    ChartBarIcon,
    FileIcon,
    StarIcon,
    TimeIcon,
    BellIcon,
    TemplateIcon,
    RepeatIcon
} from '@chakra-ui/icons';
import { getContactActivities, getDealActivities } from '../../services/crmService';
import CreateActivityModal from './CreateActivityModal';
import EditActivityModal from './EditActivityModal';
import ViewActivityModal from './ViewActivityModal';
import { format, subDays, startOfDay, endOfDay, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { editActivity, removeActivity, setFilters, setSort, clearFilters, setActivities } from '../../slices/crm/activitiesSlice';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const ITEMS_PER_PAGE = 10;

const ACTIVITY_TEMPLATES = [
    {
        name: 'Follow-up Call',
        type: 'call',
        description: 'Follow-up call with client',
        defaultTags: ['follow-up', 'client']
    },
    {
        name: 'Meeting Notes',
        type: 'note',
        description: 'Meeting notes and action items',
        defaultTags: ['meeting', 'notes']
    },
    {
        name: 'Email Follow-up',
        type: 'email',
        description: 'Email follow-up regarding previous discussion',
        defaultTags: ['email', 'follow-up']
    }
];

const ActivitiesPanel = ({ contacts, deals, workspaceId }) => {
    const dispatch = useDispatch();
    const toast = useToast();
    const { activities: reduxActivities, loading: reduxLoading, filters, sort } = useSelector((state) => state.activities);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [selectedTags, setSelectedTags] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState(null);
    const bgColor = useColorModeValue('white', 'gray.800');
    const [showTrends, setShowTrends] = useState(false);
    const [reminderSettings, setReminderSettings] = useState({});
    const [templates, setTemplates] = useState(ACTIVITY_TEMPLATES);
    const { isOpen: isReminderOpen, onOpen: onReminderOpen, onClose: onReminderClose } = useDisclosure();
    const { isOpen: isTemplateOpen, onOpen: onTemplateOpen, onClose: onTemplateClose } = useDisclosure();
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [customTemplate, setCustomTemplate] = useState({
        name: '',
        type: 'note',
        description: '',
        tags: []
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchActivities();
    }, [contacts, deals]);

    useEffect(() => {
        // Extract unique tags from activities
        const tags = new Set();
        reduxActivities.forEach(activity => {
            activity.tags?.forEach(tag => tags.add(tag));
        });
        setAvailableTags(Array.from(tags));
    }, [reduxActivities]);

    const fetchActivities = async () => {
        try {
            setIsLoading(true);
            if (!contacts || !deals || !workspaceId) {
                return;
            }

            // No single backend endpoint returns "all activities for a
            // workspace" for CRM -- ContactActivity/DealActivity are each
            // only listable per-contact / per-deal (see crm_controller.py),
            // so this fans out one request per contact/deal and merges
            // client-side. Each activity is tagged with entity_type/
            // entity_id (which endpoint it actually came from -- needed to
            // route edit/delete to the right one) and with the display
            // fields (contact_name/deal_name/date) the API response itself
            // doesn't carry.
            const contactActivities = await Promise.all(
                (contacts || []).map(contact =>
                    getContactActivities(workspaceId, contact.contact_id).then(acts =>
                        acts.map(a => ({
                            ...a,
                            entity_type: 'contact',
                            entity_id: contact.contact_id,
                            contact_name: `${contact.first_name} ${contact.last_name}`,
                            deal_name: null,
                            date: a.scheduled_at || a.created_at,
                        }))
                    )
                )
            );
            const dealActivities = await Promise.all(
                (deals || []).map(deal =>
                    getDealActivities(workspaceId, deal.deal_id).then(acts =>
                        acts.map(a => ({
                            ...a,
                            entity_type: 'deal',
                            entity_id: deal.deal_id,
                            contact_name: deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : null,
                            deal_name: deal.title,
                            date: a.scheduled_at || a.created_at,
                        }))
                    )
                )
            );

            const allActivities = [
                ...contactActivities.flat(),
                ...dealActivities.flat()
            ];

            dispatch(setActivities(allActivities));
        } catch (error) {
            toast({
                title: 'Error fetching activities',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredActivities = reduxActivities.filter((activity) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            activity.description?.toLowerCase().includes(searchLower) ||
            activity.notes?.toLowerCase().includes(searchLower) ||
            activity.tags?.some(tag => tag.toLowerCase().includes(searchLower));

        const matchesType = !filters.type || activity.type.toLowerCase() === filters.type.toLowerCase();
        const matchesTags = filters.tags.length === 0 || 
            filters.tags.every(tag => activity.tags?.includes(tag));

        return matchesSearch && matchesType && matchesTags;
    }).sort((a, b) => {
        const direction = sort.direction === 'asc' ? 1 : -1;
        if (sort.field === 'date') {
            return direction * (new Date(a.date) - new Date(b.date));
        }
        return direction * (a[sort.field]?.localeCompare(b[sort.field]) || 0);
    });

    const handleDelete = async (activity) => {
        try {
            await dispatch(removeActivity({
                workspaceId,
                entityType: activity.entity_type,
                entityId: activity.entity_id,
                activityId: activity.activity_id,
            })).unwrap();
            toast({
                title: 'Activity deleted',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete activity',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleEdit = (activity) => {
        setSelectedActivity(activity);
        onEditOpen();
    };

    const handleView = (activity) => {
        setSelectedActivity(activity);
        onViewOpen();
    };

    const handleFilterChange = (newFilters) => {
        dispatch(setFilters(newFilters));
    };

    const handleSortChange = (field) => {
        const direction = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
        dispatch(setSort({ field, direction }));
    };

    const handleDateRangeChange = (start, end) => {
        setDateRange({ start, end });
        setCurrentPage(1);
    };

    const handleTagSelect = (tag) => {
        setSelectedTags(prev => 
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
        setCurrentPage(1);
    };

    const handleBulkEdit = async (updates) => {
        try {
            await Promise.all(selectedActivities.map(id => {
                const activity = reduxActivities.find(a => a.activity_id === id);
                if (!activity) return Promise.resolve();
                return dispatch(editActivity({
                    workspaceId,
                    entityType: activity.entity_type,
                    entityId: activity.entity_id,
                    activityId: activity.activity_id,
                    activityData: updates,
                })).unwrap();
            }));
            await fetchActivities();
            setSelectedActivities([]);
            toast({
                title: 'Activities updated successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error updating activities',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleExportCSV = () => {
        const headers = ['Type', 'Description', 'Notes', 'Contact', 'Deal', 'Date', 'Tags'];
        const csvData = filteredActivities.map(activity => [
            activity.type,
            activity.description,
            activity.notes || '',
            activity.contact_name,
            activity.deal_name,
            new Date(activity.date).toLocaleDateString(),
            activity.tags?.join(', ') || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `activities_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    const handleExportExcel = () => {
        const data = filteredActivities.map(activity => ({
            Type: activity.type,
            Description: activity.description,
            Notes: activity.notes || '',
            Contact: activity.contact_name,
            Deal: activity.deal_name,
            Date: new Date(activity.date).toLocaleDateString(),
            Tags: activity.tags?.join(', ') || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Activities');
        XLSX.writeFile(wb, `activities_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text('Activities Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on ${format(new Date(), 'yyyy-MM-dd')}`, 14, 22);

        // Add table
        const tableData = filteredActivities.map(activity => [
            activity.type,
            activity.description,
            activity.notes || '',
            activity.contact_name,
            activity.deal_name,
            new Date(activity.date).toLocaleDateString(),
            activity.tags?.join(', ') || ''
        ]);

        doc.autoTable({
            head: [['Type', 'Description', 'Notes', 'Contact', 'Deal', 'Date', 'Tags']],
            body: tableData,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] }
        });

        doc.save(`activities_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const calculateTrends = () => {
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);
        const days = Array.from({ length: 31 }, (_, i) => 
            format(subDays(now, 30 - i), 'yyyy-MM-dd')
        );

        const activitiesByDay = reduxActivities.reduce((acc, activity) => {
            const day = format(new Date(activity.date), 'yyyy-MM-dd');
            if (!acc[day]) {
                acc[day] = {
                    total: 0,
                    byType: {}
                };
            }
            acc[day].total++;
            acc[day].byType[activity.type] = (acc[day].byType[activity.type] || 0) + 1;
            return acc;
        }, {});

        const trendData = {
            labels: days,
            datasets: [
                {
                    label: 'Total Activities',
                    data: days.map(day => activitiesByDay[day]?.total || 0),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: 'Calls',
                    data: days.map(day => activitiesByDay[day]?.byType.call || 0),
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                },
                {
                    label: 'Emails',
                    data: days.map(day => activitiesByDay[day]?.byType.email || 0),
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }
            ]
        };

        return trendData;
    };

    const handleSetReminder = (activityId, settings) => {
        setReminderSettings(prev => ({
            ...prev,
            [activityId]: settings
        }));

        // In a real application, you would save this to your backend
        toast({
            title: 'Reminder set',
            description: `Reminder set for ${settings.days} days before activity`,
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
    };

    const handleCreateTemplate = () => {
        setTemplates(prev => [...prev, customTemplate]);
        setCustomTemplate({
            name: '',
            type: 'note',
            description: '',
            tags: []
        });
        onTemplateClose();
        toast({
            title: 'Template created',
            description: 'New activity template has been created',
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
    };

    const handleUseTemplate = (template) => {
        setSelectedTemplate(template);
        onCreateOpen();
    };

    const getTypeColor = (type) => {
        switch (type.toLowerCase()) {
            case 'call':
                return 'blue';
            case 'meeting':
                return 'green';
            case 'email':
                return 'purple';
            case 'note':
                return 'yellow';
            default:
                return 'gray';
        }
    };

    if (reduxLoading || isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
                <Spinner size="xl" />
            </Box>
        );
    }

    return (
        <Box>
            <Flex mb={4} gap={4}>
                <InputGroup maxW="400px">
                    <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search activities..."
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
                    New Activity
                </Button>
            </Flex>

            {viewMode === 'list' ? (
                <Table variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Type</Th>
                            <Th>Description</Th>
                            <Th>Contact</Th>
                            <Th>Deal</Th>
                            <Th>Date</Th>
                            <Th>Tags</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {filteredActivities.map((activity) => (
                            <Tr key={activity.activity_id}>
                                <Td>
                                    <Badge colorScheme={getTypeColor(activity.type)}>
                                        {activity.type}
                                    </Badge>
                                </Td>
                                <Td>{activity.description}</Td>
                                <Td>{activity.contact_name}</Td>
                                <Td>{activity.deal_name}</Td>
                                <Td>{new Date(activity.date).toLocaleDateString()}</Td>
                                <Td>
                                    <Flex gap={1} wrap="wrap">
                                        {activity.tags?.map((tag) => (
                                            <Badge key={tag} colorScheme="gray">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </Flex>
                                </Td>
                                <Td>
                                    <Button
                                        size="sm"
                                        mr={2}
                                        onClick={() => handleView(activity)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        mr={2}
                                        onClick={() => handleEdit(activity)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        colorScheme="red"
                                        onClick={() => handleDelete(activity)}
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
                    {filteredActivities.map((activity) => (
                        <Box
                            key={activity.activity_id}
                            p={4}
                            borderWidth="1px"
                            borderRadius="lg"
                            boxShadow="sm"
                        >
                            <Flex mb={2} justify="space-between" align="center">
                                <Badge colorScheme={getTypeColor(activity.type)}>
                                    {activity.type}
                                </Badge>
                                <Text fontSize="sm" color="gray.500">
                                    {new Date(activity.date).toLocaleDateString()}
                                </Text>
                            </Flex>
                            <Text fontSize="lg" fontWeight="bold" mb={2}>
                                {activity.description}
                            </Text>
                            <Text mb={1}>Contact: {activity.contact_name}</Text>
                            <Text mb={1}>Deal: {activity.deal_name}</Text>
                            <Flex mb={3} gap={1} wrap="wrap">
                                {activity.tags?.map((tag) => (
                                    <Badge key={tag} colorScheme="gray">
                                        {tag}
                                    </Badge>
                                ))}
                            </Flex>
                            <Flex gap={2}>
                                <Button
                                    size="sm"
                                    onClick={() => handleView(activity)}
                                >
                                    View
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleEdit(activity)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => handleDelete(activity)}
                                >
                                    Delete
                                </Button>
                            </Flex>
                        </Box>
                    ))}
                </Box>
            )}

            <CreateActivityModal
                isOpen={isCreateOpen}
                onClose={onCreateClose}
                workspaceId={workspaceId}
                contacts={contacts}
                deals={deals}
                onCreated={fetchActivities}
            />

            {selectedActivity && (
                <>
                    <EditActivityModal
                        isOpen={isEditOpen}
                        onClose={onEditClose}
                        activity={selectedActivity}
                        workspaceId={workspaceId}
                        contacts={contacts}
                        deals={deals}
                        onUpdated={fetchActivities}
                    />
                    <ViewActivityModal
                        isOpen={isViewOpen}
                        onClose={onViewClose}
                        activity={selectedActivity}
                    />
                </>
            )}
        </Box>
    );
};

export default ActivitiesPanel; 
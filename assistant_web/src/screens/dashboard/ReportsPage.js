import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Grid,
  Text,
  useColorModeValue,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Icon,
  Button,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  HStack,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import { FiBarChart2, FiPieChart, FiTrendingUp, FiCalendar, FiDownload } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import { fetchReportsSummary } from '../../slices/reports';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

const CHART_OPTIONS = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const DOUGHNUT_OPTIONS = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const dispatch = useDispatch();
  const { summary, loading, error } = useSelector((state) => state.reports);
  const detailsModal = useDisclosure();
  const [activeDetail, setActiveDetail] = useState(null);

  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');

  useEffect(() => {
    dispatch(fetchReportsSummary());
  }, [dispatch]);

  const openDetails = (key, title) => {
    setActiveDetail({ key, title });
    detailsModal.onOpen();
  };

  const handleExport = () => {
    if (summary) downloadJson(summary, `reports-summary-${new Date().toISOString().slice(0, 10)}.json`);
  };

  if (loading && !summary) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Spinner size="xl" /></Center>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Text color="red.500">{error}</Text></Center>
        </Box>
      </Box>
    );
  }

  const tc = summary?.task_completion;
  const td = summary?.time_distribution;
  const pt = summary?.performance_trends;
  const sa = summary?.schedule_analysis;

  const reportCards = [
    {
      key: 'task_completion',
      title: 'Task Completion',
      description: 'Track your task completion rates and productivity trends',
      icon: FiBarChart2,
      color: 'blue.500',
      stat: tc && <Stat><StatLabel>Completion rate</StatLabel><StatNumber>{tc.completion_rate}%</StatNumber><StatHelpText>{tc.completed_tasks} of {tc.total_tasks} tasks</StatHelpText></Stat>,
      chart: tc && (
        <Box h="140px">
          <Bar options={CHART_OPTIONS} data={{
            labels: tc.trend_labels,
            datasets: [{ label: 'Completed', data: tc.trend_values, backgroundColor: '#3182CE' }],
          }} />
        </Box>
      ),
    },
    {
      key: 'time_distribution',
      title: 'Time Distribution',
      description: 'How your tasks break down by priority',
      icon: FiPieChart,
      color: 'green.500',
      chart: td && td.labels.length > 0 && (
        <Box h="140px">
          <Doughnut options={DOUGHNUT_OPTIONS} data={{
            labels: td.labels,
            datasets: [{ data: td.values, backgroundColor: ['#E53E3E', '#38A169', '#D69E2E', '#805AD5', '#3182CE'] }],
          }} />
        </Box>
      ),
    },
    {
      key: 'performance_trends',
      title: 'Performance Trends',
      description: 'Weekly completion rate over the last 6 weeks',
      icon: FiTrendingUp,
      color: 'purple.500',
      chart: pt && (
        <Box h="140px">
          <Line options={CHART_OPTIONS} data={{
            labels: pt.labels,
            datasets: [{ label: 'Completion %', data: pt.values, borderColor: '#805AD5', backgroundColor: 'rgba(128,90,213,0.2)', tension: 0.3 }],
          }} />
        </Box>
      ),
    },
    {
      key: 'schedule_analysis',
      title: 'Schedule Analysis',
      description: 'Scheduled time blocks over the next 7 days',
      icon: FiCalendar,
      color: 'orange.500',
      stat: sa && <Stat><StatLabel>Scheduled hours (next 7 days)</StatLabel><StatNumber>{sa.total_scheduled_hours}h</StatNumber><StatHelpText>{sa.upcoming_blocks} blocks{sa.busiest_day ? ` · busiest: ${sa.busiest_day}` : ''}</StatHelpText></Stat>,
      chart: sa && sa.labels.length > 0 && (
        <Box h="140px">
          <Bar options={CHART_OPTIONS} data={{
            labels: sa.labels,
            datasets: [{ label: 'Hours', data: sa.values, backgroundColor: '#DD6B20' }],
          }} />
        </Box>
      ),
    },
  ];

  const activeData = activeDetail && summary?.[activeDetail.key];

  return (
    <>
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
            <Stack spacing={6}>
              <Flex justifyContent="space-between" alignItems="center" mb={6}>
                <Heading size="lg">Reports & Analytics</Heading>
                <Button leftIcon={<FiDownload />} colorScheme="blue" size="sm" onClick={handleExport} isDisabled={!summary}>
                  Export Data
                </Button>
              </Flex>

              <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
                {reportCards.map((report) => (
                  <Card key={report.key} bg={cardBg} borderRadius="lg" boxShadow="md">
                    <CardHeader pb={2}>
                      <HStack spacing={3}>
                        <Icon as={report.icon} boxSize={6} color={report.color} />
                        <Heading size="md">{report.title}</Heading>
                      </HStack>
                    </CardHeader>
                    <CardBody pt={0}>
                      <Text color={textColor} fontSize="sm" mb={3}>{report.description}</Text>
                      {report.stat}
                      <Box mt={3}>{report.chart}</Box>
                    </CardBody>
                    <CardFooter pt={0}>
                      <Button variant="ghost" colorScheme="blue" size="sm" width="full" onClick={() => openDetails(report.key, report.title)}>
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </Grid>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Modal isOpen={detailsModal.isOpen} onClose={detailsModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{activeDetail?.title} — raw numbers</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {activeData && (
              <Table size="sm">
                <Thead>
                  <Tr><Th>Field</Th><Th>Value</Th></Tr>
                </Thead>
                <Tbody>
                  {Object.entries(activeData).map(([key, value]) => (
                    <Tr key={key}>
                      <Td>{key}</Td>
                      <Td>{Array.isArray(value) ? value.join(', ') : String(value)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

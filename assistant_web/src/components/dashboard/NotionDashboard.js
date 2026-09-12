import React, { useState } from 'react';
import {
  Box,
  Flex,
  Grid,
  Text,
  Icon,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  HStack,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiPlus,
  FiStar,
  FiBell,
  FiFileText,
  FiDatabase,
  FiCalendar,
  FiUsers,
  FiBarChart2,
  FiTag,
  FiTrash2,
  FiEdit2,
} from 'react-icons/fi';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const PageCard = ({ title, icon, lastEdited, isFavorite }) => (
  <MotionBox
    p={4}
    bg="white"
    borderRadius="md"
    boxShadow="sm"
    _hover={{ boxShadow: 'md' }}
    whileHover={{ y: -2 }}
    cursor="pointer"
  >
    <HStack spacing={3}>
      <Icon as={icon} color="gray.500" />
      <VStack align="start" spacing={1} flex={1}>
        <Text fontWeight="medium">{title}</Text>
        <Text fontSize="sm" color="gray.500">
          Last edited {lastEdited}
        </Text>
      </VStack>
      {isFavorite && <Icon as={FiStar} color="yellow.400" />}
    </HStack>
  </MotionBox>
);

const NotionDashboard = () => {
  const [activeSection, setActiveSection] = useState('recent');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const sections = [
    { id: 'all', label: 'All Pages', icon: FiFileText },
    { id: 'database', label: 'Databases', icon: FiDatabase },
    { id: 'calendar', label: 'Calendar', icon: FiCalendar },
    { id: 'team', label: 'Team', icon: FiUsers },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
    { id: 'trash', label: 'Trash', icon: FiTrash2 },
  ];

  const recentPages = [
    { title: 'Project Roadmap', icon: FiFileText, lastEdited: '2 hours ago', isFavorite: true },
    { title: 'Team Meeting Notes', icon: FiFileText, lastEdited: '1 day ago', isFavorite: false },
    { title: 'Product Backlog', icon: FiDatabase, lastEdited: '2 days ago', isFavorite: true },
    { title: 'Q2 Planning', icon: FiCalendar, lastEdited: '3 days ago', isFavorite: false },
  ];

  return (
    <Box h="100vh" bg={bgColor}>
      {/* Header */}
      <Box bg="white" boxShadow="sm" zIndex={1}>
        <Flex h="60px" align="center" px={4} justify="space-between">
          <HStack spacing={4}>
            <InputGroup maxW="400px">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="gray.400" />
              </InputLeftElement>
              <Input placeholder="Search..." />
            </InputGroup>
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box p={6} overflow="auto">
        <VStack spacing={6} align="stretch">
          <Flex justify="space-between" align="center">
            <Text fontSize="2xl" fontWeight="bold">
              {sections.find(s => s.id === activeSection)?.label}
            </Text>
            <HStack spacing={2}>
              <Button leftIcon={<Icon as={FiTag} />} size="sm">
                Filter
              </Button>
              <Button leftIcon={<Icon as={FiEdit2} />} size="sm">
                Sort
              </Button>
            </HStack>
          </Flex>

          <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
            {recentPages.map((page, index) => (
              <PageCard key={index} {...page} />
            ))}
          </Grid>
        </VStack>
      </Box>
    </Box>
  );
};

export default NotionDashboard; 
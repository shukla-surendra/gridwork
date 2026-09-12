import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Flex,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { FiSearch, FiCheck, FiTrash2, FiMoreVertical, FiArrowLeft, FiBell } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import {
  fetchNotifications,
  markNotificationRead,
  deleteNotification,
  markAllNotificationsRead,
} from '../../slices/notifications';

const getTypeColor = (type) => {
  switch (type) {
    case 'task_assigned':
      return 'blue';
    case 'comment_added':
      return 'yellow';
    case 'meeting':
      return 'purple';
    case 'deadline':
      return 'red';
    default:
      return 'gray';
  }
};

const NotificationsPage = () => {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const dispatch = useDispatch();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const { notifications, loading } = useSelector((state) => state.notifications);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const filteredNotifications = notifications.filter((n) => {
    const matchesFilter = filter === 'all' || (filter === 'unread' && !n.is_read) || (filter === 'read' && n.is_read);
    const q = searchQuery.toLowerCase();
    const matchesSearch = n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <VStack spacing={4} align="stretch">
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <IconButton icon={<FiArrowLeft />} variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back" />
                <Heading size="lg">Notifications</Heading>
              </HStack>
              <HStack spacing={2}>
                <Button leftIcon={<FiCheck />} onClick={() => dispatch(markAllNotificationsRead())} size="sm" variant="outline">
                  Mark all as read
                </Button>
              </HStack>
            </Flex>

            <Flex gap={3} wrap="wrap">
              <Select value={filter} onChange={(e) => setFilter(e.target.value)} w={{ base: 'full', md: '200px' }}>
                <option value="all">All Notifications</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </Select>
              <InputGroup w={{ base: 'full', md: '300px' }}>
                <InputLeftElement pointerEvents="none">
                  <FiSearch color="gray.300" />
                </InputLeftElement>
                <Input placeholder="Search notifications..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </InputGroup>
            </Flex>

            {loading && <Center py={16}><Spinner /></Center>}

            {!loading && (
              <VStack spacing={3} align="stretch">
                {filteredNotifications.length === 0 ? (
                  <Box p={8} textAlign="center" bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                    <FiBell size={24} style={{ margin: '0 auto 8px' }} />
                    <Text color="gray.500">No notifications found</Text>
                  </Box>
                ) : (
                  filteredNotifications.map((n) => (
                    <Box
                      key={n.notification_id}
                      p={3}
                      bg={bgColor}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={borderColor}
                      opacity={n.is_read ? 0.8 : 1}
                    >
                      <Flex justify="space-between" align="start">
                        <VStack align="start" spacing={1}>
                          <HStack spacing={2}>
                            <Badge colorScheme={getTypeColor(n.type)}>{n.type}</Badge>
                            {!n.is_read && <Badge colorScheme="blue">New</Badge>}
                          </HStack>
                          <Heading size="sm">{n.title}</Heading>
                          <Text color="gray.600" fontSize="sm">{n.message}</Text>
                        </VStack>
                        <Menu>
                          <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                          <MenuList>
                            {!n.is_read && (
                              <MenuItem icon={<FiCheck />} onClick={() => dispatch(markNotificationRead(n.notification_id))}>
                                Mark as read
                              </MenuItem>
                            )}
                            <MenuItem icon={<FiTrash2 />} onClick={() => dispatch(deleteNotification(n.notification_id))} color="red.500">
                              Delete
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Flex>
                    </Box>
                  ))
                )}
              </VStack>
            )}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
};

export default NotificationsPage;

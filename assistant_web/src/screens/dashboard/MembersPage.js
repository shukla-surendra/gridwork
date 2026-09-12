import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Icon,
  Button,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Container,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Spinner,
  Center,
  Stack,
  Card,
  CardHeader,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { 
  FiUsers, 
  FiPlus, 
  FiMoreVertical,
  FiTrash2,
  FiEdit2,
  FiChevronRight,
  FiHome,
  FiMail,
  FiUser,
  FiX,
  FiEye
} from 'react-icons/fi';
import Head from 'next/head';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import MemberService from '../../services/MemberService';
import ConfigService from '../../utils/config';

const MembersPage = () => {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const menu_open = useDisclosure();
  const addMemberDrawer = useDisclosure();
  const toast = useToast();
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'gray.200');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');

  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({
    email: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // getDefaultWorkspace() throws when no workspace is selected yet -- as
  // during Next's static-export prerender pass, where localStorage doesn't
  // exist at all -- so an uncaught call here crashes the whole render.
  let currentWorkspace = null;
  try {
    currentWorkspace = ConfigService.getDefaultWorkspace();
  } catch (e) {
    currentWorkspace = null;
  }

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const response = await MemberService.getMembers(currentWorkspace.workspace_id);
        setMembers(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch members');
        toast({
          title: 'Error',
          description: 'Failed to fetch workspace members',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentWorkspace?.workspace_id) {
      fetchMembers();
    }
  }, [currentWorkspace?.workspace_id, toast]);

  const handleAddMember = async () => {
    if (!newMember.email) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Debug log to check workspace data
    console.log('Current workspace:', currentWorkspace);
    console.log('User info:', ConfigService.getUserId());

    try {
      const ownerId = currentWorkspace.owner_id || ConfigService.getUserId();
      console.log('Using owner_id:', ownerId);

      const response = await MemberService.addMember(
        currentWorkspace.workspace_id,
        ownerId,
        newMember.email,
        newMember.role
      );
      
      if (response.data) {
        setMembers([...members, response.data]);
        setNewMember({ email: '', role: 'member' });
        addMemberDrawer.onClose();
        
        toast({
          title: 'Member added',
          description: `${newMember.email} has been invited to the workspace`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      let errorMessage = 'Failed to add member';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          if (Array.isArray(error.response.data.detail)) {
            errorMessage = error.response.data.detail.map(err => err.msg).join(', ');
          } else {
            errorMessage = error.response.data.detail;
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error adding member',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await MemberService.removeMember(currentWorkspace.workspace_id, memberId);
      setMembers(members.filter(member => member.user_id !== memberId));
      
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the workspace',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      let errorMessage = 'Failed to remove member';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error removing member',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await MemberService.updateMemberRole(currentWorkspace.workspace_id, memberId, newRole);
      setMembers(members.map(member => 
        member.user_id === memberId ? { ...member, role: newRole } : member
      ));
      
      toast({
        title: 'Role updated',
        description: 'Member role has been updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      let errorMessage = 'Failed to update role';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error updating role',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box
          ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }}
          transition="all 0.3s ease"
          minH="100vh"
        >
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Container maxW="container.xl" py={4}>
            <Center h="200px">
              <Spinner size="xl" color="blue.500" />
            </Center>
          </Container>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box
          ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }}
          transition="all 0.3s ease"
          minH="100vh"
        >
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Container maxW="container.xl" py={4}>
            <Text color="red.500">{error}</Text>
          </Container>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Members - Assistant AI</title>
        <meta name="description" content="Workspace Members Management" />
      </Head>

      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box
          ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }}
          transition="all 0.3s ease"
          minH="100vh"
        >
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box p="3">
            <Stack spacing={6}>
              {/* Header Section */}
              <Flex
                justifyContent="space-between"
                alignItems="center"
                p={6}
                bg={cardBg}
                borderRadius="lg"
                boxShadow="sm"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <VStack align="start" spacing={1}>
                  <Heading size="lg" color={textColor}>Workspace Members</Heading>
                  <Text color={subTextColor}>Manage your workspace members and their roles</Text>
                </VStack>

                <Button
                  leftIcon={<Icon as={FiPlus} />}
                  colorScheme="blue"
                  onClick={addMemberDrawer.onOpen}
                >
                  Add Member
                </Button>
              </Flex>

              <Tabs variant="enclosed" colorScheme="blue">
                <TabList>
                  <Tab>All Members</Tab>
                  <Tab>By Role</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel p={0} mt={4}>
                    <Box bg={cardBg} borderRadius="lg" boxShadow="sm" p={6}>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Member</Th>
                            <Th>Email</Th>
                            <Th>Role</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {members.map((member) => (
                            <Tr key={member.user_id}>
                              <Td>
                                <HStack>
                                  <Avatar size="sm" name={member.name} src={member.avatar} />
                                  <Text>{member.name}</Text>
                                </HStack>
                              </Td>
                              <Td>{member.email}</Td>
                              <Td>
                                <Badge colorScheme={member.role === 'admin' ? 'purple' : 'blue'}>
                                  {member.role}
                                </Badge>
                              </Td>
                              <Td>
                                <Menu>
                                  <MenuButton
                                    as={IconButton}
                                    icon={<Icon as={FiMoreVertical} />}
                                    variant="ghost"
                                    size="sm"
                                  />
                                  <MenuList>
                                    <MenuItem 
                                      icon={<Icon as={FiEdit2} />}
                                      onClick={() => {
                                        const newRole = member.role === 'admin' ? 'member' : 'admin';
                                        handleUpdateRole(member.user_id, newRole);
                                      }}
                                    >
                                      {member.role === 'admin' ? 'Make Member' : 'Make Admin'}
                                    </MenuItem>
                                    <MenuItem
                                      icon={<Icon as={FiTrash2} />}
                                      color="red.500"
                                      onClick={() => handleRemoveMember(member.user_id)}
                                    >
                                      Remove
                                    </MenuItem>
                                  </MenuList>
                                </Menu>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </TabPanel>

                  <TabPanel p={0} mt={4}>
                    <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                      <GridItem>
                        <Box bg={cardBg} p={4} borderRadius="md">
                          <Text fontSize="lg" fontWeight="semibold" mb={4}>Admins</Text>
                          <VStack spacing={4} align="stretch">
                            {members.filter(member => member.role === 'admin').map((member) => (
                              <Card key={member.user_id} variant="outline">
                                <CardBody>
                                  <HStack justify="space-between">
                                    <HStack>
                                      <Avatar size="sm" name={member.name} src={member.avatar} />
                                      <VStack align="start" spacing={0}>
                                        <Text fontWeight="medium">{member.name}</Text>
                                        <Text fontSize="sm" color={subTextColor}>{member.email}</Text>
                                      </VStack>
                                    </HStack>
                                    <Menu>
                                      <MenuButton
                                        as={IconButton}
                                        icon={<Icon as={FiMoreVertical} />}
                                        variant="ghost"
                                        size="sm"
                                      />
                                      <MenuList>
                                        <MenuItem 
                                          icon={<Icon as={FiEdit2} />}
                                          onClick={() => handleUpdateRole(member.user_id, 'member')}
                                        >
                                          Make Member
                                        </MenuItem>
                                        <MenuItem
                                          icon={<Icon as={FiTrash2} />}
                                          color="red.500"
                                          onClick={() => handleRemoveMember(member.user_id)}
                                        >
                                          Remove
                                        </MenuItem>
                                      </MenuList>
                                    </Menu>
                                  </HStack>
                                </CardBody>
                              </Card>
                            ))}
                          </VStack>
                        </Box>
                      </GridItem>

                      <GridItem>
                        <Box bg={cardBg} p={4} borderRadius="md">
                          <Text fontSize="lg" fontWeight="semibold" mb={4}>Members</Text>
                          <VStack spacing={4} align="stretch">
                            {members.filter(member => member.role === 'member').map((member) => (
                              <Card key={member.user_id} variant="outline">
                                <CardBody>
                                  <HStack justify="space-between">
                                    <HStack>
                                      <Avatar size="sm" name={member.name} src={member.avatar} />
                                      <VStack align="start" spacing={0}>
                                        <Text fontWeight="medium">{member.name}</Text>
                                        <Text fontSize="sm" color={subTextColor}>{member.email}</Text>
                                      </VStack>
                                    </HStack>
                                    <Menu>
                                      <MenuButton
                                        as={IconButton}
                                        icon={<Icon as={FiMoreVertical} />}
                                        variant="ghost"
                                        size="sm"
                                      />
                                      <MenuList>
                                        <MenuItem 
                                          icon={<Icon as={FiEdit2} />}
                                          onClick={() => handleUpdateRole(member.user_id, 'admin')}
                                        >
                                          Make Admin
                                        </MenuItem>
                                        <MenuItem
                                          icon={<Icon as={FiTrash2} />}
                                          color="red.500"
                                          onClick={() => handleRemoveMember(member.user_id)}
                                        >
                                          Remove
                                        </MenuItem>
                                      </MenuList>
                                    </Menu>
                                  </HStack>
                                </CardBody>
                              </Card>
                            ))}
                          </VStack>
                        </Box>
                      </GridItem>
                    </Grid>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Add Member Drawer */}
      <Drawer
        isOpen={addMemberDrawer.isOpen}
        placement="right"
        onClose={addMemberDrawer.onClose}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            Add New Member
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={4} mt={4}>
              <FormControl>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Role</FormLabel>
                <Menu>
                  <MenuButton as={Button} rightIcon={<Icon as={FiChevronRight} />}>
                    {newMember.role.charAt(0).toUpperCase() + newMember.role.slice(1)}
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => setNewMember({ ...newMember, role: 'admin' })}>
                      Admin
                    </MenuItem>
                    <MenuItem onClick={() => setNewMember({ ...newMember, role: 'member' })}>
                      Member
                    </MenuItem>
                  </MenuList>
                </Menu>
              </FormControl>

              <Button
                colorScheme="blue"
                onClick={handleAddMember}
                isFullWidth
                mt={4}
              >
                Add Member
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MembersPage; 
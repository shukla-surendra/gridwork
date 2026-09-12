import {
  Drawer,
  useColorModeValue,
  HStack,
  VStack,
  Tag,
  Text,
  useDisclosure,
  Box,
  Flex,
  Grid,
  GridItem,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stack,
  StackDivider,
  Heading,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  TabPanels,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td
} from '@chakra-ui/react';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { retrieveNotes } from "../../slices/tasks";
import { selectIsModuleEnabled } from "../../slices/modules";
import Navbar from "../../components/dashboard/Navbar";
import FeatureDisabledPage from "../../components/dashboard/FeatureDisabledPage";
import Head from 'next/head';
import { formatLocalDateTime } from "../../utils/locale"
import NewNoteDrawer from "../../components/dashboard/drawers/NewNoteDrawer";
import EditNoteDrawer from '../../components/dashboard/drawers/EditNoteDrawer'
import DeleteTaskNoteModal from "../../components/dashboard/modals/DeleteTaskNoteModal";
import Header from "../../components/dashboard/Header";
import UnifiedEditButton from "../../components/dashboard/UnifiedEditButton";
import { useRouter } from 'next/router';
import NoteViewModal from "../../components/dashboard/modals/NoteViewModal";
import { FiEye, FiMoreVertical, FiEdit2, FiTrash2, FiExternalLink, FiPlus } from "react-icons/fi";
import { htmlToText } from "../../utils/htmlToText";

export default function NotesPage() {
  const notesEnabled = useSelector((state) => selectIsModuleEnabled(state, 'notes'));
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const menu_open = useDisclosure();
  const [currentTask, setCurrentTask] = useState({ task_id: "" });
  const notes = useSelector(state => state.tasks.notes);
  const delete_modal = useDisclosure()
  const edit_note_drawer = useDisclosure()
  const new_note_drawer = useDisclosure()
  const view_task_modal = useDisclosure()
  const router = useRouter();
  const navigate = (path) => router.push(path);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("newest");

  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'gray.200');
  const contentColor = useColorModeValue('gray.600', 'gray.400');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');

  const handleAddItem = (task) => {
    setCurrentTask(task);
    new_note_drawer.onOpen(true);
  };

  const handleUpdateItem = (task) => {
    setCurrentTask(task);
    edit_note_drawer.onOpen(true);
  };

  const handleDeleteItem = (task) => {
    setCurrentTask(task);
    delete_modal.onOpen(true);
  };

  const dispatch = useDispatch();

  const initFetch = useCallback(() => {
    dispatch(retrieveNotes());
  }, [dispatch])

  useEffect(() => {
    initFetch()
  }, [initFetch])

  // Refresh notes when edit drawer closes
  useEffect(() => {
    if (!edit_note_drawer.isOpen) {
      initFetch();
    }
  }, [edit_note_drawer.isOpen, initFetch]);

  // Refresh notes when new note drawer closes
  useEffect(() => {
    if (!new_note_drawer.isOpen) {
      initFetch();
    }
  }, [new_note_drawer.isOpen, initFetch]);

  // Get all unique categories and tags
  const { categories, tags } = useMemo(() => {
    const uniqueCategories = new Set();
    const uniqueTags = new Set();
    
    notes.forEach(note => {
      if (note.category) uniqueCategories.add(note.category);
      if (note.tags) note.tags.forEach(tag => uniqueTags.add(tag));
    });

    return {
      categories: Array.from(uniqueCategories),
      tags: Array.from(uniqueTags)
    };
  }, [notes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (note.description && note.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = !selectedCategory || note.category === selectedCategory;
        const matchesTags = selectedTags.length === 0 || 
                          (note.tags && selectedTags.every(tag => note.tags.includes(tag)));
        
        return matchesSearch && matchesCategory && matchesTags;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at) - new Date(a.created_at);
          case 'oldest':
            return new Date(a.created_at) - new Date(b.created_at);
          case 'title':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
  }, [notes, searchQuery, selectedCategory, selectedTags, sortBy]);

  const handleTagClick = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleViewItem = (note) => {
    setCurrentTask(note);
    view_task_modal.onOpen();
  };

  const NoteCard = React.memo(({ note }) => {
    const [content, setContent] = useState('');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    useEffect(() => {
      // description is Tiptap HTML (the real editor everywhere in this
      // app), not Lexical JSON -- no parsing needed, just strip tags for
      // a plain-text preview.
      setContent(htmlToText(note?.description));
    }, [note?.description]);

    return (
      <>
        <Card key={note.task_id} bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="sm">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/note-detail?id=${note.task_id}`)}
                  _hover={{ textDecoration: 'underline' }}
                  p={0}
                  h="auto"
                  fontWeight="semibold"
                >
                  {note.title}
                </Button>
              </Heading>
              <HStack spacing={1}>
                <IconButton
                  aria-label="View Note"
                  icon={<FiEye />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsViewModalOpen(true)}
                />
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FiMoreVertical />}
                    variant="ghost"
                    size="sm"
                  />
                  <MenuList>
                    <MenuItem icon={<FiEdit2 />} onClick={() => handleUpdateItem(note)}>
                      Edit
                    </MenuItem>
                    <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteItem(note)}>
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            </Flex>
          </CardHeader>
          <CardBody>
            <Stack divider={<StackDivider />} spacing="4">
              <Box>
                <Text fontSize="sm" color={textColor} noOfLines={3}>
                  {content}
                </Text>
              </Box>
            </Stack>
          </CardBody>
          <CardFooter>
            <Text fontSize="xs" color="gray.500">
              Updated: {formatLocalDateTime(note.updated_at)}
            </Text>
          </CardFooter>
        </Card>
        <NoteViewModal 
          isOpen={isViewModalOpen} 
          onClose={() => setIsViewModalOpen(false)} 
          note={note}
          onEdit={handleUpdateItem}
        />
      </>
    );
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!notesEnabled) {
    return <FeatureDisabledPage featureName="Notes" />;
  }

  return (
    <>
      <Head>
        <title>Notes</title>
        <meta name="description" content="App Description" />
        <meta name="theme-color" content="#008f68" />
      </Head>
      <DeleteTaskNoteModal currentTask={currentTask} disclosures={delete_modal} />
      <NewNoteDrawer task={currentTask} disclosures={new_note_drawer} />
      <EditNoteDrawer currentTask={currentTask} setCurrentTask={setCurrentTask} disclosures={edit_note_drawer}></EditNoteDrawer>
      <NoteViewModal 
        isOpen={view_task_modal.isOpen} 
        onClose={view_task_modal.onClose} 
        note={currentTask}
        onEdit={handleUpdateItem}
      />

      <Box minH="100vh" bg={bgColor}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box
          ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }}
          transition="all 0.3s ease"
          minH="100vh"
        >
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box p="3">
            <Stack spacing={6}>
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
                  <Heading size="lg" color={textColor}>Notes</Heading>
                  <Text color={subTextColor}>Manage your notes and documents</Text>
                </VStack>

                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="blue"
                  onClick={() => new_note_drawer.onOpen()}
                >
                  Add Note
                </Button>
              </Flex>

              <Tabs variant="enclosed" colorScheme="blue" w="full">
                <TabList>
                  <Tab>Board View</Tab>
                  <Tab>Table View</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel p={0} mt={4}>
                    <Grid 
                      templateColumns={{ 
                        base: "1fr", 
                        md: "repeat(2, 1fr)", 
                        lg: "repeat(3, 1fr)" 
                      }} 
                      gap={6}
                    >
                      {filteredNotes.map((note, index) => (
                        <GridItem key={index}>
                          <Box 
                            bg={cardBg}
                            borderWidth="1px"
                            borderColor={borderColor}
                            borderRadius="lg"
                            p={4}
                            _hover={{
                              transform: 'translateY(-2px)',
                              boxShadow: 'lg',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Flex justify="space-between" align="center" mb={4}>
                              <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                                {note.title}
                              </Text>
                              <HStack spacing={2}>
                                <IconButton
                                  icon={<FiEye />}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewItem(note)}
                                  aria-label="View Note"
                                />
                                <IconButton
                                  icon={<FiExternalLink />}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/note-detail?id=${note.task_id}`)}
                                  aria-label="Open in new page"
                                />
                                <UnifiedEditButton 
                                  item={note} 
                                  type="note" 
                                  onEdit={handleUpdateItem}
                                />
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteItem(note)}
                                  aria-label="Delete Note"
                                />
                              </HStack>
                            </Flex>
                            <Text 
                              fontSize="sm" 
                              color={contentColor} 
                              noOfLines={3}
                              mb={4}
                            >
                              {htmlToText(note.description, 150)}
                            </Text>
                            <Flex justify="space-between" align="center">
                              <Text fontSize="xs" color="gray.500">
                                Updated: {formatLocalDateTime(note.updated_at)}
                              </Text>
                              {note.tags && note.tags.length > 0 && (
                                <HStack spacing={1}>
                                  {note.tags.slice(0, 2).map((tag, i) => (
                                    <Tag key={i} size="sm" colorScheme="blue">
                                      {tag}
                                    </Tag>
                                  ))}
                                  {note.tags.length > 2 && (
                                    <Tag size="sm" colorScheme="gray">
                                      +{note.tags.length - 2}
                                    </Tag>
                                  )}
                                </HStack>
                              )}
                            </Flex>
                          </Box>
                        </GridItem>
                      ))}
                    </Grid>
                  </TabPanel>

                  <TabPanel p={0} mt={4}>
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Title</Th>
                            <Th>Content</Th>
                            <Th>Updated At</Th>
                            <Th>Tags</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredNotes.map((note, index) => (
                            <Tr key={index}>
                              <Td>
                                <Text 
                                  fontWeight="medium" 
                                  cursor="pointer"
                                  onClick={() => handleUpdateItem(note)}
                                >
                                  {note.title}
                                </Text>
                              </Td>
                              <Td>
                                <Text noOfLines={2}>
                                  {htmlToText(note.description, 150)}
                                </Text>
                              </Td>
                              <Td>{formatLocalDateTime(note.updated_at)}</Td>
                              <Td>
                                <HStack spacing={1}>
                                  {note.tags && note.tags.slice(0, 2).map((tag, i) => (
                                    <Tag key={i} size="sm" colorScheme="blue">
                                      {tag}
                                    </Tag>
                                  ))}
                                  {note.tags && note.tags.length > 2 && (
                                    <Tag size="sm" colorScheme="gray">
                                      +{note.tags.length - 2}
                                    </Tag>
                                  )}
                                </HStack>
                              </Td>
                              <Td>
                                <HStack spacing={2}>
                                  <IconButton
                                    icon={<FiEye />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewItem(note)}
                                    aria-label="View Note"
                                  />
                                  <IconButton
                                    icon={<FiExternalLink />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/note-detail?id=${note.task_id}`)}
                                    aria-label="Open in new page"
                                  />
                                  <UnifiedEditButton 
                                    item={note} 
                                    type="note" 
                                    onEdit={handleUpdateItem}
                                  />
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteItem(note)}
                                    aria-label="Delete Note"
                                  />
                                </HStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Drawer
        isOpen={isDrawerOpen}
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        size="md"
      >
        {/* ... existing drawer content ... */}
      </Drawer>
    </>
  );
}

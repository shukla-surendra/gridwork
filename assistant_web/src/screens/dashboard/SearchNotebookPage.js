import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { retrieveNotes } from "../../slices/tasks";
import {
  Box,
  Flex,
  Grid,
  Text,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Button,
  Icon,
  Stack,
  Badge,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Checkbox,
  CheckboxGroup,
  Heading,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  VStack,
} from "@chakra-ui/react";
import { 
  FiSearch, 
  FiFilter, 
  FiCalendar, 
  FiTag, 
  FiBook, 
  FiChevronDown,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';
import Navbar from "../../components/dashboard/Navbar";
import Header from "../../components/dashboard/Header";
import { formatLocalDateTime } from "../../utils/locale";

export default function SearchNotebookPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const menu_open = useDisclosure();
  const filterDrawer = useDisclosure();
  const dispatch = useDispatch();
  const notes = useSelector(state => state.tasks.notes);
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.900', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Get unique tags and categories for filters
  const allTags = [...new Set(notes.flatMap(note => note.tags || []))];
  const allCategories = [...new Set(notes.map(note => note.category))];

  const initFetch = useCallback(() => {
    dispatch(retrieveNotes());
  }, [dispatch]);

  useEffect(() => {
    initFetch();
  }, [initFetch]);

  // Filter notes based on search and filter criteria
  const filteredNotes = notes
    .filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || note.category === categoryFilter;
      
      const matchesTags = selectedTags.length === 0 || 
                         (note.tags && selectedTags.some(tag => note.tags.includes(tag)));

      return matchesSearch && matchesCategory && matchesTags;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'created_at') {
        return order * (new Date(a.created_at) - new Date(b.created_at));
      } else if (sortBy === 'title') {
        return order * a.title.localeCompare(b.title);
      }
      return 0;
    });

  const handleSort = (field) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <>
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
                  <Heading size="lg" color={textColor}>Search Notebooks</Heading>
                  <Text color={subTextColor}>Find and filter your notebooks</Text>
                </VStack>

                <Flex gap={2}>
                  <Menu>
                    <MenuButton as={Button} rightIcon={<FiChevronDown />} variant="outline">
                      Sort by: {sortBy.replace('_', ' ')}
                    </MenuButton>
                    <MenuList>
                      <MenuItem onClick={() => handleSort('created_at')}>
                        <Flex align="center" gap={2}>
                          <Icon as={sortBy === 'created_at' ? (sortOrder === 'asc' ? FiArrowUp : FiArrowDown) : null} />
                          Created Date
                        </Flex>
                      </MenuItem>
                      <MenuItem onClick={() => handleSort('title')}>
                        <Flex align="center" gap={2}>
                          <Icon as={sortBy === 'title' ? (sortOrder === 'asc' ? FiArrowUp : FiArrowDown) : null} />
                          Title
                        </Flex>
                      </MenuItem>
                    </MenuList>
                  </Menu>
                  <Button
                    leftIcon={<FiFilter />}
                    onClick={filterDrawer.onOpen}
                    variant="outline"
                  >
                    Filters
                  </Button>
                </Flex>
              </Flex>

              {/* Search Section */}
              <Box
                p={6}
                bg={cardBg}
                borderRadius="lg"
                boxShadow="sm"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <Stack spacing={6}>
                  <InputGroup maxW="600px">
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search notebooks by title or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      bg={cardBg}
                      borderColor={borderColor}
                      _hover={{ borderColor: 'blue.400' }}
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                    />
                  </InputGroup>

                  {/* Active Filters Display */}
                  {(selectedTags.length > 0 || categoryFilter !== 'all') && (
                    <Flex wrap="wrap" gap={2}>
                      {categoryFilter !== 'all' && (
                        <Badge colorScheme="blue" p={2} borderRadius="md">
                          Category: {categoryFilter}
                        </Badge>
                      )}
                      {selectedTags.map((tag) => (
                        <Badge key={tag} colorScheme="green" p={2} borderRadius="md">
                          Tag: {tag}
                        </Badge>
                      ))}
                    </Flex>
                  )}
                </Stack>
              </Box>

              {/* Results Section */}
              <Box
                p={6}
                bg={cardBg}
                borderRadius="lg"
                boxShadow="sm"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <Grid
                  templateColumns={{
                    base: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(3, 1fr)"
                  }}
                  gap={6}
                >
                  {filteredNotes.map((note) => (
                    <Box
                      key={note.note_id}
                      p={6}
                      bg={cardBg}
                      borderRadius="lg"
                      boxShadow="sm"
                      borderWidth="1px"
                      borderColor={borderColor}
                      _hover={{ 
                        transform: 'translateY(-2px)', 
                        transition: 'all 0.2s',
                        boxShadow: 'md'
                      }}
                    >
                      <Stack spacing={4}>
                        <Heading size="md" color={textColor}>
                          {note.title}
                        </Heading>
                        <Flex wrap="wrap" gap={2}>
                          <Badge 
                            colorScheme="blue"
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {note.category || 'Uncategorized'}
                          </Badge>
                          {note.tags?.map((tag, index) => (
                            <Badge 
                              key={index} 
                              colorScheme="purple"
                              px={2}
                              py={1}
                              borderRadius="full"
                              fontSize="xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </Flex>
                        <Text fontSize="sm" color={subTextColor}>
                          Created: {formatLocalDateTime(note.created_at)}
                        </Text>
                      </Stack>
                    </Box>
                  ))}
                </Grid>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Filter Drawer */}
      <Drawer
        isOpen={filterDrawer.isOpen}
        placement="right"
        onClose={filterDrawer.onClose}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent bg={cardBg}>
          <DrawerCloseButton color={textColor} />
          <DrawerHeader 
            borderBottomWidth="1px" 
            borderColor={borderColor}
            color={textColor}
          >
            Filter Notebooks
          </DrawerHeader>
          <DrawerBody>
            <Stack spacing={6}>
              <Box>
                <Text mb={2} color={textColor} fontWeight="medium">Category</Text>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  bg={cardBg}
                  color={textColor}
                  borderColor={borderColor}
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Text mb={2} color={textColor} fontWeight="medium">Tags</Text>
                <CheckboxGroup
                  value={selectedTags}
                  onChange={setSelectedTags}
                  colorScheme="blue"
                >
                  <Stack spacing={2}>
                    {allTags.map((tag) => (
                      <Checkbox 
                        key={tag} 
                        value={tag}
                        color={textColor}
                      >
                        {tag}
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </Box>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
} 
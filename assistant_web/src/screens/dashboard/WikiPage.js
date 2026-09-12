import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Heading, Text, VStack, HStack, Card, CardBody, Button, Icon,
  useColorModeValue, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, Input, useToast, Spinner, Center, IconButton,
} from '@chakra-ui/react';
import { FiBook, FiPlus, FiChevronRight, FiChevronDown, FiFileText } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import { fetchPages, createPage } from '../../slices/pages';

function NewPageModal({ isOpen, onClose, parentPageId }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = () => {
    if (!title.trim()) {
      toast({ title: "Page title can't be empty", status: "warning", duration: 2500, isClosable: true });
      return;
    }
    setIsSaving(true);
    dispatch(createPage({ title: title.trim(), parent_page_id: parentPageId || null }))
      .unwrap()
      .then((page) => {
        toast({ title: "Page created", status: "success", duration: 2000, isClosable: true });
        setTitle('');
        onClose();
        navigate(`/wiki/detail?pageId=${page.page_id}`);
      })
      .catch(err => toast({ title: "Couldn't create page", description: err, status: "error", duration: 3500, isClosable: true }))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{parentPageId ? 'New Sub-page' : 'New Page'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Input placeholder="Page title" value={title} onChange={e => setTitle(e.target.value)} autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }} />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleCreate} isLoading={isSaving}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function PageTreeNode({ page, childrenByParent, depth, onAddSubPage }) {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const [expanded, setExpanded] = useState(true);
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const children = childrenByParent[page.page_id] || [];

  return (
    <Box>
      <HStack
        pl={`${depth * 24}px`}
        py={1.5}
        px={2}
        borderRadius="md"
        cursor="pointer"
        _hover={{ bg: hoverBg }}
        onClick={() => navigate(`/wiki/detail?pageId=${page.page_id}`)}
      >
        <IconButton
          icon={children.length > 0 ? (expanded ? <FiChevronDown /> : <FiChevronRight />) : <Box w="14px" />}
          size="xs"
          variant="ghost"
          aria-label="Toggle sub-pages"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          visibility={children.length > 0 ? 'visible' : 'hidden'}
        />
        <Icon as={FiFileText} color="blue.500" />
        <Text fontSize="sm" fontWeight="medium" flex={1} noOfLines={1}>{page.title}</Text>
        <IconButton
          icon={<FiPlus />}
          size="xs"
          variant="ghost"
          aria-label="Add sub-page"
          onClick={(e) => { e.stopPropagation(); onAddSubPage(page.page_id); }}
        />
      </HStack>
      {expanded && children.map(child => (
        <PageTreeNode
          key={child.page_id}
          page={child}
          childrenByParent={childrenByParent}
          depth={depth + 1}
          onAddSubPage={onAddSubPage}
        />
      ))}
    </Box>
  );
}

export default function WikiPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const newPageModal = useDisclosure();
  const [newPageParent, setNewPageParent] = useState(null);
  const dispatch = useDispatch();
  const { pages, loading, error } = useSelector(state => state.pages);
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    dispatch(fetchPages());
  }, [dispatch]);

  const childrenByParent = useMemo(() => {
    const grouped = {};
    for (const page of pages) {
      const key = page.parent_page_id || 'root';
      (grouped[key] || (grouped[key] = [])).push(page);
    }
    return grouped;
  }, [pages]);

  const topLevelPages = childrenByParent.root || [];

  const openNewPageModal = (parentPageId = null) => {
    setNewPageParent(parentPageId);
    newPageModal.onOpen();
  };

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack justify="space-between" mb={6}>
            <Heading size="lg">Wiki</Heading>
            <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => openNewPageModal(null)}>
              New Page
            </Button>
          </HStack>

          {loading && <Center py={16}><Spinner /></Center>}
          {error && <Text color="red.500">{error}</Text>}
          {!loading && !error && pages.length === 0 && (
            <Center py={16}>
              <VStack spacing={3}>
                <Icon as={FiBook} boxSize={10} color="gray.400" />
                <Text color="gray.500">No pages yet. Create one to get started.</Text>
              </VStack>
            </Center>
          )}

          {topLevelPages.length > 0 && (
            <Card bg={cardBg}>
              <CardBody>
                <VStack align="stretch" spacing={0}>
                  {topLevelPages.map(page => (
                    <PageTreeNode
                      key={page.page_id}
                      page={page}
                      childrenByParent={childrenByParent}
                      depth={0}
                      onAddSubPage={openNewPageModal}
                    />
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}
        </Box>
      </Box>
      <NewPageModal isOpen={newPageModal.isOpen} onClose={newPageModal.onClose} parentPageId={newPageParent} />
    </Box>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, SimpleGrid, Card, CardBody, Button, Icon, HStack, VStack,
  useColorModeValue, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, Input, Textarea, useToast, Spinner, Center,
} from '@chakra-ui/react';
import { BsKanban } from 'react-icons/bs';
import { FiPlus } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import Navbar from '@/components/dashboard/Navbar';
import Header from '@/components/dashboard/Header';
import FeatureDisabledPage from '@/components/dashboard/FeatureDisabledPage';
import { selectIsModuleEnabled } from '@/slices/modules';
import { fetchBoards, createBoard } from '@/slices/boards';

function NewBoardModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: "Board name can't be empty", status: "warning", duration: 2500, isClosable: true });
      return;
    }
    setIsSaving(true);
    dispatch(createBoard({ name: name.trim(), description: description.trim() || null }))
      .unwrap()
      .then((board) => {
        toast({ title: "Board created", status: "success", duration: 2000, isClosable: true });
        setName('');
        setDescription('');
        onClose();
        navigate(`/boards/detail?boardId=${board.board_id}`);
      })
      .catch(err => toast({ title: "Couldn't create board", description: err, status: "error", duration: 3500, isClosable: true }))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>New Board</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Input placeholder="Board name" value={name} onChange={e => setName(e.target.value)} autoFocus />
            <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="teal" onClick={handleCreate} isLoading={isSaving}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function BoardsPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const newBoardModal = useDisclosure();
  const dispatch = useDispatch();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { boards, loading, error } = useSelector(state => state.boards);
  const boardsEnabled = useSelector((state) => selectIsModuleEnabled(state, 'boards'));
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  if (!boardsEnabled) {
    return <FeatureDisabledPage featureName="Boards" />;
  }

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack justify="space-between" mb={6}>
            <Heading size="lg">Boards</Heading>
            <Button leftIcon={<FiPlus />} colorScheme="teal" onClick={newBoardModal.onOpen}>
              New Board
            </Button>
          </HStack>

          {loading && <Center py={16}><Spinner /></Center>}
          {error && <Text color="red.500">{error}</Text>}
          {!loading && !error && boards.length === 0 && (
            <Center py={16}>
              <VStack spacing={3}>
                <Icon as={BsKanban} boxSize={10} color="gray.400" />
                <Text color="gray.500">No boards yet. Create one to get started.</Text>
              </VStack>
            </Center>
          )}

          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
            {boards.map(board => (
              <Card
                key={board.board_id}
                bg={cardBg}
                cursor="pointer"
                _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.15s ease"
                onClick={() => navigate(`/boards/detail?boardId=${board.board_id}`)}
              >
                <CardBody>
                  <HStack mb={2}>
                    <Icon as={BsKanban} color="teal.500" />
                    <Heading size="sm" noOfLines={1}>{board.name}</Heading>
                  </HStack>
                  <Text fontSize="sm" color="gray.500" noOfLines={2}>
                    {board.description || 'No description'}
                  </Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      </Box>
      <NewBoardModal isOpen={newBoardModal.isOpen} onClose={newBoardModal.onClose} />
    </Box>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, SimpleGrid, Card, CardBody, Button, Icon, HStack, VStack,
  useColorModeValue, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, Input, useToast, Spinner, Center, Badge,
} from '@chakra-ui/react';
import { FiDatabase, FiPlus } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import { fetchDatabases, createDatabase } from '../../slices/databases';

function NewDatabaseModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const [title, setTitle] = useState('');
  const [columnsText, setColumnsText] = useState('Name, Status');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = () => {
    if (!title.trim()) {
      toast({ title: "Database title can't be empty", status: 'warning', duration: 2500, isClosable: true });
      return;
    }
    const columns = columnsText.split(',').map(c => c.trim()).filter(Boolean);
    if (columns.length === 0) {
      toast({ title: 'Add at least one column', status: 'warning', duration: 2500, isClosable: true });
      return;
    }
    setIsSaving(true);
    dispatch(createDatabase({ title: title.trim(), properties: { columns } }))
      .unwrap()
      .then((database) => {
        toast({ title: 'Database created', status: 'success', duration: 2000, isClosable: true });
        setTitle('');
        setColumnsText('Name, Status');
        onClose();
        navigate(`/database/detail?databaseId=${database.database_id}`);
      })
      .catch(err => toast({ title: "Couldn't create database", description: err, status: 'error', duration: 3500, isClosable: true }))
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>New Database</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Input placeholder="Database title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            <VStack align="stretch" spacing={1}>
              <Text fontSize="sm" color="gray.500">Columns (comma-separated)</Text>
              <Input value={columnsText} onChange={e => setColumnsText(e.target.value)} placeholder="Name, Status, Owner" />
            </VStack>
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

export default function DatabasePage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const newDatabaseModal = useDisclosure();
  const dispatch = useDispatch();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { databases, loading, error } = useSelector(state => state.databases);
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    dispatch(fetchDatabases());
  }, [dispatch]);

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack justify="space-between" mb={6}>
            <Heading size="lg">Databases</Heading>
            <Button leftIcon={<FiPlus />} colorScheme="teal" onClick={newDatabaseModal.onOpen}>
              New Database
            </Button>
          </HStack>

          {loading && <Center py={16}><Spinner /></Center>}
          {error && <Text color="red.500">{error}</Text>}
          {!loading && !error && databases.length === 0 && (
            <Center py={16}>
              <VStack spacing={3}>
                <Icon as={FiDatabase} boxSize={10} color="gray.400" />
                <Text color="gray.500">No databases yet. Create one to get started.</Text>
              </VStack>
            </Center>
          )}

          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
            {databases.map(database => (
              <Card
                key={database.database_id}
                bg={cardBg}
                cursor="pointer"
                _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.15s ease"
                onClick={() => navigate(`/database/detail?databaseId=${database.database_id}`)}
              >
                <CardBody>
                  <HStack mb={2}>
                    <Icon as={FiDatabase} color="teal.500" />
                    <Heading size="sm" noOfLines={1}>{database.title}</Heading>
                  </HStack>
                  {database.description && (
                    <Text fontSize="sm" color="gray.500" noOfLines={2} mb={2}>{database.description}</Text>
                  )}
                  <HStack wrap="wrap">
                    {(database.properties?.columns || []).map(col => (
                      <Badge key={col} fontSize="2xs">{col}</Badge>
                    ))}
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      </Box>
      <NewDatabaseModal isOpen={newDatabaseModal.isOpen} onClose={newDatabaseModal.onClose} />
    </Box>
  );
}

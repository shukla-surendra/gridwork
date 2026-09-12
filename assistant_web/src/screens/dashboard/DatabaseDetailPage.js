import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box, Heading, HStack, IconButton, Button, Table, Thead, Tbody, Tr, Th, Td,
  Input, useColorModeValue, Spinner, Center, Text, useToast, TableContainer, Icon,
} from '@chakra-ui/react';
import { FiArrowLeft, FiPlus, FiTrash2, FiDatabase } from 'react-icons/fi';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import DatabaseService from '../../services/DatabaseService';
import DatabaseEntryService from '../../services/DatabaseEntryService';

export default function DatabaseDetailPage() {
  const router = useRouter();
  const { databaseId } = router.query;  const navigate = (path) => router.push(path);
  const toast = useToast();

  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [database, setDatabase] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const tableBg = useColorModeValue('white', 'gray.700');

  const columns = database?.properties?.columns?.length ? database.properties.columns : ['Name'];

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([DatabaseService.get(databaseId), DatabaseEntryService.getAll(databaseId)])
      .then(([dbRes, entriesRes]) => {
        setDatabase(dbRes.data);
        setEntries(entriesRes.data);
      })
      .catch(() => setError('Failed to load database'))
      .finally(() => setLoading(false));
  }, [databaseId]);

  useEffect(() => { load(); }, [load]);

  // The first column is always the entry's `title`; every other column is
  // keyed into `content` by column name.
  const getCellValue = (entry, column, index) => (index === 0 ? entry.title : (entry.content || {})[column] || '');

  const updateCellLocal = (entryId, column, index, value) => {
    setEntries((prev) => prev.map((e) => {
      if (e.entry_id !== entryId) return e;
      if (index === 0) return { ...e, title: value };
      return { ...e, content: { ...(e.content || {}), [column]: value } };
    }));
  };

  const saveEntry = (entryId) => {
    const entry = entries.find(e => e.entry_id === entryId);
    if (!entry) return;
    DatabaseEntryService.update(databaseId, entryId, { title: entry.title, content: entry.content })
      .catch(() => toast({ title: "Couldn't save row", status: 'error', duration: 3000, isClosable: true }));
  };

  const addRow = () => {
    DatabaseEntryService.create(databaseId, { title: 'New row', content: {} })
      .then((res) => setEntries((prev) => [...prev, res.data]))
      .catch(() => toast({ title: "Couldn't add row", status: 'error', duration: 3000, isClosable: true }));
  };

  const deleteRow = (entryId) => {
    DatabaseEntryService.remove(databaseId, entryId)
      .then(() => setEntries((prev) => prev.filter(e => e.entry_id !== entryId)))
      .catch(() => toast({ title: "Couldn't delete row", status: 'error', duration: 3000, isClosable: true }));
  };

  if (loading) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Spinner /></Center>
        </Box>
      </Box>
    );
  }

  if (error || !database) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Text color="red.500">{error || 'Database not found'}</Text></Center>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack mb={6}>
            <IconButton icon={<FiArrowLeft />} variant="ghost" size="sm" aria-label="Back to databases" onClick={() => navigate('/database')} />
            <Icon as={FiDatabase} color="teal.500" />
            <Heading size="lg">{database.title}</Heading>
          </HStack>

          <TableContainer bg={tableBg} borderRadius="lg" boxShadow="sm">
            <Table size="sm">
              <Thead>
                <Tr>
                  {columns.map(col => <Th key={col}>{col}</Th>)}
                  <Th w="1"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {entries.map(entry => (
                  <Tr key={entry.entry_id}>
                    {columns.map((col, index) => (
                      <Td key={col}>
                        <Input
                          size="sm"
                          variant="unstyled"
                          value={getCellValue(entry, col, index)}
                          onChange={e => updateCellLocal(entry.entry_id, col, index, e.target.value)}
                          onBlur={() => saveEntry(entry.entry_id)}
                        />
                      </Td>
                    ))}
                    <Td>
                      <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red" aria-label="Delete row" onClick={() => deleteRow(entry.entry_id)} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          <Button leftIcon={<FiPlus />} variant="ghost" size="sm" mt={3} onClick={addRow}>
            Add row
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

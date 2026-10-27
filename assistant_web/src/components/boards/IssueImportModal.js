import React, { useRef, useState } from 'react';
import {
  Alert, AlertDescription, AlertIcon, Box, Button, HStack, Link, List, ListItem, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, OrderedList, SimpleGrid,
  Stat, StatLabel, StatNumber, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useColorModeValue,
} from '@chakra-ui/react';
import BoardService from '../../services/BoardService';
import { labelForStatus } from '../../utils/taskStatus';

const MAX_BYTES = 10 * 1024 * 1024;
const TYPE_LABELS = { epic: 'Epics', story: 'Stories', task: 'Tasks', bug: 'Bugs', subtask: 'Sub-tasks' };
const CREATED_LABELS = [
  ['issues', 'Issues'], ['epics', 'Epics'], ['sprints', 'Sprints'],
  ['comments', 'Comments'], ['worklogs', 'Worklogs'], ['links', 'Issue links'],
];

// Import a CSV issue export into this board: pick the file, review what
// will be created (a dry run on the server), then import.
export default function IssueImportModal({ isOpen, onClose, boardId, boardName, onImported }) {
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [csv, setCsv] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const boxBorder = useColorModeValue('gray.200', 'gray.600');

  const reset = () => {
    setFile(null); setCsv(null); setPreview(null); setResult(null); setError(null); setBusy(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const close = () => {
    if (result) onImported?.();
    reset();
    onClose();
  };

  const choose = async (event) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    reset();
    setFile(picked);
    if (picked.size > MAX_BYTES) {
      setError('The file is larger than 10 MB. Export fewer issues at a time.');
      return;
    }
    setBusy(true);
    try {
      const text = await picked.text();
      setCsv(text);
      const res = await BoardService.importIssues(boardId, text, true);
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't read the file.");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await BoardService.importIssues(boardId, csv, false);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'The import failed. Nothing was saved.');
    } finally {
      setBusy(false);
    }
  };

  const summary = result || preview;
  const nothingToImport = preview && preview.created.issues === 0 && preview.created.epics === 0;

  return (
    <Modal isOpen={isOpen} onClose={close} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="lg">Import issues</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={5}>
            {!result && (
              <Box>
                <Text fontSize="sm" mb={2}>Bring issues into <b>{boardName}</b> from a CSV export:</Text>
                <OrderedList fontSize="sm" color={mutedColor} spacing={1} pl={1}>
                  <ListItem>In the tool you're moving from, find the issues you want to bring over.</ListItem>
                  <ListItem>Export them as <b>CSV with all fields</b>, so comments, sprints and logged time come along.</ListItem>
                  <ListItem>Select the downloaded file below. You'll see what will be imported before anything is saved.</ListItem>
                </OrderedList>
                <HStack mt={4} spacing={3}>
                  <Button size="sm" onClick={() => fileInput.current?.click()} isLoading={busy && !preview} loadingText="Reading file">
                    {file ? 'Choose a different file' : 'Choose CSV file'}
                  </Button>
                  <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={choose} />
                  {file && <Text fontSize="sm" color={mutedColor} noOfLines={1}>{file.name}</Text>}
                </HStack>
                <Text fontSize="xs" color={mutedColor} mt={2}>
                  No export handy? <Link href="/samples/issue-import-sample.csv" download color="blue.500">Download a sample file</Link>.
                </Text>
              </Box>
            )}

            {error && (
              <Alert status="error" borderRadius="md" fontSize="sm">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert status="success" borderRadius="md" fontSize="sm">
                <AlertIcon />
                <AlertDescription>
                  Imported {result.created.issues} {result.created.issues === 1 ? 'issue' : 'issues'}
                  {result.created.epics ? ` and ${result.created.epics} ${result.created.epics === 1 ? 'epic' : 'epics'}` : ''} into {boardName}.
                  Each one keeps its original key, shown at the bottom of its details.
                </AlertDescription>
              </Alert>
            )}

            {summary && (
              <>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    {result ? 'Created' : 'Will be created'}
                  </Text>
                  <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                    {CREATED_LABELS.map(([key, label]) => (
                      <Stat key={key} borderWidth="1px" borderColor={boxBorder} borderRadius="md" px={3} py={2}>
                        <StatLabel color={mutedColor}>{label}</StatLabel>
                        <StatNumber fontSize="xl">{summary.created[key]}</StatNumber>
                      </Stat>
                    ))}
                  </SimpleGrid>
                  <Text fontSize="xs" color={mutedColor} mt={2}>
                    The file has {summary.issues.total} issues:{' '}
                    {Object.entries(summary.issues.by_type).map(([type, n]) => `${n} ${(TYPE_LABELS[type] || type).toLowerCase()}`).join(', ')}.
                    {summary.created.subtasks ? ` ${summary.created.subtasks} sub-tasks will stay under their parent issue.` : ''}
                  </Text>
                </Box>

                {summary.skipped_count > 0 && (
                  <Alert status="info" borderRadius="md" fontSize="sm">
                    <AlertIcon />
                    <AlertDescription>
                      {summary.skipped_count} skipped: already on this board from an earlier import (or an epic with the same name exists).
                    </AlertDescription>
                  </Alert>
                )}

                {summary.unmatched_people.length > 0 && (
                  <Alert status="warning" borderRadius="md" fontSize="sm" alignItems="flex-start">
                    <AlertIcon />
                    <AlertDescription>
                      <Text>
                        Not members of this workspace: <b>{summary.unmatched_people.join(', ')}</b>.
                      </Text>
                      <Text mt={1}>
                        Their issues will be unassigned (their name is kept on the issue), their comments are kept with their name,
                        and their logged time counts toward each issue's total but not toward a timesheet. Invite them first to match them.
                      </Text>
                    </AlertDescription>
                  </Alert>
                )}

                {!result && preview.sample.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>First issues</Text>
                    <Box borderWidth="1px" borderColor={boxBorder} borderRadius="md" overflowX="auto">
                      <Table size="sm">
                        <Thead>
                          <Tr><Th>Original key</Th><Th>Summary</Th><Th>Type</Th><Th>Status here</Th></Tr>
                        </Thead>
                        <Tbody>
                          {preview.sample.map((row) => (
                            <Tr key={row.source_key || row.title}>
                              <Td whiteSpace="nowrap">{row.source_key}</Td>
                              <Td maxW="280px"><Text noOfLines={1}>{row.title}</Text></Td>
                              <Td>{(TYPE_LABELS[row.type] || row.type).replace(/s$/, '')}</Td>
                              <Td whiteSpace="nowrap">{labelForStatus(row.status)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </Box>
                )}

                {summary.warnings.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={1}>Notes</Text>
                    <List fontSize="xs" color={mutedColor} spacing={1}>
                      {summary.warnings.map((w) => <ListItem key={w}>• {w}</ListItem>)}
                    </List>
                  </Box>
                )}
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          {result ? (
            <Button size="sm" colorScheme="teal" onClick={close}>Done</Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" mr={2} onClick={close}>Cancel</Button>
              <Button size="sm" colorScheme="teal" onClick={runImport} isLoading={busy && !!preview} loadingText="Importing"
                isDisabled={!preview || nothingToImport}>
                {preview && !nothingToImport ? `Import ${preview.created.issues + preview.created.epics} items` : 'Import'}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

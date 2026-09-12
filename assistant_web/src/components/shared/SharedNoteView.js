import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Tag,
  TagLabel, Spinner, useToast, useColorModeValue, Divider,
  Icon, Button, Alert, AlertIcon, AlertTitle, AlertDescription,
  Image
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { FaArrowLeft, FaExclamationTriangle, FaLock } from 'react-icons/fa';
import TaskDataService from '../../services/taskservice';
import { formatLocalDateTime } from '../../utils/locale';
import RichTextEditor from '../dashboard/editor/RichTextEditor';

const SharedNoteView = () => {
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { noteId } = router.query;  const navigate = (path) => router.push(path);
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await TaskDataService.getPublicNote(noteId);
        if (response && response.data) {
          if (!response.data.public_access) {
            throw new Error('PRIVATE_NOTE');
          }
          setNote(response.data);
        } else {
          throw new Error('NOT_FOUND');
        }
      } catch (error) {
        console.error('Error fetching shared note:', error);
        if (error.message === 'PRIVATE_NOTE') {
          setError({
            type: 'private',
            message: 'This note is not publicly accessible'
          });
        } else if (error.message === 'NOT_FOUND' || error.response?.status === 404) {
          setError({
            type: 'not_found',
            message: 'The note you are looking for does not exist'
          });
        } else {
          setError({
            type: 'error',
            message: error.response?.data?.detail || 'Failed to load the shared note'
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [noteId]);

  const renderError = () => {
    const errorConfig = {
      private: {
        icon: FaLock,
        title: 'Private Note',
        description: 'This note is not publicly accessible. Please contact the note owner for access.',
        status: 'warning'
      },
      not_found: {
        icon: FaExclamationTriangle,
        title: 'Note Not Found',
        description: 'The note you are looking for does not exist or has been removed.',
        status: 'error'
      },
      error: {
        icon: FaExclamationTriangle,
        title: 'Error Loading Note',
        description: error?.message || 'An unexpected error occurred while loading the note.',
        status: 'error'
      }
    };

    const config = errorConfig[error?.type] || errorConfig.error;

    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={bgColor}
      >
        <Alert
          status={config.status}
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="300px"
          maxW="500px"
          borderRadius="lg"
          boxShadow="md"
        >
          <Icon as={config.icon} boxSize="40px" mb={4} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            {config.title}
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            {config.description}
          </AlertDescription>
          <Button
            leftIcon={<FaArrowLeft />}
            mt={6}
            colorScheme={config.status}
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </Alert>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={bgColor}
      >
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  if (error) {
    return renderError();
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between">
            <Button
              leftIcon={<FaArrowLeft />}
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
            <Tag colorScheme="green" size="lg">
              <TagLabel>Public Note</TagLabel>
            </Tag>
          </HStack>

          <VStack spacing={4} align="stretch">
            <Heading size="xl" color={textColor}>
              {note.title}
            </Heading>
            <Text fontSize="sm" color={mutedColor}>
              Last updated: {formatLocalDateTime(note.updated_at)}
            </Text>
          </VStack>

          <Divider />

          <Box>
            <RichTextEditor
              value={note.description || ''}
              onChange={() => {}}
              editable={false}
            />
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default SharedNoteView; 
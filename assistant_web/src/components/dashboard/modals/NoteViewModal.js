import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  useColorModeValue,
  IconButton,
  useToast,
  Input,
  InputGroup,
  InputRightElement,
  Box,
  Divider,
} from '@chakra-ui/react';
import { FaShare, FaCopy, FaCheck } from 'react-icons/fa';
import { formatLocalDateTime } from '../../../utils/locale';
import RichTextEditor from '../editor/RichTextEditor';

export default function NoteViewModal({ isOpen, onClose, note, onEdit }) {
  const [isCopied, setIsCopied] = useState(false);
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const handleShare = () => {
    if (note.public_access) {
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/shared/note?noteId=${note.task_id}`;
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Note is not public",
        description: "Enable public access to share this note",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>
          <VStack align="stretch" spacing={2}>
            <HStack justify="space-between">
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {note?.title}
              </Text>
              <Badge
                colorScheme={note?.public_access ? "green" : "gray"}
                px={2}
                py={1}
                borderRadius="full"
                fontSize="xs"
              >
                {note?.public_access ? "Public" : "Private"}
              </Badge>
            </HStack>
            <Text fontSize="sm" color={mutedColor}>
              Last updated: {formatLocalDateTime(note?.updated_at)}
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box>
              <RichTextEditor
                value={note?.description || ''}
                onChange={() => {}}
                editable={false}
              />
            </Box>
            {note?.public_access && (
              <>
                <Divider />
                <Box>
                  <Text fontSize="sm" color={mutedColor} mb={2}>
                    Share this note with others:
                  </Text>
                  <InputGroup size="md">
                    <Input
                      value={`${window.location.origin}/shared/note?noteId=${note.task_id}`}
                      isReadOnly
                      pr="4.5rem"
                    />
                    <InputRightElement width="4.5rem">
                      <IconButton
                        h="1.75rem"
                        size="sm"
                        icon={isCopied ? <FaCheck /> : <FaCopy />}
                        onClick={handleShare}
                        colorScheme={isCopied ? "green" : "blue"}
                      />
                    </InputRightElement>
                  </InputGroup>
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
          <Button colorScheme="blue" onClick={onEdit}>
            Edit
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 
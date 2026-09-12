import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  Box,
  Heading,
  HStack,
  Tag,
  TagLabel,
  Avatar,
  AvatarGroup,
  Icon,
  useColorModeValue,
  Divider,
  Badge
} from '@chakra-ui/react';
import { FiEdit2, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';

export default function ArticleViewModal({ isOpen, onClose, article, onEdit }) {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (!article) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader borderBottomWidth="1px">
          <Box>
            <Heading size="lg" mb={2}>{article.title}</Heading>
            <HStack spacing={4}>
              <Badge colorScheme="blue">{article.section}</Badge>
              <HStack>
                <Icon as={FiClock} />
                <Text fontSize="sm" color="gray.500">
                  Last updated {format(new Date(article.updatedAt), 'MMM d, yyyy')}
                </Text>
              </HStack>
              <HStack>
                <Icon as={FiUser} />
                <Text fontSize="sm" color="gray.500">
                  By {article.author || 'Anonymous'}
                </Text>
              </HStack>
            </HStack>
          </Box>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={6}>
          <Box mb={6}>
            {article.tags && article.tags.length > 0 && (
              <HStack spacing={2} mb={4}>
                {article.tags.map((tag) => (
                  <Tag
                    key={tag}
                    size="md"
                    borderRadius="full"
                    variant="subtle"
                    colorScheme="blue"
                  >
                    <TagLabel>{tag}</TagLabel>
                  </Tag>
                ))}
              </HStack>
            )}
            <Text whiteSpace="pre-wrap">{article.content}</Text>
          </Box>
          <Divider my={4} />
          <Box>
            <Text fontWeight="bold" mb={2}>Contributors</Text>
            <AvatarGroup size="md" max={5}>
              <Avatar name="User 1" />
              <Avatar name="User 2" />
              <Avatar name="User 3" />
            </AvatarGroup>
          </Box>
        </ModalBody>

        <ModalFooter borderTopWidth="1px">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
          <Button
            leftIcon={<Icon as={FiEdit2} />}
            colorScheme="blue"
            onClick={() => {
              onEdit(article);
              onClose();
            }}
          >
            Edit Article
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 
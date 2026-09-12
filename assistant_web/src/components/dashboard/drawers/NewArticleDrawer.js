import React, { useState } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Select,
  useColorModeValue,
  Box,
  HStack,
  Icon,
  Tag,
  TagLabel,
  TagCloseButton,
  VStack,
  useToast
} from '@chakra-ui/react';
import { FiPlus, FiX } from 'react-icons/fi';
import RichTextEditor from '../editor/RichTextEditor';

export default function NewArticleDrawer({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [section, setSection] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const toast = useToast();

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim() || !section) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const article = {
      title,
      content,
      section,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(article);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      size="xl"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          Create New Article
        </DrawerHeader>

        <DrawerBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                placeholder="Enter article title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Section</FormLabel>
              <Select
                placeholder="Select section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                <option value="getting-started">Getting Started</option>
                <option value="features-guide">Features Guide</option>
                <option value="team-collaboration">Team Collaboration</option>
                <option value="best-practices">Best Practices</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Tags</FormLabel>
              <HStack>
                <Input
                  placeholder="Add tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button
                  leftIcon={<Icon as={FiPlus} />}
                  onClick={handleAddTag}
                >
                  Add
                </Button>
              </HStack>
              <Box mt={2}>
                {tags.map((tag) => (
                  <Tag
                    key={tag}
                    size="md"
                    borderRadius="full"
                    variant="solid"
                    colorScheme="blue"
                    mr={2}
                    mb={2}
                  >
                    <TagLabel>{tag}</TagLabel>
                    <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                  </Tag>
                ))}
              </Box>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Content</FormLabel>
              <RichTextEditor
                value={content || ''}
                onChange={(newContent) => {
                  setContent(newContent);
                }}
              />
            </FormControl>
          </VStack>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px">
          <Button variant="outline" mr={3} onClick={onClose}>
            Close
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save Article
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 
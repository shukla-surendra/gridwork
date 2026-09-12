import React, { useState } from "react";
import {
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, DrawerFooter, Box, Button, FormControl,
  Input, Menu, MenuButton, MenuItem, MenuList, Icon, Text, useColorModeValue,
  Badge, Tooltip, useToast, IconButton, VStack, HStack, Divider, Tag,
  TagLabel, TagCloseButton, Wrap, Select, InputGroup, InputLeftElement,
  InputRightElement, Spinner, Flex, Popover, PopoverTrigger, PopoverContent,
  PopoverBody, PopoverArrow, Portal, MenuDivider, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Switch,
  FormLabel,
} from "@chakra-ui/react";
import { useDispatch } from "react-redux";
import { createTask } from "../../../slices/tasks";
import { 
  FaArrowLeft, FaSave, FaEye, FaEyeSlash, FaShare, FaDownload, 
  FaFilePdf, FaFileWord, FaFileAlt, FaTags, FaFolder, FaEllipsisH,
  FaCopy, FaCheck
} from "react-icons/fa";
import { FiMoreHorizontal, FiPlus, FiSearch } from "react-icons/fi";
import RichTextEditor from '../editor/RichTextEditor';
import ConfigService from "../../../utils/config";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import TurndownService from 'turndown';

// Note templates
const NOTE_TEMPLATES = [
  { id: 'meeting', name: 'Meeting Notes', description: 'Template for meeting notes' },
  { id: 'todo', name: 'To-Do List', description: 'Template for task lists' },
  { id: 'project', name: 'Project Notes', description: 'Template for project documentation' },
  { id: 'code', name: 'Code Snippet', description: 'Template for code documentation' },
];

// Available categories
const AVAILABLE_CATEGORIES = [
  'Work', 'Personal', 'Study', 'Project', 'Ideas', 'Code', 'Documentation'
];

export default function NewNoteDrawer(props) {
  const initialTaskState = {
    task_id: null,
    title: "",
    description: "",
    priority: "Medium",
    task_type: 'note',
    public_access: false,
    tags: [],
    category: ""
  };

  const [size] = useState('xl');
  const { isOpen, onClose } = props.disclosures;
  const [currentTask, setCurrentTask] = useState(initialTaskState);
  const dispatch = useDispatch();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const { isOpen: isShareModalOpen, onOpen: onShareModalOpen, onClose: onShareModalClose } = useDisclosure();
  const [shareLink, setShareLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const { isOpen: isPublishAlertOpen, onOpen: onPublishAlertOpen, onClose: onPublishAlertClose } = useDisclosure();
  const cancelRef = React.useRef();

  // Theme colors
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const inputBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.800", "white");
  const mutedColor = useColorModeValue("gray.600", "gray.400");
  const hoverBg = useColorModeValue("gray.100", "gray.700");

  const handleInputChange = event => {
    const { name, value } = event.target;
    setCurrentTask({ ...currentTask, [name]: value });
  };

  const handlePublicAccessToggle = () => {
    setCurrentTask(prev => ({ ...prev, public_access: !prev.public_access }));
    if (!currentTask.public_access) {
      onPublishAlertOpen();
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !currentTask.tags?.includes(newTag.trim())) {
      setCurrentTask(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setCurrentTask(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleApplyTemplate = (template) => {
    let initialContent = "";
    switch (template.id) {
      case 'meeting':
        initialContent = `
          <h1>Meeting Notes</h1>
          <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
          <p>Attendees:</p>
          <ul>
            <li>Add attendee names here</li>
          </ul>
          <p>Agenda:</p>
          <ul>
            <li>Add agenda items here</li>
          </ul>
          <p>Action Items:</p>
          <ul>
            <li>Add action items here</li>
          </ul>
          <p>Notes:</p>
          <p>Add additional notes here</p>
        `;
        break;
      case 'todo':
        initialContent = `
          <h1>To-Do List</h1>
          <p>Priority Tasks:</p>
          <ul>
            <li><strong>☐</strong> Add high-priority tasks here</li>
          </ul>
          <p>Regular Tasks:</p>
          <ul>
            <li><strong>☐</strong> Add regular tasks here</li>
          </ul>
          <p>Completed Tasks:</p>
          <ul>
            <li><strong>☑</strong> Add completed tasks here</li>
          </ul>
        `;
        break;
      case 'project':
        initialContent = `
          <h1>Project Documentation</h1>
          <p>Project Overview:</p>
          <p>Add project description here</p>
          <p>Goals:</p>
          <ul>
            <li>Add project goals here</li>
          </ul>
          <p>Timeline:</p>
          <ul>
            <li>Add project timeline here</li>
          </ul>
          <p>Resources:</p>
          <ul>
            <li>Add project resources here</li>
          </ul>
        `;
        break;
      case 'code':
        initialContent = `
          <h1>Code Documentation</h1>
          <p>Description:</p>
          <p>Add code description here</p>
          <p>Implementation:</p>
          <pre><code class="language-javascript">// Add your code here</code></pre>
          <p>Usage:</p>
          <pre><code class="language-javascript">// Add usage examples here</code></pre>
          <p>Notes:</p>
          <p>Add additional notes here</p>
        `;
        break;
      default:
        initialContent = '<p>Start writing...</p>';
    }
    
    // Update the task state with the HTML content
    setCurrentTask(prev => ({
      ...prev,
      description: initialContent
    }));
  };

  const handleExport = async (format) => {
    if (format === 'pdf') {
      try {
        // Create a temporary div to render the content
        const tempDiv = document.createElement('div');
        tempDiv.style.padding = '20px';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.style.color = 'black';
        
        // Add title
        const title = document.createElement('h1');
        title.textContent = currentTask.title || 'Untitled';
        title.style.fontSize = '24px';
        title.style.marginBottom = '20px';
        tempDiv.appendChild(title);
        
        // Add content - directly use the HTML content
        const content = document.createElement('div');
        content.innerHTML = currentTask.description || '';
        content.style.fontSize = '14px';
        content.style.lineHeight = '1.6';
        content.style.fontFamily = 'Arial, sans-serif';
        
        // Style the content
        const style = document.createElement('style');
        style.textContent = `
          h1 { font-size: 24px; margin-bottom: 20px; }
          h2 { font-size: 20px; margin: 15px 0; }
          p { margin: 10px 0; }
          ul, ol { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
          code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        `;
        tempDiv.appendChild(style);
        tempDiv.appendChild(content);
        
        // Add metadata
        const metadata = document.createElement('div');
        metadata.style.marginTop = '20px';
        metadata.style.fontSize = '12px';
        metadata.style.color = '#666';
        metadata.style.borderTop = '1px solid #eee';
        metadata.style.paddingTop = '10px';
        metadata.innerHTML = `
          <p>Created: ${new Date().toLocaleString()}</p>
          ${currentTask.tags?.length ? `<p>Tags: ${currentTask.tags.join(', ')}</p>` : ''}
        `;
        tempDiv.appendChild(metadata);
        
        // Add to document temporarily
        document.body.appendChild(tempDiv);
        
        // Convert to canvas with better quality
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: tempDiv.scrollWidth,
          windowHeight: tempDiv.scrollHeight
        });
        
        // Create PDF with proper dimensions
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add image with better quality
        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Save the PDF
        pdf.save(`${currentTask.title || 'note'}.pdf`);
        
        // Clean up
        document.body.removeChild(tempDiv);
        
        toast({
          title: "Success",
          description: "Note exported as PDF successfully",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error exporting to PDF:', error);
        toast({
          title: "Error",
          description: "Failed to export note as PDF",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else if (format === 'docx') {
      try {
        // Create a temporary div to parse HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentTask.description || '';
        
        // Function to convert HTML to Word document elements
        const convertHtmlToWordElements = (element) => {
          const elements = [];
          
          // Process each child node
          Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              // Handle text nodes
              if (node.textContent.trim()) {
                elements.push(
                  new Paragraph({
                    text: node.textContent,
                    spacing: { after: 100 }
                  })
                );
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // Handle different HTML elements
              switch (node.tagName.toLowerCase()) {
                case 'h1':
                  elements.push(
                    new Paragraph({
                      text: node.textContent,
                      heading: HeadingLevel.HEADING_1,
                      spacing: { after: 200 }
                    })
                  );
                  break;
                case 'h2':
                  elements.push(
                    new Paragraph({
                      text: node.textContent,
                      heading: HeadingLevel.HEADING_2,
                      spacing: { after: 150 }
                    })
                  );
                  break;
                case 'h3':
                  elements.push(
                    new Paragraph({
                      text: node.textContent,
                      heading: HeadingLevel.HEADING_3,
                      spacing: { after: 100 }
                    })
                  );
                  break;
                case 'p':
                  elements.push(
                    new Paragraph({
                      text: node.textContent,
                      spacing: { after: 100 }
                    })
                  );
                  break;
                case 'ul':
                case 'ol':
                  Array.from(node.children).forEach(li => {
                    elements.push(
                      new Paragraph({
                        text: `• ${li.textContent}`,
                        spacing: { after: 50 }
                      })
                    );
                  });
                  break;
                case 'li':
                  elements.push(
                    new Paragraph({
                      text: `• ${node.textContent}`,
                      spacing: { after: 50 }
                    })
                  );
                  break;
                case 'code':
                  elements.push(
                    new Paragraph({
                      text: node.textContent,
                      spacing: { after: 100 },
                      style: 'code'
                    })
                  );
                  break;
                default:
                  // Recursively process other elements
                  elements.push(...convertHtmlToWordElements(node));
              }
            }
          });
          
          return elements;
        };

        // Create a new document
        const doc = new Document({
          styles: {
            paragraphStyles: [
              {
                id: 'code',
                name: 'Code',
                run: {
                  font: 'Courier New',
                  size: 24,
                  color: '333333',
                },
                paragraph: {
                  spacing: {
                    before: 100,
                    after: 100,
                  },
                  border: {
                    bottom: {
                      color: 'auto',
                      space: 1,
                      style: 'single',
                      size: 6,
                    },
                  },
                },
              },
            ],
          },
          sections: [{
            properties: {},
            children: [
              // Title
              new Paragraph({
                text: currentTask.title || 'Untitled',
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: {
                  after: 200,
                },
              }),
              // Content
              ...convertHtmlToWordElements(tempDiv),
              // Metadata
              new Paragraph({
                text: `Created: ${new Date().toLocaleString()}`,
                spacing: {
                  after: 100,
                },
              }),
              ...(currentTask.tags?.length ? [
                new Paragraph({
                  text: `Tags: ${currentTask.tags.join(', ')}`,
                  spacing: {
                    after: 100,
                  },
                })
              ] : []),
            ],
          }],
        });

        // Generate and download the document
        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentTask.title || 'note'}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Note exported as Word document successfully",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error exporting to Word:', error);
        toast({
          title: "Error",
          description: "Failed to export note as Word document",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else if (format === 'md') {
      try {
        // Create a temporary div to parse HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentTask.description || '';
        
        // Initialize Turndown service
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
          emDelimiter: '*',
          bulletListMarker: '-',
          strongDelimiter: '**'
        });

        // Add custom rules for better Markdown conversion
        turndownService.addRule('codeBlocks', {
          filter: ['pre', 'code'],
          replacement: function(content, node) {
            const language = node.getAttribute('class')?.replace('language-', '') || '';
            return `\n\`\`\`${language}\n${content}\n\`\`\`\n`;
          }
        });

        // Convert HTML to Markdown
        const markdown = turndownService.turndown(tempDiv.innerHTML);

        // Create the full Markdown content
        const fullMarkdown = `# ${currentTask.title || 'Untitled'}\n\n${markdown}\n\n---\n\nCreated: ${new Date().toLocaleString()}\n${currentTask.tags?.length ? `Tags: ${currentTask.tags.join(', ')}` : ''}`;

        // Create and download the file
        const blob = new Blob([fullMarkdown], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentTask.title || 'note'}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Note exported as Markdown successfully",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error exporting to Markdown:', error);
        toast({
          title: "Error",
          description: "Failed to export note as Markdown",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const saveNote = async () => {
    setIsLoading(true);
    
    try {
      // Get workspace ID and user ID from config
      const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
      const user_id = ConfigService.getUserId();
      
      const payload = {
        ...currentTask,
        workspace_id,
        user_id,
        task_type: 'note',  // Ensure task_type is set
        description: currentTask.description // Send HTML content directly
      };

      await dispatch(createTask(payload)).unwrap();
      toast({
        title: "Success",
        description: "Note created successfully",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create note",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    if (currentTask.public_access) {
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/shared/note?noteId=${currentTask.task_id}`;
      setShareLink(shareUrl);
      onShareModalOpen();
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      <Drawer 
        onClose={onClose} 
        isOpen={isOpen} 
        size={size}
        placement="right"
      >
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent 
          bg={bgColor} 
          borderLeft="1px" 
          borderColor={borderColor}
          boxShadow="xl"
        >
          <DrawerCloseButton top={4} right={4} zIndex={2} />
          
          {/* Header */}
          <DrawerHeader 
            borderBottomWidth="1px" 
            borderColor={borderColor}
            py={4}
            px={6}
          >
            <Flex justify="space-between" align="center" position="relative">
              <HStack spacing={4}>
                <IconButton
                  icon={<Icon as={FaArrowLeft} />}
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Back"
                />
                <Badge 
                  colorScheme={currentTask?.public_access ? "green" : "gray"}
                  px={2}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                >
                  {currentTask?.public_access ? "Public" : "Private"}
                </Badge>
              </HStack>
              <HStack spacing={2} position="absolute" right="4" zIndex={1}>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<Icon as={FiMoreHorizontal} />}
                    variant="ghost"
                    size="sm"
                    aria-label="More options"
                  />
                  <MenuList shadow="lg" py={2}>
                    <MenuItem 
                      icon={<Icon as={currentTask?.public_access ? FaEyeSlash : FaEye} />}
                      onClick={handlePublicAccessToggle}
                      py={2}
                    >
                      {currentTask?.public_access ? "Unpublish" : "Publish"}
                    </MenuItem>
                    <MenuItem icon={<Icon as={FaShare} />} py={2} onClick={handleShare}>
                      Share
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem 
                      icon={<Icon as={FaFilePdf} />} 
                      py={2}
                      onClick={() => handleExport('pdf')}
                    >
                      Export as PDF
                    </MenuItem>
                    <MenuItem 
                      icon={<Icon as={FaFileWord} />} 
                      py={2}
                      onClick={() => handleExport('docx')}
                    >
                      Export as Word
                    </MenuItem>
                    <MenuItem 
                      icon={<Icon as={FaFileAlt} />} 
                      py={2}
                      onClick={() => handleExport('md')}
                    >
                      Export as Markdown
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            </Flex>
          </DrawerHeader>

          {/* Body */}
          <DrawerBody px={6} py={4}>
            <VStack spacing={6} align="stretch">
              {/* Title Input */}
              <FormControl>
                <Input
                  placeholder="Untitled"
                  name="title"
                  value={currentTask?.title || ''}
                  onChange={handleInputChange}
                  size="lg"
                  fontSize="2xl"
                  fontWeight="bold"
                  variant="unstyled"
                  px={0}
                  _placeholder={{ color: mutedColor }}
                />
              </FormControl>

              <Divider />

              {/* Metadata Section */}
              <VStack spacing={4} align="stretch">
                {/* Category */}
                <HStack spacing={3}>
                  <Icon as={FaFolder} color={mutedColor} />
                  <Popover placement="bottom-start">
                    <PopoverTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        rightIcon={<Icon as={FiPlus} />}
                        color={mutedColor}
                        _hover={{ bg: hoverBg }}
                      >
                        {currentTask?.category || "Add category"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent width="200px" shadow="lg">
                      <PopoverArrow />
                      <PopoverBody p={2}>
                        <VStack align="stretch" spacing={1}>
                          {AVAILABLE_CATEGORIES.map(category => (
                            <Button
                              key={category}
                              size="sm"
                              variant="ghost"
                              justifyContent="flex-start"
                              onClick={() => {
                                setCurrentTask(prev => ({
                                  ...prev,
                                  category
                                }));
                              }}
                              _hover={{ bg: hoverBg }}
                            >
                              {category}
                            </Button>
                          ))}
                        </VStack>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </HStack>

                {/* Tags */}
                <HStack spacing={3} align="flex-start">
                  <Icon as={FaTags} color={mutedColor} mt={2} />
                  <VStack align="stretch" spacing={2} flex={1}>
                    <Wrap spacing={2}>
                      {currentTask?.tags?.map((tag) => (
                        <Tag
                          key={tag}
                          size="sm"
                          borderRadius="full"
                          variant="subtle"
                          colorScheme="blue"
                        >
                          <TagLabel>{tag}</TagLabel>
                          <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                        </Tag>
                      ))}
                      <InputGroup size="sm" width="150px" display="inline-flex">
                        <Input
                          placeholder="Add tag"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          borderRadius="full"
                          pl={8}
                        />
                        <InputLeftElement pointerEvents="none">
                          <Icon as={FiSearch} color={mutedColor} />
                        </InputLeftElement>
                      </InputGroup>
                    </Wrap>
                  </VStack>
                </HStack>
              </VStack>

              <Divider />

              {/* Templates */}
              <VStack align="stretch" spacing={3}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  Templates
                </Text>
                <Wrap spacing={2}>
                  {NOTE_TEMPLATES.map(template => (
                    <Button
                      key={template.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyTemplate(template)}
                      _hover={{ bg: hoverBg }}
                    >
                      {template.name}
                    </Button>
                  ))}
                </Wrap>
              </VStack>

              <Divider />

              {/* Editor */}
              <Box flex={1}>
                <RichTextEditor
                  value={currentTask?.description || ''}
                  onChange={(newContent) => {
                    setCurrentTask(prev => ({
                      ...prev,
                      description: newContent
                    }));
                  }}
                />
              </Box>
            </VStack>
          </DrawerBody>

          {/* Footer */}
          <DrawerFooter 
            borderTopWidth="1px" 
            borderColor={borderColor}
            py={4}
            px={6}
          >
            <Flex w="100%" justify="space-between" align="center">
              <Box>
                {isLoading && (
                  <HStack>
                    <Spinner size="sm" />
                    <Text fontSize="sm" color={mutedColor}>
                      Creating note...
                    </Text>
                  </HStack>
                )}
              </Box>
              <HStack spacing={3}>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  size="md"
                >
                  Close
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={saveNote}
                  isLoading={isLoading}
                  leftIcon={<Icon as={FaSave} />}
                  size="md"
                >
                  Create Note
                </Button>
              </HStack>
            </Flex>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Share Modal */}
      <Modal isOpen={isShareModalOpen} onClose={onShareModalClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Share Note</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>Anyone with this link can view your note:</Text>
              <InputGroup>
                <Input value={shareLink} isReadOnly />
                <InputRightElement>
                  <IconButton
                    icon={isCopied ? <FaCheck /> : <FaCopy />}
                    onClick={copyToClipboard}
                    variant="ghost"
                  />
                </InputRightElement>
              </InputGroup>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onShareModalClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Publish Alert */}
      <AlertDialog
        isOpen={isPublishAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onPublishAlertClose}
      >
        <AlertDialogOverlay backdropFilter="blur(4px)">
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Make Note Public
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to make this note publicly accessible? Anyone with the link will be able to view it.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onPublishAlertClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={onPublishAlertClose} ml={3}>
                Make Public
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}

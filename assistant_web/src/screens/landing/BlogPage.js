import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  Container,
  VStack,
  HStack,
  Avatar,
  Divider,
  useColorModeValue,
  Skeleton,
  SkeletonText,
  Icon,
  Center,
} from '@chakra-ui/react';
import { FaCalendarAlt, FaUser, FaExclamationTriangle } from 'react-icons/fa';
import TaskDataService from '../../services/taskservice';
import { useRouter } from 'next/router';
import Navbar from "../../components/landing/Nav/Navbar";
import Footer from "../../components/landing/Footer";
import { formatLocalDateTime } from "../../utils/locale";
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';

const BlogPage = () => {
  const [blogPost, setBlogPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { slug } = router.query;

  const bgColor = useColorModeValue('white', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'gray.200');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const getBlog = async (slug) => {
    try {
      setLoading(true);
      const response = await TaskDataService.getPostBySlug(slug);
      setBlogPost(response.data);
    } catch (error) {
      console.error('Error fetching blog post:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBlog(slug);
  }, [slug]);

  const initialConfig = {
    namespace: 'BlogEditor',
    onError: (error) => console.error(error),
    editable: false,
    editorState: blogPost?.description || null,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListItemNode,
      ListNode,
      CodeNode,
      CodeHighlightNode,
      AutoLinkNode,
      LinkNode,
      TableCellNode,
      TableNode,
      TableRowNode,
    ],
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <Container maxW="container.md" py={10}>
          <Skeleton height="40px" mb={4} />
          <SkeletonText mt="4" noOfLines={4} spacing="4" />
        </Container>
        <Footer />
      </>
    );
  }

  if (!blogPost) {
    return (
      <>
        <Navbar />
        <Box bg={bgColor} minH="calc(100vh - 200px)" display="flex" alignItems="center">
          <Container maxW="container.md">
            <Center>
              <VStack spacing={4} textAlign="center">
                <Icon as={FaExclamationTriangle} w={12} h={12} color="yellow.500" />
                <Heading size="xl" color={textColor}>
                  Blog Post Not Found
                </Heading>
                <Text color={secondaryTextColor} fontSize="lg">
                  The blog post you're looking for doesn't exist or has been removed.
                </Text>
              </VStack>
            </Center>
          </Container>
        </Box>
        <Footer />
        <Container maxW="container.md" py={10}>
          <Heading>Blog post not found</Heading>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Box bg={bgColor} minH="100vh">
        <Container maxW="container.md" py={10}>
          <VStack spacing={8} align="stretch">
            {/* Header Section */}
            <VStack spacing={4} align="center" textAlign="center">
              <Heading
                as="h1"
                size="2xl"
                color={textColor}
                fontWeight="bold"
                lineHeight="1.2"
              >
                {blogPost.title}
              </Heading>
              
              <HStack spacing={4} color={secondaryTextColor}>
                <HStack>
                  <Icon as={FaUser} />
                  <Text>{blogPost.author || 'Anonymous'}</Text>
                </HStack>
                <HStack>
                  <Icon as={FaCalendarAlt} />
                  <Text>{formatLocalDateTime(blogPost.created_at)}</Text>
                </HStack>
              </HStack>
            </VStack>

            <Divider borderColor={borderColor} />

            {/* Content Section */}
            <Box>
              <LexicalComposer initialConfig={initialConfig}>
                <div className="editor-container">
                  <RichTextPlugin
                    contentEditable={<ContentEditable className="editor-input" />}
                    placeholder={null}
                  />
                  <HistoryPlugin />
                  <AutoFocusPlugin />
                  <ListPlugin />
                  <LinkPlugin />
                  <TablePlugin />
                </div>
              </LexicalComposer>
            </Box>
          </VStack>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default BlogPage;

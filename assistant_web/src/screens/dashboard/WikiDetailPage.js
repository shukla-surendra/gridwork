import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import RouterLink from 'next/link';
import {
  Box, Flex, HStack, VStack, Input, Textarea, IconButton, Icon, Text, Checkbox,
  Divider, Menu, MenuButton, MenuList, MenuItem, MenuDivider, Button, Avatar,
  useColorModeValue, Spinner, Center, useToast, Breadcrumb, BreadcrumbItem, BreadcrumbLink,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiPlus, FiMoreVertical, FiTrash2, FiType, FiAlignLeft, FiList,
  FiCheckSquare, FiCode, FiMinus, FiImage, FiMenu as FiGrip, FiFileText, FiMessageSquare,
} from 'react-icons/fi';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import PageService from '../../services/PageService';
import BlockService from '../../services/BlockService';
import PageCommentService from '../../services/PageCommentService';
import { timeAgo } from '../../utils/locale';

const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', icon: FiType },
  { type: 'paragraph', label: 'Paragraph', icon: FiAlignLeft },
  { type: 'bullet_list_item', label: 'Bulleted list', icon: FiList },
  { type: 'todo', label: 'To-do', icon: FiCheckSquare },
  { type: 'code', label: 'Code', icon: FiCode },
  { type: 'divider', label: 'Divider', icon: FiMinus },
  { type: 'image', label: 'Image', icon: FiImage },
];

const emptyContentFor = (type) => {
  switch (type) {
    case 'heading': return { text: '', level: 2 };
    case 'todo': return { text: '', checked: false };
    case 'image': return { url: '', caption: '' };
    case 'divider': return {};
    default: return { text: '' };
  }
};

function BlockContent({ block, onChange }) {
  const codeBg = useColorModeValue('gray.100', 'gray.900');
  const content = block.content || {};

  switch (block.type) {
    case 'heading': {
      const sizes = { 1: '2xl', 2: 'xl', 3: 'lg' };
      return (
        <Input
          value={content.text || ''}
          placeholder="Heading"
          variant="unstyled"
          fontWeight="bold"
          fontSize={sizes[content.level] || 'xl'}
          onChange={e => onChange({ ...content, text: e.target.value })}
        />
      );
    }
    case 'paragraph':
      return (
        <Textarea
          value={content.text || ''}
          placeholder="Type something..."
          variant="unstyled"
          resize="vertical"
          onChange={e => onChange({ ...content, text: e.target.value })}
        />
      );
    case 'bullet_list_item':
      return (
        <HStack align="flex-start" w="100%">
          <Text mt={2}>•</Text>
          <Input
            value={content.text || ''}
            placeholder="List item"
            variant="unstyled"
            onChange={e => onChange({ ...content, text: e.target.value })}
          />
        </HStack>
      );
    case 'todo':
      return (
        <HStack w="100%">
          <Checkbox
            isChecked={!!content.checked}
            onChange={e => onChange({ ...content, checked: e.target.checked })}
          />
          <Input
            value={content.text || ''}
            placeholder="To-do"
            variant="unstyled"
            textDecoration={content.checked ? 'line-through' : 'none'}
            color={content.checked ? 'gray.500' : undefined}
            onChange={e => onChange({ ...content, text: e.target.value })}
          />
        </HStack>
      );
    case 'code':
      return (
        <Textarea
          value={content.text || ''}
          placeholder="Code"
          fontFamily="mono"
          fontSize="sm"
          bg={codeBg}
          resize="vertical"
          onChange={e => onChange({ ...content, text: e.target.value })}
        />
      );
    case 'divider':
      return <Divider borderColor="gray.400" />;
    case 'image':
      return (
        <VStack align="stretch" w="100%">
          <Input
            value={content.url || ''}
            placeholder="Image URL"
            size="sm"
            onChange={e => onChange({ ...content, url: e.target.value })}
          />
          {content.url && <Box as="img" src={content.url} maxH="300px" objectFit="contain" alt={content.caption || ''} />}
          <Input
            value={content.caption || ''}
            placeholder="Caption (optional)"
            size="sm"
            variant="flushed"
            onChange={e => onChange({ ...content, caption: e.target.value })}
          />
        </VStack>
      );
    default:
      return <Text color="gray.500">Unsupported block type: {block.type}</Text>;
  }
}

function SortableBlock({ block, onChangeContent, onChangeType, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.block_id });
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      align="flex-start"
      role="group"
      py={1}
      px={2}
      borderRadius="md"
      _hover={{ bg: hoverBg }}
    >
      <HStack spacing={0} opacity={0} _groupHover={{ opacity: 1 }} mt={1}>
        <IconButton
          {...attributes}
          {...listeners}
          icon={<FiGrip />}
          size="xs"
          variant="ghost"
          cursor="grab"
          aria-label="Drag to reorder"
        />
        <Menu>
          <MenuButton as={IconButton} icon={<FiMoreVertical />} size="xs" variant="ghost" aria-label="Block options" />
          <MenuList>
            {BLOCK_TYPES.map(bt => (
              <MenuItem key={bt.type} icon={<Icon as={bt.icon} />} onClick={() => onChangeType(bt.type)}>
                Turn into {bt.label}
              </MenuItem>
            ))}
            <MenuDivider />
            <MenuItem icon={<FiTrash2 />} color="red.500" onClick={onDelete}>Delete</MenuItem>
          </MenuList>
        </Menu>
      </HStack>
      <Box flex={1} pt={1}>
        <BlockContent block={block} onChange={onChangeContent} />
      </Box>
    </Flex>
  );
}

export default function WikiDetailPage() {
  const router = useRouter();
  const { pageId } = router.query;  const navigate = (path) => router.push(path);
  const toast = useToast();

  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [page, setPage] = useState(null);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [allPages, setAllPages] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const subPageHoverBg = useColorModeValue('gray.100', 'gray.700');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      PageService.get(pageId),
      BlockService.getAll(pageId),
      PageService.getAll(),
      PageCommentService.getAll(pageId),
    ])
      .then(([pageRes, blocksRes, allPagesRes, commentsRes]) => {
        setPage(pageRes.data);
        setTitle(pageRes.data.title);
        setBlocks(blocksRes.data);
        setAllPages(allPagesRes.data);
        setComments(commentsRes.data);
      })
      .catch(() => setError('Failed to load page'))
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => { load(); }, [load]);

  const pagesById = Object.fromEntries(allPages.map(p => [p.page_id, p]));
  const breadcrumbChain = [];
  let walker = page?.parent_page_id ? pagesById[page.parent_page_id] : null;
  while (walker) {
    breadcrumbChain.unshift(walker);
    walker = walker.parent_page_id ? pagesById[walker.parent_page_id] : null;
  }
  const subPages = allPages.filter(p => p.parent_page_id === pageId);

  const addSubPage = () => {
    const subTitle = window.prompt('Sub-page title');
    if (!subTitle || !subTitle.trim()) return;
    PageService.create({ title: subTitle.trim(), parent_page_id: pageId })
      .then((res) => navigate(`/wiki/detail?pageId=${res.data.page_id}`))
      .catch(() => toast({ title: "Couldn't create sub-page", status: 'error', duration: 3000, isClosable: true }));
  };

  const postComment = () => {
    if (!newComment.trim()) return;
    setIsPostingComment(true);
    PageCommentService.create(pageId, newComment.trim())
      .then((res) => {
        setComments((prev) => [...prev, res.data]);
        setNewComment('');
      })
      .catch(() => toast({ title: "Couldn't post comment", status: 'error', duration: 3000, isClosable: true }))
      .finally(() => setIsPostingComment(false));
  };

  const deleteComment = (commentId) => {
    PageCommentService.remove(pageId, commentId)
      .then(() => setComments((prev) => prev.filter(c => c.comment_id !== commentId)))
      .catch(() => toast({ title: "Couldn't delete comment", status: 'error', duration: 3000, isClosable: true }));
  };

  const saveTitle = () => {
    if (!title.trim() || title === page?.title) return;
    PageService.update(pageId, { title: title.trim() }).catch(() => {
      toast({ title: "Couldn't save title", status: 'error', duration: 3000, isClosable: true });
    });
  };

  const persistOrder = (list) => {
    list.forEach((block, index) => {
      if (block.order !== index) {
        BlockService.update(pageId, block.block_id, { order: index }).catch(() => {});
      }
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex(b => b.block_id === active.id);
      const newIndex = prev.findIndex(b => b.block_id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }));
      persistOrder(reordered);
      return reordered;
    });
  };

  const insertBlock = (afterIndex, type) => {
    const order = afterIndex + 1;
    BlockService.create(pageId, { type, content: emptyContentFor(type), order })
      .then((res) => {
        setBlocks((prev) => {
          const next = [...prev];
          next.splice(order, 0, res.data);
          const renumbered = next.map((b, i) => ({ ...b, order: i }));
          persistOrder(renumbered);
          return renumbered;
        });
      })
      .catch(() => toast({ title: "Couldn't add block", status: 'error', duration: 3000, isClosable: true }));
  };

  const updateBlockContent = (blockId, content) => {
    setBlocks((prev) => prev.map(b => (b.block_id === blockId ? { ...b, content } : b)));
  };

  const saveBlockContent = (blockId) => {
    const block = blocks.find(b => b.block_id === blockId);
    if (!block) return;
    BlockService.update(pageId, blockId, { content: block.content }).catch(() => {
      toast({ title: "Couldn't save block", status: 'error', duration: 3000, isClosable: true });
    });
  };

  const changeBlockType = (blockId, type) => {
    setBlocks((prev) => prev.map(b => (b.block_id === blockId ? { ...b, type, content: emptyContentFor(type) } : b)));
    BlockService.update(pageId, blockId, { type, content: emptyContentFor(type) }).catch(() => {
      toast({ title: "Couldn't change block type", status: 'error', duration: 3000, isClosable: true });
    });
  };

  const deleteBlock = (blockId) => {
    BlockService.remove(pageId, blockId)
      .then(() => setBlocks((prev) => prev.filter(b => b.block_id !== blockId)))
      .catch(() => toast({ title: "Couldn't delete block", status: 'error', duration: 3000, isClosable: true }));
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

  if (error || !page) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Text color="red.500">{error || 'Page not found'}</Text></Center>
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
          <Box maxW="720px" mx="auto">
            <HStack mb={2}>
              <IconButton icon={<FiArrowLeft />} variant="ghost" size="sm" aria-label="Back to wiki" onClick={() => navigate('/wiki')} />
              <Breadcrumb fontSize="sm" color="gray.500" separator="/">
                <BreadcrumbItem>
                  <BreadcrumbLink as={RouterLink} href="/wiki">Wiki</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbChain.map((crumb) => (
                  <BreadcrumbItem key={crumb.page_id}>
                    <BreadcrumbLink as={RouterLink} href={`/wiki/detail?pageId=${crumb.page_id}`}>{crumb.title}</BreadcrumbLink>
                  </BreadcrumbItem>
                ))}
                <BreadcrumbItem isCurrentPage>
                  <Text noOfLines={1}>{page.title}</Text>
                </BreadcrumbItem>
              </Breadcrumb>
            </HStack>

            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              placeholder="Untitled"
              variant="unstyled"
              fontSize="3xl"
              fontWeight="bold"
              mb={6}
            />

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map(b => b.block_id)} strategy={verticalListSortingStrategy}>
                <VStack align="stretch" spacing={0}>
                  {blocks.map((block) => (
                    <Box key={block.block_id} onBlur={() => saveBlockContent(block.block_id)}>
                      <SortableBlock
                        block={block}
                        onChangeContent={(content) => updateBlockContent(block.block_id, content)}
                        onChangeType={(type) => changeBlockType(block.block_id, type)}
                        onDelete={() => deleteBlock(block.block_id)}
                      />
                    </Box>
                  ))}
                </VStack>
              </SortableContext>
            </DndContext>

            <Menu>
              <MenuButton as={Button} leftIcon={<FiPlus />} variant="ghost" size="sm" mt={2}>
                Add block
              </MenuButton>
              <MenuList>
                {BLOCK_TYPES.map(bt => (
                  <MenuItem key={bt.type} icon={<Icon as={bt.icon} />} onClick={() => insertBlock(blocks.length - 1, bt.type)}>
                    {bt.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>

            <Divider my={8} />

            {/* Sub-pages -- Confluence-style page tree, one level shown here */}
            <Box mb={8}>
              <HStack justify="space-between" mb={3}>
                <Text fontWeight="semibold" fontSize="sm" color="gray.500">
                  SUB-PAGES {subPages.length > 0 ? `(${subPages.length})` : ''}
                </Text>
                <Button leftIcon={<FiPlus />} size="xs" variant="ghost" onClick={addSubPage}>
                  Add sub-page
                </Button>
              </HStack>
              {subPages.length > 0 ? (
                <VStack align="stretch" spacing={1}>
                  {subPages.map((sub) => (
                    <HStack
                      key={sub.page_id}
                      p={2}
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ bg: subPageHoverBg }}
                      onClick={() => navigate(`/wiki/detail?pageId=${sub.page_id}`)}
                    >
                      <Icon as={FiFileText} color="blue.500" />
                      <Text fontSize="sm">{sub.title}</Text>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="sm" color="gray.500">No sub-pages yet.</Text>
              )}
            </Box>

            <Divider mb={8} />

            {/* Comments -- Confluence-style page discussion thread */}
            <Box>
              <HStack mb={4}>
                <Icon as={FiMessageSquare} />
                <Text fontWeight="semibold" fontSize="sm" color="gray.500">
                  COMMENTS {comments.length > 0 ? `(${comments.length})` : ''}
                </Text>
              </HStack>
              <VStack align="stretch" spacing={4} mb={4}>
                {comments.map((comment) => (
                  <HStack key={comment.comment_id} align="start" spacing={3}>
                    <Avatar
                      size="sm"
                      name={comment.user ? `${comment.user.first_name} ${comment.user.last_name}` : 'User'}
                      src={comment.user?.avatar_url}
                    />
                    <Box flex={1}>
                      <HStack justify="space-between">
                        <HStack>
                          <Text fontSize="sm" fontWeight="semibold">
                            {comment.user ? `${comment.user.first_name} ${comment.user.last_name}` : 'Someone'}
                          </Text>
                          <Text fontSize="xs" color="gray.500">{timeAgo(comment.created_at)}</Text>
                        </HStack>
                        <IconButton
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          aria-label="Delete comment"
                          onClick={() => deleteComment(comment.comment_id)}
                        />
                      </HStack>
                      <Text fontSize="sm">{comment.content}</Text>
                    </Box>
                  </HStack>
                ))}
                {comments.length === 0 && (
                  <Text fontSize="sm" color="gray.500">No comments yet. Start the discussion.</Text>
                )}
              </VStack>
              <HStack align="start">
                <Textarea
                  size="sm"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                />
                <Button size="sm" colorScheme="blue" onClick={postComment} isLoading={isPostingComment}>
                  Post
                </Button>
              </HStack>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

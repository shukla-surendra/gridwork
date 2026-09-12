import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { Box, HStack, IconButton, useColorModeValue, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { 
  FiBold, 
  FiItalic, 
  FiList, 
  FiType,
  FiCode,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiAlignJustify,
  FiImage,
  FiCheckSquare,
  FiArrowLeft,
  FiArrowRight,
  FiLink
} from 'react-icons/fi';
import { useEffect } from 'react';

const MenuBar = ({ editor }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');

  if (!editor) {
    return null;
  }

  return (
    <HStack 
      spacing={1} 
      p={2} 
      bg={bgColor} 
      borderWidth="1px" 
      borderColor={borderColor}
      borderRadius="md"
      mb={2}
      flexWrap="wrap"
    >
      <IconButton
        icon={<FiArrowLeft />}
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().undo().run()}
        aria-label="Undo"
      />
      <IconButton
        icon={<FiArrowRight />}
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().redo().run()}
        aria-label="Redo"
      />
      <Box w="1px" h="6" bg={borderColor} mx={1} />
      <IconButton
        icon={<FiBold />}
        size="sm"
        variant={editor.isActive('bold') ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      />
      <IconButton
        icon={<FiItalic />}
        size="sm"
        variant={editor.isActive('italic') ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      />
      <Menu>
        <MenuButton
          as={IconButton}
          icon={<FiType />}
          size="sm"
          variant={editor.isActive('heading') ? 'solid' : 'ghost'}
          aria-label="Heading"
        />
        <MenuList>
          <MenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            Heading 1
          </MenuItem>
          <MenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            Heading 2
          </MenuItem>
          <MenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            Heading 3
          </MenuItem>
        </MenuList>
      </Menu>
      <Box w="1px" h="6" bg={borderColor} mx={1} />
      <IconButton
        icon={<FiList />}
        size="sm"
        variant={editor.isActive('bulletList') ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet List"
      />
      <IconButton
        icon={<FiList />}
        size="sm"
        variant={editor.isActive('orderedList') ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered List"
      />
      <IconButton
        icon={<FiCheckSquare />}
        size="sm"
        variant={editor.isActive('taskList') ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        aria-label="Task List"
      />
      <Box w="1px" h="6" bg={borderColor} mx={1} />
      <IconButton
        icon={<FiAlignLeft />}
        size="sm"
        variant={editor.isActive({ textAlign: 'left' }) ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        aria-label="Align Left"
      />
      <IconButton
        icon={<FiAlignCenter />}
        size="sm"
        variant={editor.isActive({ textAlign: 'center' }) ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        aria-label="Align Center"
      />
      <IconButton
        icon={<FiAlignRight />}
        size="sm"
        variant={editor.isActive({ textAlign: 'right' }) ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        aria-label="Align Right"
      />
      <IconButton
        icon={<FiAlignJustify />}
        size="sm"
        variant={editor.isActive({ textAlign: 'justify' }) ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        aria-label="Justify"
      />
      <Box w="1px" h="6" bg={borderColor} mx={1} />
      <IconButton
        icon={<FiCode />}
        size="sm"
        variant={editor.isActive('codeBlock') ? 'solid' : 'ghost'}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        aria-label="Code Block"
      />
      <IconButton
        icon={<FiLink />}
        size="sm"
        variant={editor.isActive('link') ? 'solid' : 'ghost'}
        onClick={() => {
          const url = window.prompt('Enter the URL');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        aria-label="Add Link"
      />
      <IconButton
        icon={<FiImage />}
        size="sm"
        variant="ghost"
        onClick={() => {
          const url = window.prompt('Enter the image URL');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        aria-label="Add Image"
      />
    </HStack>
  );
};

const TipTapEditor = ({ content, onChange, editable = true }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Typography,
    ],
    content: content || '',
    editable: editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        spellcheck: 'true',
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
      if (editable) {
        editor.commands.focus('end');
      }
    }
  }, [editor, editable]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const editorBg = useColorModeValue('white', 'gray.800');
  const listColor = useColorModeValue('gray.800', 'gray.200');

  return (
    <Box>
      {editable && <MenuBar editor={editor} />}
      <Box
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="md"
        p={4}
        minH="200px"
        bg={editorBg}
        sx={{
          '.ProseMirror': {
            minH: '200px',
            outline: 'none',
            cursor: editable ? 'text' : 'default',
            color: listColor,
            '> * + *': {
              marginTop: '0.75em',
            },
            'ul, ol': {
              padding: '0 1rem',
              margin: '0.5em 0',
              'li': {
                position: 'relative',
                paddingLeft: '1.5em',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '0.5em',
                  width: '0.5em',
                  height: '0.5em',
                  borderRadius: '50%',
                  backgroundColor: listColor,
                },
              },
            },
            'ol': {
              counterReset: 'list-counter',
              'li': {
                counterIncrement: 'list-counter',
                '&::before': {
                  content: 'counter(list-counter) "."',
                  position: 'absolute',
                  left: 0,
                  width: '1.5em',
                  textAlign: 'right',
                  color: listColor,
                  backgroundColor: 'transparent',
                  borderRadius: 0,
                },
              },
            },
            'ul[data-type="taskList"]': {
              listStyle: 'none',
              padding: 0,
              'li': {
                display: 'flex',
                alignItems: 'flex-start',
                '> label': {
                  flex: '0 0 auto',
                  marginRight: '0.5rem',
                  userSelect: 'none',
                },
                '> div': {
                  flex: '1 1 auto',
                },
              },
            },
            'h1, h2, h3, h4, h5, h6': {
              lineHeight: '1.1',
            },
            'code': {
              backgroundColor: useColorModeValue('gray.100', 'gray.700'),
              borderRadius: '0.25em',
              padding: '0.25em',
            },
            'pre': {
              backgroundColor: useColorModeValue('gray.100', 'gray.700'),
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              'code': {
                backgroundColor: 'transparent',
                padding: 0,
              },
            },
            'img': {
              maxWidth: '100%',
              height: 'auto',
            },
            'hr': {
              border: 'none',
              borderTop: `2px solid ${borderColor}`,
              margin: '2rem 0',
            },
            'blockquote': {
              paddingLeft: '1rem',
              borderLeft: `4px solid ${borderColor}`,
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default TipTapEditor; 
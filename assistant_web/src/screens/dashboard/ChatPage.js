import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Box,
    Flex,
    Button,
    useToast,
    useColorModeValue,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    FormControl,
    FormLabel,
    Input,
    useDisclosure,
} from '@chakra-ui/react';
import { FaPlus } from 'react-icons/fa';
import ConfigService from '../../utils/config';

import ChatList from '../../components/chat/ChatList';
import ChatMessage from '../../components/chat/ChatMessage';
import ChatInput from '../../components/chat/ChatInput';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';

import {
    fetchChats,
    createChat,
    fetchMessages,
    sendMessage,
    getAICompletion,
    setCurrentChat,
} from '../../slices/chatSlice';

const ChatPage = () => {
    const dispatch = useDispatch();
    const toast = useToast();
    const messagesEndRef = useRef(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [newChatTitle, setNewChatTitle] = React.useState('');
    const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

    const { chats, currentChat, messages, loading } = useSelector((state) => state.chat);
    const bgColor = useColorModeValue('gray.50', 'gray.800');
    const contentBgColor = useColorModeValue('white', 'gray.700');

    useEffect(() => {
        const workspace = ConfigService.getDefaultWorkspace();
        if (workspace) {
            dispatch(fetchChats());
        }
    }, [dispatch]);

    useEffect(() => {
        if (currentChat) {
            dispatch(fetchMessages(currentChat.chat_id));
        }
    }, [dispatch, currentChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCreateChat = async () => {
        try {
            const workspace = ConfigService.getDefaultWorkspace();
            if (!workspace) {
                toast({
                    title: 'Error',
                    description: 'No workspace selected',
                    status: 'error',
                    duration: 3000,
                });
                return;
            }

            const userId = ConfigService.getUserId();
            if (!userId) {
                toast({
                    title: 'Error',
                    description: 'No user ID found',
                    status: 'error',
                    duration: 3000,
                });
                return;
            }

            console.log('Creating chat with data:', {
                title: newChatTitle,
                workspace_id: workspace.workspace_id,
                user_id: userId,
                model: 'gpt-3.5-turbo',
            });

            const chatData = {
                title: newChatTitle,
                workspace_id: workspace.workspace_id,
                user_id: userId,
                model: 'gpt-3.5-turbo',
            };

            const result = await dispatch(createChat(chatData)).unwrap();
            console.log('Chat created successfully:', result);
            
            dispatch(setCurrentChat(result));
            setNewChatTitle('');
            onClose();

            toast({
                title: 'Success',
                description: 'Chat created successfully',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            console.error('Error creating chat:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to create chat',
                status: 'error',
                duration: 3000,
            });
        }
    };

    const handleSendMessage = async (content) => {
        if (!currentChat) return;

        try {
            // Send user message
            await dispatch(sendMessage({
                chatId: currentChat.chat_id,
                messageData: {
                    role: 'user',
                    content,
                },
            })).unwrap();

            // Get AI completion (backend replies from the chat's persisted
            // history, which now includes the user turn saved just above)
            await dispatch(getAICompletion({
                chatId: currentChat.chat_id,
            })).unwrap();
        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to send message',
                status: 'error',
                duration: 3000,
            });
        }
    };

    return (
        <Box minH="100vh" bg={bgColor}>
            <Navbar isCollapsed={isMenuCollapsed} onToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
            <Box
                ml={isMenuCollapsed ? '60px' : '250px'}
                minH="100vh"
                transition="all 0.3s ease"
            >
                <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
                <Flex h="calc(100vh - 64px)">
                    <Box
                        w="300px"
                        borderRight="1px"
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                        bg={contentBgColor}
                    >
                        <ChatList
                            chats={chats}
                            currentChat={currentChat}
                            onSelectChat={(chat) => dispatch(setCurrentChat(chat))}
                            onDeleteChat={(chatId) => {
                                // TODO: Implement delete chat
                            }}
                            onEditChat={(chat) => {
                                // TODO: Implement edit chat
                            }}
                        />
                    </Box>
                    <Box flex="1" display="flex" flexDirection="column" bg={contentBgColor}>
                        {currentChat ? (
                            <>
                                <Box flex="1" overflowY="auto" p={3}>
                                    {messages.map((message) => (
                                        <ChatMessage key={message.message_id} message={message} />
                                    ))}
                                    <div ref={messagesEndRef} />
                                </Box>
                                <ChatInput
                                    onSendMessage={handleSendMessage}
                                    isLoading={loading}
                                />
                            </>
                        ) : (
                            <Box
                                h="100%"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Button
                                    leftIcon={<FaPlus />}
                                    colorScheme="blue"
                                    onClick={onOpen}
                                >
                                    Start New Chat
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Flex>
            </Box>

            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>New Chat</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <FormControl>
                            <FormLabel>Chat Title</FormLabel>
                            <Input
                                value={newChatTitle}
                                onChange={(e) => setNewChatTitle(e.target.value)}
                                placeholder="Enter chat title"
                            />
                        </FormControl>
                        <Button
                            colorScheme="blue"
                            mr={3}
                            mt={4}
                            onClick={handleCreateChat}
                            isDisabled={!newChatTitle.trim()}
                        >
                            Create
                        </Button>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
};

export default ChatPage; 
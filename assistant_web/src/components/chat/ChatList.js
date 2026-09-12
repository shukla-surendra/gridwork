import React from 'react';
import {
    Box,
    VStack,
    Text,
    Flex,
    IconButton,
    useColorModeValue,
    Divider,
} from '@chakra-ui/react';
import { FaTrash, FaEdit } from 'react-icons/fa';

const ChatList = ({ chats, currentChat, onSelectChat, onDeleteChat, onEditChat }) => {
    const bgColor = useColorModeValue('white', 'gray.700');
    const hoverBgColor = useColorModeValue('gray.50', 'gray.600');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    return (
        <Box
            w="300px"
            borderRight="1px"
            borderColor={borderColor}
            h="100%"
            overflowY="auto"
        >
            <VStack spacing={0} align="stretch">
                {chats.map((chat) => (
                    <Box
                        key={chat.chat_id}
                        p={4}
                        cursor="pointer"
                        bg={currentChat?.chat_id === chat.chat_id ? hoverBgColor : bgColor}
                        _hover={{ bg: hoverBgColor }}
                        onClick={() => onSelectChat(chat)}
                    >
                        <Flex justify="space-between" align="center">
                            <Text
                                fontWeight={currentChat?.chat_id === chat.chat_id ? 'bold' : 'normal'}
                                noOfLines={1}
                            >
                                {chat.title}
                            </Text>
                            <Flex>
                                <IconButton
                                    icon={<FaEdit />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditChat(chat);
                                    }}
                                />
                                <IconButton
                                    icon={<FaTrash />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChat(chat.chat_id);
                                    }}
                                />
                            </Flex>
                        </Flex>
                        <Text fontSize="sm" color="gray.500" noOfLines={1}>
                            {new Date(chat.updated_at).toLocaleDateString()}
                        </Text>
                        <Divider mt={2} />
                    </Box>
                ))}
            </VStack>
        </Box>
    );
};

export default ChatList; 
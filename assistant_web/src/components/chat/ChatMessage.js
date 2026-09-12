import React from 'react';
import { Box, Text, Flex, Avatar, useColorModeValue } from '@chakra-ui/react';
import { FaUser, FaRobot } from 'react-icons/fa';

const ChatMessage = ({ message }) => {
    const isUser = message.role === 'user';
    const bgColor = useColorModeValue(
        isUser ? 'blue.50' : 'gray.50',
        isUser ? 'blue.900' : 'gray.700'
    );
    const textColor = useColorModeValue('gray.800', 'white');

    return (
        <Flex
            direction="column"
            mb={4}
            alignSelf={isUser ? 'flex-end' : 'flex-start'}
            maxW="80%"
        >
            <Flex align="center" mb={2}>
                <Avatar
                    size="sm"
                    icon={isUser ? <FaUser /> : <FaRobot />}
                    bg={isUser ? 'blue.500' : 'green.500'}
                    color="white"
                />
                <Text ml={2} fontSize="sm" color={textColor}>
                    {isUser ? 'You' : 'AI Assistant'}
                </Text>
            </Flex>
            <Box
                bg={bgColor}
                p={4}
                borderRadius="lg"
                boxShadow="sm"
            >
                <Text color={textColor} whiteSpace="pre-wrap">
                    {message.content}
                </Text>
            </Box>
            <Text fontSize="xs" color="gray.500" mt={1}>
                {new Date(message.created_at).toLocaleTimeString()}
            </Text>
        </Flex>
    );
};

export default ChatMessage; 
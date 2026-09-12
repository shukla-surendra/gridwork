import React, { useState } from 'react';
import {
    Box,
    Input,
    IconButton,
    Flex,
    useColorModeValue,
} from '@chakra-ui/react';
import { FaPaperPlane } from 'react-icons/fa';

const ChatInput = ({ onSendMessage, isLoading }) => {
    const [message, setMessage] = useState('');
    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !isLoading) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <Box
            as="form"
            onSubmit={handleSubmit}
            position="sticky"
            bottom={0}
            bg={bgColor}
            borderTop="1px"
            borderColor={borderColor}
            p={4}
        >
            <Flex>
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    size="lg"
                    mr={2}
                    disabled={isLoading}
                />
                <IconButton
                    type="submit"
                    icon={<FaPaperPlane />}
                    colorScheme="blue"
                    size="lg"
                    isLoading={isLoading}
                    isDisabled={!message.trim() || isLoading}
                />
            </Flex>
        </Box>
    );
};

export default ChatInput; 
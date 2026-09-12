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
    Badge,
    VStack,
    HStack,
    Divider,
    Box
} from '@chakra-ui/react';

const ViewDealModal = ({ isOpen, onClose, deal }) => {
    if (!deal) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Deal Details</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <Box>
                            <Text fontWeight="bold" fontSize="lg">{deal.name}</Text>
                            <Text color="gray.600">{deal.company}</Text>
                        </Box>
                        
                        <Divider />
                        
                        <Box>
                            <Text fontWeight="bold">Value</Text>
                            <Text>${deal.value?.toLocaleString() || '0'}</Text>
                        </Box>
                        
                        <Box>
                            <Text fontWeight="bold">Stage</Text>
                            <Badge colorScheme={deal.stage === 'won' ? 'green' : deal.stage === 'lost' ? 'red' : 'blue'}>
                                {deal.stage}
                            </Badge>
                        </Box>
                        
                        <Box>
                            <Text fontWeight="bold">Status</Text>
                            <Badge colorScheme={deal.status === 'active' ? 'green' : 'gray'}>
                                {deal.status}
                            </Badge>
                        </Box>
                        
                        {deal.description && (
                            <Box>
                                <Text fontWeight="bold">Description</Text>
                                <Text>{deal.description}</Text>
                            </Box>
                        )}
                        
                        {deal.expected_close_date && (
                            <Box>
                                <Text fontWeight="bold">Expected Close Date</Text>
                                <Text>{new Date(deal.expected_close_date).toLocaleDateString()}</Text>
                            </Box>
                        )}
                        
                        {deal.contact_name && (
                            <Box>
                                <Text fontWeight="bold">Contact</Text>
                                <Text>{deal.contact_name}</Text>
                            </Box>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" mr={3} onClick={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ViewDealModal; 
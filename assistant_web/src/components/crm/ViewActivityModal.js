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
    VStack,
    HStack,
    Badge,
} from '@chakra-ui/react';

const ViewActivityModal = ({ isOpen, onClose, activity }) => {
    if (!activity) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Activity Details</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                            <Text fontWeight="bold">Type:</Text>
                            <Badge colorScheme={activity.type === 'call' ? 'blue' : activity.type === 'meeting' ? 'green' : 'purple'}>
                                {activity.type}
                            </Badge>
                        </HStack>
                        <HStack justify="space-between">
                            <Text fontWeight="bold">Status:</Text>
                            <Badge colorScheme={activity.status === 'completed' ? 'green' : activity.status === 'scheduled' ? 'yellow' : 'red'}>
                                {activity.status}
                            </Badge>
                        </HStack>
                        <Text fontWeight="bold">Description:</Text>
                        <Text>{activity.description}</Text>
                        {activity.notes && (
                            <>
                                <Text fontWeight="bold">Notes:</Text>
                                <Text>{activity.notes}</Text>
                            </>
                        )}
                        <HStack justify="space-between">
                            <Text fontWeight="bold">Date:</Text>
                            <Text>{new Date(activity.date).toLocaleDateString()}</Text>
                        </HStack>
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

export default ViewActivityModal; 
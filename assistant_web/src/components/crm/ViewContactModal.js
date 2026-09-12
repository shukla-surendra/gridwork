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
    VStack,
    HStack,
    Text,
    Badge,
    Divider,
    Box,
    Icon,
    Link
} from '@chakra-ui/react';
import { EmailIcon, PhoneIcon, StarIcon, InfoIcon } from '@chakra-ui/icons';

const ViewContactModal = ({ isOpen, onClose, contact }) => {
    if (!contact) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <HStack spacing={2}>
                        <Text>{contact.first_name} {contact.last_name}</Text>
                        <Badge colorScheme={contact.status === 'active' ? 'green' : 'gray'}>
                            {contact.status}
                        </Badge>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        {/* Contact Information */}
                        <Box>
                            <Text fontWeight="bold" mb={2}>Contact Information</Text>
                            <VStack spacing={2} align="stretch">
                                {contact.email && (
                                    <HStack>
                                        <Icon as={EmailIcon} />
                                        <Link href={`mailto:${contact.email}`} color="blue.500">
                                            {contact.email}
                                        </Link>
                                    </HStack>
                                )}
                                {contact.phone && (
                                    <HStack>
                                        <Icon as={PhoneIcon} />
                                        <Link href={`tel:${contact.phone}`} color="blue.500">
                                            {contact.phone}
                                        </Link>
                                    </HStack>
                                )}
                            </VStack>
                        </Box>

                        <Divider />

                        {/* Company Information */}
                        {(contact.company_ref?.name || contact.company || contact.job_title) && (
                            <Box>
                                <Text fontWeight="bold" mb={2}>Company Information</Text>
                                <VStack spacing={2} align="stretch">
                                    {contact.company_ref?.name && (
                                        <HStack>
                                            <Icon as={InfoIcon} />
                                            <Text>{contact.company_ref.name}</Text>
                                        </HStack>
                                    )}
                                    {!contact.company_ref?.name && contact.company && (
                                        <HStack>
                                            <Icon as={InfoIcon} />
                                            <Text>{contact.company}</Text>
                                        </HStack>
                                    )}
                                    {contact.job_title && (
                                        <HStack>
                                            <Icon as={StarIcon} />
                                            <Text>{contact.job_title}</Text>
                                        </HStack>
                                    )}
                                </VStack>
                            </Box>
                        )}

                        {/* Address */}
                        {contact.address && Object.keys(contact.address).length > 0 && (
                            <>
                                <Divider />
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Address</Text>
                                    <VStack spacing={1} align="stretch">
                                        {contact.address.street && <Text>{contact.address.street}</Text>}
                                        {contact.address.city && <Text>{contact.address.city}</Text>}
                                        {contact.address.state && <Text>{contact.address.state}</Text>}
                                        {contact.address.country && <Text>{contact.address.country}</Text>}
                                        {contact.address.postal_code && <Text>{contact.address.postal_code}</Text>}
                                    </VStack>
                                </Box>
                            </>
                        )}

                        {/* Social Media */}
                        {contact.social_media && Object.keys(contact.social_media).length > 0 && (
                            <>
                                <Divider />
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Social Media</Text>
                                    <VStack spacing={2} align="stretch">
                                        {Object.entries(contact.social_media).map(([platform, url]) => (
                                            <HStack key={platform}>
                                                <Text fontWeight="medium" minW="100px">
                                                    {platform.charAt(0).toUpperCase() + platform.slice(1)}:
                                                </Text>
                                                <Link href={url} color="blue.500" isExternal>
                                                    {url}
                                                </Link>
                                            </HStack>
                                        ))}
                                    </VStack>
                                </Box>
                            </>
                        )}

                        {/* Tags */}
                        {contact.tags && contact.tags.length > 0 && (
                            <>
                                <Divider />
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Tags</Text>
                                    <HStack spacing={2} wrap="wrap">
                                        {contact.tags.map(tag => (
                                            <Badge key={tag} colorScheme="blue">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </HStack>
                                </Box>
                            </>
                        )}

                        {/* Notes */}
                        {contact.notes && (
                            <>
                                <Divider />
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Notes</Text>
                                    <Text whiteSpace="pre-wrap">{contact.notes}</Text>
                                </Box>
                            </>
                        )}

                        {/* Custom Properties */}
                        {contact.properties && Object.keys(contact.properties).length > 0 && (
                            <>
                                <Divider />
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Additional Information</Text>
                                    <VStack spacing={2} align="stretch">
                                        {Object.entries(contact.properties).map(([key, value]) => (
                                            <HStack key={key}>
                                                <Text fontWeight="medium" minW="150px">
                                                    {key.charAt(0).toUpperCase() + key.slice(1)}:
                                                </Text>
                                                <Text>{value}</Text>
                                            </HStack>
                                        ))}
                                    </VStack>
                                </Box>
                            </>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose}>Close</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ViewContactModal; 
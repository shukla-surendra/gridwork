import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
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
    Divider,
    Box,
    Icon,
    Link,
    Spinner
} from '@chakra-ui/react';
import { AtSignIcon, PhoneIcon, InfoIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { getCompanyContacts } from '../../services/crmService';

const ViewCompanyModal = ({ isOpen, onClose, company, workspaceId }) => {
    const [contacts, setContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);

    useEffect(() => {
        if (isOpen && company?.company_id && workspaceId) {
            setLoadingContacts(true);
            getCompanyContacts(workspaceId, company.company_id)
                .then(setContacts)
                .catch(() => setContacts([]))
                .finally(() => setLoadingContacts(false));
        }
    }, [isOpen, company, workspaceId]);

    if (!company) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{company.name}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <Box>
                            <Text fontWeight="bold" mb={2}>Company Information</Text>
                            <VStack spacing={2} align="stretch">
                                {company.industry && (
                                    <HStack>
                                        <Icon as={InfoIcon} />
                                        <Text>{company.industry}</Text>
                                    </HStack>
                                )}
                                {company.website && (
                                    <HStack>
                                        <Icon as={ExternalLinkIcon} />
                                        <Link href={company.website} color="blue.500" isExternal>
                                            {company.website}
                                        </Link>
                                    </HStack>
                                )}
                                {company.phone && (
                                    <HStack>
                                        <Icon as={PhoneIcon} />
                                        <Link href={`tel:${company.phone}`} color="blue.500">
                                            {company.phone}
                                        </Link>
                                    </HStack>
                                )}
                                {company.size && (
                                    <HStack>
                                        <Icon as={AtSignIcon} />
                                        <Text>{company.size}</Text>
                                    </HStack>
                                )}
                            </VStack>
                        </Box>

                        {company.description && (
                            <>
                                <Divider />
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Description</Text>
                                    <Text whiteSpace="pre-wrap">{company.description}</Text>
                                </Box>
                            </>
                        )}

                        <Divider />
                        <Box>
                            <Text fontWeight="bold" mb={2}>Contacts at this Company</Text>
                            {loadingContacts ? (
                                <Spinner size="sm" />
                            ) : contacts.length > 0 ? (
                                <VStack spacing={2} align="stretch">
                                    {contacts.map((c) => (
                                        <HStack key={c.contact_id} justify="space-between">
                                            <Text>{c.first_name} {c.last_name}</Text>
                                            {c.email && (
                                                <Link href={`mailto:${c.email}`} color="blue.500" fontSize="sm">
                                                    {c.email}
                                                </Link>
                                            )}
                                        </HStack>
                                    ))}
                                </VStack>
                            ) : (
                                <Text color="gray.500">No contacts linked to this company yet.</Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose}>Close</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ViewCompanyModal;

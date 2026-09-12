import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Select,
    FormErrorMessage,
    Grid,
    GridItem,
    Textarea,
    useToast
} from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { editContact } from '../../slices/crm/contactsSlice';
import { fetchCompanies } from '../../slices/crm/companiesSlice';

const EditContactModal = ({ isOpen, onClose, contact, workspaceId }) => {
    const dispatch = useDispatch();
    const { companies } = useSelector((state) => state.companies);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        company_id: '',
        job_title: '',
        address: {},
        social_media: {},
        tags: [],
        status: 'active',
        source: '',
        notes: '',
        properties: {}
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen && workspaceId) {
            dispatch(fetchCompanies(workspaceId));
        }
    }, [isOpen, workspaceId, dispatch]);

    useEffect(() => {
        if (contact) {
            setFormData({
                first_name: contact.first_name || '',
                last_name: contact.last_name || '',
                email: contact.email || '',
                phone: contact.phone || '',
                company: contact.company || '',
                company_id: contact.company_id || '',
                job_title: contact.job_title || '',
                address: contact.address || {},
                social_media: contact.social_media || {},
                tags: contact.tags || [],
                status: contact.status || 'active',
                source: contact.source || '',
                notes: contact.notes || '',
                properties: contact.properties || {}
            });
        }
    }, [contact]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.first_name) newErrors.first_name = 'First name is required';
        if (!formData.last_name) newErrors.last_name = 'Last name is required';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);
            const payload = { ...formData, company_id: formData.company_id || null };
            await dispatch(editContact({ workspaceId, contactId: contact.contact_id, contactData: payload })).unwrap();
            onClose();
            toast({
                title: 'Contact updated successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error updating contact',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <form onSubmit={handleSubmit}>
                    <ModalHeader>Edit Contact</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <GridItem>
                                <FormControl isInvalid={errors.first_name} isRequired>
                                    <FormLabel>First Name</FormLabel>
                                    <Input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                    />
                                    <FormErrorMessage>{errors.first_name}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isInvalid={errors.last_name} isRequired>
                                    <FormLabel>Last Name</FormLabel>
                                    <Input
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                    />
                                    <FormErrorMessage>{errors.last_name}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isInvalid={errors.email}>
                                    <FormLabel>Email</FormLabel>
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Phone</FormLabel>
                                    <Input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Linked Company</FormLabel>
                                    <Select
                                        name="company_id"
                                        placeholder="None"
                                        value={formData.company_id}
                                        onChange={handleChange}
                                    >
                                        {(companies || []).map((c) => (
                                            <option key={c.company_id} value={c.company_id}>{c.name}</option>
                                        ))}
                                    </Select>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Company (free text)</FormLabel>
                                    <Input
                                        name="company"
                                        value={formData.company}
                                        onChange={handleChange}
                                    />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Job Title</FormLabel>
                                    <Input
                                        name="job_title"
                                        value={formData.job_title}
                                        onChange={handleChange}
                                    />
                                </FormControl>
                            </GridItem>
                            <GridItem colSpan={2}>
                                <FormControl>
                                    <FormLabel>Notes</FormLabel>
                                    <Textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows={3}
                                    />
                                </FormControl>
                            </GridItem>
                        </Grid>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            type="submit"
                            isLoading={isSubmitting}
                        >
                            Save Changes
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default EditContactModal; 
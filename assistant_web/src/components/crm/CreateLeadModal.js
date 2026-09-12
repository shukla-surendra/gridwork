import React, { useState } from 'react';
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
import { useDispatch } from 'react-redux';
import { addLead } from '../../slices/crm/leadsSlice';

const emptyForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    source: '',
    notes: '',
};

const CreateLeadModal = ({ isOpen, onClose, workspaceId }) => {
    const dispatch = useDispatch();
    const toast = useToast();
    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);
            await dispatch(addLead({ workspaceId, leadData: formData })).unwrap();
            setFormData(emptyForm);
            onClose();
            toast({ title: 'Lead created', status: 'success', duration: 3000, isClosable: true });
        } catch (error) {
            toast({ title: 'Error creating lead', description: error.message, status: 'error', duration: 5000, isClosable: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <form onSubmit={handleSubmit}>
                    <ModalHeader>New Lead</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <GridItem>
                                <FormControl isInvalid={errors.first_name} isRequired>
                                    <FormLabel>First Name</FormLabel>
                                    <Input name="first_name" value={formData.first_name} onChange={handleChange} />
                                    <FormErrorMessage>{errors.first_name}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isInvalid={errors.last_name} isRequired>
                                    <FormLabel>Last Name</FormLabel>
                                    <Input name="last_name" value={formData.last_name} onChange={handleChange} />
                                    <FormErrorMessage>{errors.last_name}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isInvalid={errors.email}>
                                    <FormLabel>Email</FormLabel>
                                    <Input name="email" type="email" value={formData.email} onChange={handleChange} />
                                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Phone</FormLabel>
                                    <Input name="phone" value={formData.phone} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Company Name</FormLabel>
                                    <Input name="company_name" value={formData.company_name} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Job Title</FormLabel>
                                    <Input name="job_title" value={formData.job_title} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem colSpan={2}>
                                <FormControl>
                                    <FormLabel>Source</FormLabel>
                                    <Select name="source" placeholder="Select source" value={formData.source} onChange={handleChange}>
                                        <option value="website">Website</option>
                                        <option value="referral">Referral</option>
                                        <option value="cold_call">Cold Call</option>
                                        <option value="event">Event</option>
                                        <option value="social_media">Social Media</option>
                                        <option value="other">Other</option>
                                    </Select>
                                </FormControl>
                            </GridItem>
                            <GridItem colSpan={2}>
                                <FormControl>
                                    <FormLabel>Notes</FormLabel>
                                    <Textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} />
                                </FormControl>
                            </GridItem>
                        </Grid>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
                        <Button colorScheme="blue" type="submit" isLoading={isSubmitting}>Create Lead</Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateLeadModal;

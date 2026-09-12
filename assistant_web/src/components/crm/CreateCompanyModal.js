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
    FormErrorMessage,
    Grid,
    GridItem,
    Textarea,
    useToast
} from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { addCompany } from '../../slices/crm/companiesSlice';

const CreateCompanyModal = ({ isOpen, onClose, workspaceId }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        website: '',
        size: '',
        phone: '',
        description: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Company name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);
            await dispatch(addCompany({ workspaceId, companyData: formData })).unwrap();
            onClose();
            setFormData({ name: '', industry: '', website: '', size: '', phone: '', description: '' });
            toast({
                title: 'Company created successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error creating company',
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
                    <ModalHeader>Create New Company</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <GridItem colSpan={2}>
                                <FormControl isInvalid={errors.name} isRequired>
                                    <FormLabel>Company Name</FormLabel>
                                    <Input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                    />
                                    <FormErrorMessage>{errors.name}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Industry</FormLabel>
                                    <Input
                                        name="industry"
                                        value={formData.industry}
                                        onChange={handleChange}
                                    />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Website</FormLabel>
                                    <Input
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                    />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Size</FormLabel>
                                    <Input
                                        name="size"
                                        placeholder="e.g. 11-50 employees"
                                        value={formData.size}
                                        onChange={handleChange}
                                    />
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
                            <GridItem colSpan={2}>
                                <FormControl>
                                    <FormLabel>Description</FormLabel>
                                    <Textarea
                                        name="description"
                                        value={formData.description}
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
                            Create Company
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateCompanyModal;

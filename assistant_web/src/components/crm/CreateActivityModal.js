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
    Select,
    useToast
} from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { addActivity } from '../../slices/crm/activitiesSlice';

// A ContactActivity/DealActivity can only ever belong to ONE contact or ONE
// deal -- crm_controller.py has no standalone activities collection, only
// nested /contacts/{id}/activities and /deals/{id}/activities. So "related
// to" here picks both WHICH kind and WHICH specific record, and that's what
// decides which endpoint addActivity actually calls.
const CreateActivityModal = ({ isOpen, onClose, workspaceId, contacts = [], deals = [], onCreated }) => {
    const dispatch = useDispatch();
    const toast = useToast();
    const [formData, setFormData] = useState({
        type: '',
        title: '',
        description: '',
        entityType: 'contact',
        entityId: '',
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.type) newErrors.type = 'Type is required';
        if (!formData.title) newErrors.title = 'Title is required';
        if (!formData.entityId) newErrors.entityId = `Select a ${formData.entityType}`;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const resetForm = () => {
        setFormData({ type: '', title: '', description: '', entityType: 'contact', entityId: '' });
        setErrors({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);
            await dispatch(addActivity({
                workspaceId,
                entityType: formData.entityType,
                entityId: formData.entityId,
                activityData: {
                    type: formData.type,
                    title: formData.title,
                    description: formData.description || undefined,
                },
            })).unwrap();
            await onCreated?.();
            toast({
                title: 'Activity created',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            resetForm();
            onClose();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create activity',
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
            [name]: value,
            // Switching kind invalidates whichever specific record was picked.
            ...(name === 'entityType' ? { entityId: '' } : {}),
        }));
    };

    const entityOptions = formData.entityType === 'contact'
        ? contacts.map(c => ({ id: c.contact_id, label: `${c.first_name} ${c.last_name}` }))
        : deals.map(d => ({ id: d.deal_id, label: d.title }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <form onSubmit={handleSubmit}>
                    <ModalHeader>Create New Activity</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <GridItem>
                                <FormControl isInvalid={errors.type} isRequired>
                                    <FormLabel>Type</FormLabel>
                                    <Select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select type</option>
                                        <option value="call">Call</option>
                                        <option value="email">Email</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="note">Note</option>
                                    </Select>
                                    <FormErrorMessage>{errors.type}</FormErrorMessage>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl isInvalid={errors.title} isRequired>
                                    <FormLabel>Title</FormLabel>
                                    <Input
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Short title"
                                    />
                                    <FormErrorMessage>{errors.title}</FormErrorMessage>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl isRequired>
                                    <FormLabel>Related to</FormLabel>
                                    <Select
                                        name="entityType"
                                        value={formData.entityType}
                                        onChange={handleChange}
                                    >
                                        <option value="contact">Contact</option>
                                        <option value="deal">Deal</option>
                                    </Select>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl isInvalid={errors.entityId} isRequired>
                                    <FormLabel>{formData.entityType === 'contact' ? 'Contact' : 'Deal'}</FormLabel>
                                    <Select
                                        name="entityId"
                                        value={formData.entityId}
                                        onChange={handleChange}
                                    >
                                        <option value="">
                                            {`Select ${formData.entityType}`}
                                        </option>
                                        {entityOptions.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </Select>
                                    <FormErrorMessage>{errors.entityId}</FormErrorMessage>
                                </FormControl>
                            </GridItem>

                            <GridItem colSpan={2}>
                                <FormControl>
                                    <FormLabel>Description</FormLabel>
                                    <Textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Enter activity description"
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
                            Create Activity
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateActivityModal;

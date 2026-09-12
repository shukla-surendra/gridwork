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
    Grid,
    GridItem,
    Textarea,
    Select,
    useToast
} from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { editActivity } from '../../slices/crm/activitiesSlice';

// `activity` here is one of the items ActivitiesPanel's fetch already
// tagged with entity_type/entity_id -- which contact/deal it belongs to
// can't change on edit (there's no "move this activity" concept in the
// API), so entity_type/entity_id are read-only, display-only fields here.
const EditActivityModal = ({ isOpen, onClose, activity, workspaceId, contacts = [], deals = [], onUpdated }) => {
    const dispatch = useDispatch();
    const toast = useToast();
    const [formData, setFormData] = useState({
        type: activity.type || '',
        title: activity.title || '',
        description: activity.description || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const relatedLabel = activity.entity_type === 'contact'
        ? contacts.find(c => c.contact_id === activity.entity_id)
            ? `${contacts.find(c => c.contact_id === activity.entity_id).first_name} ${contacts.find(c => c.contact_id === activity.entity_id).last_name}`
            : activity.contact_name
        : deals.find(d => d.deal_id === activity.entity_id)?.title || activity.deal_name;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await dispatch(editActivity({
                workspaceId,
                entityType: activity.entity_type,
                entityId: activity.entity_id,
                activityId: activity.activity_id,
                activityData: formData,
            })).unwrap();
            await onUpdated?.();
            toast({
                title: 'Activity updated',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            onClose();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update activity',
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
                    <ModalHeader>Edit Activity</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <GridItem>
                                <FormControl>
                                    <FormLabel>Type</FormLabel>
                                    <Select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                    >
                                        <option value="call">Call</option>
                                        <option value="email">Email</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="note">Note</option>
                                    </Select>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl isRequired>
                                    <FormLabel>Title</FormLabel>
                                    <Input
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                    />
                                </FormControl>
                            </GridItem>

                            <GridItem colSpan={2}>
                                <FormControl>
                                    <FormLabel>
                                        Related {activity.entity_type === 'contact' ? 'contact' : 'deal'}
                                    </FormLabel>
                                    <Input value={relatedLabel || '-'} isReadOnly isDisabled />
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
                            Save Changes
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default EditActivityModal;

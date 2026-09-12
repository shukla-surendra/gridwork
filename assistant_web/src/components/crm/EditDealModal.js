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
    Textarea,
    NumberInput,
    NumberInputField,
    useToast,
} from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { editDeal } from '../../slices/crm/dealsSlice';

const EditDealModal = ({ isOpen, onClose, deal, workspaceId, onSuccess }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        title: '',
        value: 0,
        stage: '',
        description: '',
        expected_close_date: '',
    });
    const toast = useToast();

    useEffect(() => {
        if (deal) {
            setFormData({
                title: deal.title || '',
                value: deal.value || 0,
                stage: deal.stage || '',
                description: deal.description || '',
                // Backend field is expected_close_date (see commands/crm_cmd.py's
                // DealBase) -- deal.expectedCloseDate never existed on the API
                // response, so this always read as empty before.
                expected_close_date: deal.expected_close_date
                    ? new Date(deal.expected_close_date).toISOString().split('T')[0]
                    : '',
            });
        }
    }, [deal]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await dispatch(editDeal({ workspaceId, dealId: deal.deal_id, dealData: formData })).unwrap();
            toast({
                title: 'Deal updated successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            onSuccess();
            onClose();
        } catch (error) {
            toast({
                title: 'Error updating deal',
                description: error.message,
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent>
                <form onSubmit={handleSubmit}>
                    <ModalHeader>Edit Deal</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl mb={4}>
                            <FormLabel>Title</FormLabel>
                            <Input
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Value</FormLabel>
                            <NumberInput min={0}>
                                <NumberInputField
                                    name="value"
                                    value={formData.value}
                                    onChange={handleChange}
                                    required
                                />
                            </NumberInput>
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Stage</FormLabel>
                            <Select
                                name="stage"
                                value={formData.stage}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Stage</option>
                                <option value="lead">Lead</option>
                                <option value="proposal">Proposal</option>
                                <option value="negotiation">Negotiation</option>
                                <option value="closed">Closed</option>
                                <option value="lost">Lost</option>
                            </Select>
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Expected Close Date</FormLabel>
                            <Input
                                type="date"
                                name="expected_close_date"
                                value={formData.expected_close_date}
                                onChange={handleChange}
                            />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button colorScheme="blue" type="submit">
                            Save Changes
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default EditDealModal; 
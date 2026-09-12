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
    FormErrorMessage,
    Grid,
    GridItem,
    Textarea,
    Select,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    useToast
} from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { addDeal } from '../../slices/crm/dealsSlice';

const CreateDealModal = ({ isOpen, onClose, workspaceId }) => {
    const dispatch = useDispatch();
    const { contacts } = useSelector((state) => state.contacts || {});
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        value: 0,
        currency: 'USD',
        stage: 'lead',
        probability: 0,
        expected_close_date: '',
        contact_id: '',
        company: '',
        source: '',
        tags: [],
        properties: {}
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title) newErrors.title = 'Title is required';
        if (!formData.value) newErrors.value = 'Value is required';
        if (!formData.expected_close_date) newErrors.expected_close_date = 'Expected close date is required';
        if (!formData.stage) newErrors.stage = 'Stage is required';
        // DealCreate requires contact_id (see commands/crm_cmd.py) -- a deal
        // always belongs to exactly one contact.
        if (!formData.contact_id) newErrors.contact_id = 'Contact is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);
            await dispatch(addDeal({ workspaceId, dealData: formData })).unwrap();
            onClose();
            toast({
                title: 'Deal created successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error creating deal',
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

    const handleNumberChange = (name, value) => {
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
                    <ModalHeader>Create New Deal</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <GridItem colSpan={2}>
                                <FormControl isInvalid={errors.title} isRequired>
                                    <FormLabel>Title</FormLabel>
                                    <Input
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Enter deal title"
                                    />
                                    <FormErrorMessage>{errors.title}</FormErrorMessage>
                                </FormControl>
                            </GridItem>

                            <GridItem colSpan={2}>
                                <FormControl isInvalid={errors.contact_id} isRequired>
                                    <FormLabel>Contact</FormLabel>
                                    <Select
                                        name="contact_id"
                                        value={formData.contact_id}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select contact</option>
                                        {(contacts || []).map(c => (
                                            <option key={c.contact_id} value={c.contact_id}>
                                                {c.first_name} {c.last_name}
                                            </option>
                                        ))}
                                    </Select>
                                    <FormErrorMessage>{errors.contact_id}</FormErrorMessage>
                                </FormControl>
                            </GridItem>

                            <GridItem colSpan={2}>
                                <FormControl>
                                    <FormLabel>Description</FormLabel>
                                    <Textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Enter deal description"
                                        rows={3}
                                    />
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl isInvalid={errors.value} isRequired>
                                    <FormLabel>Value</FormLabel>
                                    <NumberInput
                                        min={0}
                                        value={formData.value}
                                        onChange={(value) => handleNumberChange('value', value)}
                                    >
                                        <NumberInputField />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                    <FormErrorMessage>{errors.value}</FormErrorMessage>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl>
                                    <FormLabel>Currency</FormLabel>
                                    <Select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleChange}
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                    </Select>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl isInvalid={errors.stage} isRequired>
                                    <FormLabel>Stage</FormLabel>
                                    <Select
                                        name="stage"
                                        value={formData.stage}
                                        onChange={handleChange}
                                    >
                                        <option value="lead">Lead</option>
                                        <option value="qualified">Qualified</option>
                                        <option value="proposal">Proposal</option>
                                        <option value="negotiation">Negotiation</option>
                                        <option value="closed_won">Closed Won</option>
                                        <option value="closed_lost">Closed Lost</option>
                                    </Select>
                                    <FormErrorMessage>{errors.stage}</FormErrorMessage>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl>
                                    <FormLabel>Probability (%)</FormLabel>
                                    <NumberInput
                                        min={0}
                                        max={100}
                                        value={formData.probability}
                                        onChange={(value) => handleNumberChange('probability', value)}
                                    >
                                        <NumberInputField />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl isInvalid={errors.expected_close_date} isRequired>
                                    <FormLabel>Expected Close Date</FormLabel>
                                    <Input
                                        name="expected_close_date"
                                        type="date"
                                        value={formData.expected_close_date}
                                        onChange={handleChange}
                                    />
                                    <FormErrorMessage>{errors.expected_close_date}</FormErrorMessage>
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl>
                                    <FormLabel>Company</FormLabel>
                                    <Input
                                        name="company"
                                        value={formData.company}
                                        onChange={handleChange}
                                        placeholder="Enter company name"
                                    />
                                </FormControl>
                            </GridItem>

                            <GridItem>
                                <FormControl>
                                    <FormLabel>Source</FormLabel>
                                    <Select
                                        name="source"
                                        value={formData.source}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select source</option>
                                        <option value="website">Website</option>
                                        <option value="referral">Referral</option>
                                        <option value="social_media">Social Media</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Phone</option>
                                        <option value="other">Other</option>
                                    </Select>
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
                            Create Deal
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateDealModal; 
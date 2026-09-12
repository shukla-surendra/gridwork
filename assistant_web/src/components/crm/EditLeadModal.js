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
    Grid,
    GridItem,
    Textarea,
    Alert,
    AlertIcon,
    useToast
} from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { editLead } from '../../slices/crm/leadsSlice';

const EditLeadModal = ({ isOpen, onClose, lead, workspaceId }) => {
    const dispatch = useDispatch();
    const toast = useToast();
    const isConverted = lead?.status === 'converted';
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        company_name: '', job_title: '', source: '', status: 'new', notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (lead) {
            setFormData({
                first_name: lead.first_name || '',
                last_name: lead.last_name || '',
                email: lead.email || '',
                phone: lead.phone || '',
                company_name: lead.company_name || '',
                job_title: lead.job_title || '',
                source: lead.source || '',
                status: lead.status || 'new',
                notes: lead.notes || '',
            });
        }
    }, [lead]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await dispatch(editLead({ workspaceId, leadId: lead.lead_id, leadData: formData })).unwrap();
            onClose();
            toast({ title: 'Lead updated', status: 'success', duration: 3000, isClosable: true });
        } catch (error) {
            toast({ title: 'Error updating lead', description: error.message, status: 'error', duration: 5000, isClosable: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <form onSubmit={handleSubmit}>
                    <ModalHeader>{isConverted ? 'Lead (Converted)' : 'Edit Lead'}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {isConverted && (
                            <Alert status="success" mb={4} borderRadius="md">
                                <AlertIcon />
                                This lead was converted and can no longer be edited.
                            </Alert>
                        )}
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <GridItem>
                                <FormControl isRequired isDisabled={isConverted}>
                                    <FormLabel>First Name</FormLabel>
                                    <Input name="first_name" value={formData.first_name} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isRequired isDisabled={isConverted}>
                                    <FormLabel>Last Name</FormLabel>
                                    <Input name="last_name" value={formData.last_name} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isDisabled={isConverted}>
                                    <FormLabel>Email</FormLabel>
                                    <Input name="email" type="email" value={formData.email} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isDisabled={isConverted}>
                                    <FormLabel>Phone</FormLabel>
                                    <Input name="phone" value={formData.phone} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isDisabled={isConverted}>
                                    <FormLabel>Company Name</FormLabel>
                                    <Input name="company_name" value={formData.company_name} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isDisabled={isConverted}>
                                    <FormLabel>Job Title</FormLabel>
                                    <Input name="job_title" value={formData.job_title} onChange={handleChange} />
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isDisabled={isConverted}>
                                    <FormLabel>Source</FormLabel>
                                    <Select name="source" value={formData.source} onChange={handleChange}>
                                        <option value="">-</option>
                                        <option value="website">Website</option>
                                        <option value="referral">Referral</option>
                                        <option value="cold_call">Cold Call</option>
                                        <option value="event">Event</option>
                                        <option value="social_media">Social Media</option>
                                        <option value="other">Other</option>
                                    </Select>
                                </FormControl>
                            </GridItem>
                            <GridItem>
                                <FormControl isDisabled={isConverted}>
                                    <FormLabel>Status</FormLabel>
                                    <Select name="status" value={formData.status} onChange={handleChange}>
                                        <option value="new">New</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="qualified">Qualified</option>
                                        <option value="unqualified">Unqualified</option>
                                    </Select>
                                </FormControl>
                            </GridItem>
                            <GridItem colSpan={2}>
                                <FormControl isDisabled={isConverted}>
                                    <FormLabel>Notes</FormLabel>
                                    <Textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} />
                                </FormControl>
                            </GridItem>
                        </Grid>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>Close</Button>
                        {!isConverted && (
                            <Button colorScheme="blue" type="submit" isLoading={isSubmitting}>Save</Button>
                        )}
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default EditLeadModal;

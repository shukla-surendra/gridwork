import { ModalBody, Button, Modal, ModalOverlay, ModalContent, ModalHeader, FormControl, ModalFooter, Input, useDisclosure } from "@chakra-ui/react";
import { useDispatch } from "react-redux";
import { useRouter } from 'next/router';
import React, { useState } from "react";
import { deleteNotes, deleteTask } from "../../../slices/tasks";
import { useToast } from '@chakra-ui/react';

export default function DeleteTaskNoteModal(props) {
    const { isOpen, onOpen, onClose } = props.disclosures;
    const { task_id } = props.currentTask;
    const { type } = props;
    const router = useRouter();
    const navigate = (path) => router.push(path);
    const [isDeleting, setIsDeleting] = useState(false);
    const toast = useToast();
    const dispatch = useDispatch();

    const removeItem = () => {
      setIsDeleting(true);
      const action = type === 'task' ? deleteTask : deleteNotes;
      dispatch(action({ task_id }))
        .unwrap()
        .then(() => {
          onClose();
          toast({
            title: 'Item deleted.',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          navigate(type === 'task' ? "/tasks" : "/notes");
        })
        .catch(e => {
          console.log(e);
          toast({
            title: 'An error occurred.',
            description: 'Unable to delete item.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        })
        .finally(() => {
          setIsDeleting(false);
        });
    };

    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete {type === 'task' ? 'Task' : 'Note'}</ModalHeader>
          <ModalBody>Are you sure you want to delete this {type}?</ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" ml={3} onClick={removeItem} isLoading={isDeleting}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
}
import React from "react";
import { Modal, ModalContent, ModalOverlay, useColorModeValue } from "@chakra-ui/react";
import IssueView from "../../issues/IssueView";

// The issue view in a modal -- what opens when you click an issue on a
// board, backlog or list. The same view renders full-page at /page-detail.
export default function EditTaskDrawer({ currentTask, setCurrentTask, disclosures, onTaskUpdate, onTaskDelete }) {
  const { isOpen, onClose } = disclosures;
  const bg = useColorModeValue("white", "gray.800");

  return (
    <Modal isOpen={isOpen && !!currentTask?.task_id} onClose={onClose} size="6xl" scrollBehavior="inside"
      // Closing goes through IssueView's close button, which asks before
      // throwing away unsaved edits.
      closeOnOverlayClick={false} closeOnEsc={false} blockScrollOnMount>
      <ModalOverlay />
      <ModalContent bg={bg} my={{ base: 0, md: 8 }} h={{ base: "100vh", md: "calc(100vh - 4rem)" }} maxW={{ base: "100vw", md: "1180px" }}
        overflow="hidden">
        <IssueView
          task={currentTask}
          setTask={setCurrentTask}
          onSaved={onTaskUpdate}
          onDeleted={onTaskDelete}
          onClose={onClose}
        />
      </ModalContent>
    </Modal>
  );
}

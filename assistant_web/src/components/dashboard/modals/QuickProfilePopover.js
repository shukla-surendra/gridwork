import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Input,
  Button,
  FormLabel,
  HStack,
  Text,
  Divider,
  Spinner,
  Center,
  Switch,
  useColorMode,
  useToast,
} from "@chakra-ui/react";
import { useDispatch } from "react-redux";
import { updateProfile } from "../../../slices/auth";
import AvatarUpload from "./AvatarUpload";

function fullName(user) {
  return `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
}

// The fast, lightweight popup for "I just want to change my name/photo/
// theme without leaving this page" -- anything heavier (workspace rename,
// delete account, notification/module preferences) lives on the full
// Settings page (/settings) instead, reached via the "Settings" menu item
// next to this one.
export default function QuickProfilePopover(props) {
  // Handle both direct props and disclosures prop
  const isOpen = props.isOpen || props.disclosures?.isOpen;
  const onClose = props.onClose || props.disclosures?.onClose;
  const user = props.user;

  const dispatch = useDispatch();
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();
  const [name, setName] = useState(fullName(user));
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync when the real user (e.g. after the demo/login swap) arrives.
  useEffect(() => {
    setName(fullName(user));
  }, [user?.user_id, user?.first_name, user?.last_name]);

  const handleSave = () => {
    const [first_name, ...rest] = name.trim().split(/\s+/);
    if (!first_name) {
      toast({ title: "Name can't be empty", status: "warning", duration: 2500, isClosable: true });
      return;
    }
    setIsSaving(true);
    dispatch(updateProfile({
      userId: user.user_id,
      data: { first_name, last_name: rest.join(" ") || null },
    }))
      .unwrap()
      .then(() => {
        toast({ title: "Profile updated", status: "success", duration: 2500, isClosable: true });
        onClose();
      })
      .catch((err) => {
        toast({ title: "Couldn't update profile", description: err, status: "error", duration: 3500, isClosable: true });
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontWeight={600} fontSize={20}>
          Quick Profile
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!user ? (
            <Center py={10}><Spinner /></Center>
          ) : (
            <VStack align="center" spacing={6} pb={4}>
              <AvatarUpload user={user} />
              <VStack align="flex-start" spacing={2} w="100%">
                <FormLabel mb={0}>Name</FormLabel>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  fontWeight="bold"
                  fontSize="lg"
                  placeholder="Full Name"
                />
                <FormLabel mb={0}>Email</FormLabel>
                <Input
                  value={user.email || ""}
                  isReadOnly
                  fontSize="md"
                  placeholder="Email"
                />
              </VStack>
              <Divider />
              <HStack w="100%" justify="space-between">
                <Text fontSize="sm">Dark Mode</Text>
                <Switch isChecked={colorMode === "dark"} onChange={toggleColorMode} />
              </HStack>
              <Divider />
              <HStack w="100%" justify="flex-end">
                <Button colorScheme="blue" size="sm" onClick={handleSave} isLoading={isSaving}>
                  Save Changes
                </Button>
              </HStack>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

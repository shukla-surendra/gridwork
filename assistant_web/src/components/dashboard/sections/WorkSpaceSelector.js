import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Center,
  Flex,
  HStack,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  VStack,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  Avatar,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { FaCog, FaUser } from 'react-icons/fa';
import { MdExitToApp } from 'react-icons/md';
import { HiChevronUpDown } from 'react-icons/hi2';
import { FiPlus, FiEdit2 } from 'react-icons/fi';
import { useRouter } from 'next/router';
import QuickProfilePopover from '../modals/QuickProfilePopover';
import { selectWorkspace, fetchWorkspaces, createWorkspace, updateWorkspace } from '../../../slices/workspaces';

import Auth from "../../../utils/auth";
import Config from "../../../utils/config"

const emptyForm = { name: '', description: '' };

function WorkspaceSelector() {
  // Lazy initializer with a try/catch -- getDefaultWorkspace() throws when
  // no workspace is selected yet (or, under Next's static export, during
  // the server-side prerender pass where localStorage doesn't exist at
  // all), and an uncaught throw here would crash the whole render tree.
  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    try {
      return Config.getDefaultWorkspace();
    } catch (e) {
      return null;
    }
  });
  const workspaces = useSelector(state => state.workspaces.workspaces);
  const user = useSelector(state => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const profileDisclosures = useDisclosure();
  const toast = useToast();

  // Theme-aware colors -- this component previously hardcoded gray.100/
  // gray.200 for hover/selected states, which looked washed out (near-
  // invisible selection highlight) in dark mode since it never adapted.
  const nameColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const popoverBg = useColorModeValue('white', 'gray.800');
  const popoverBorder = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const selectedBg = useColorModeValue('teal.50', 'teal.900');
  const selectedBorder = useColorModeValue('teal.200', 'teal.600');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const dividerColor = useColorModeValue('gray.200', 'gray.600');
  const footerHoverBg = useColorModeValue('gray.100', 'gray.700');

  const initFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    dispatch(fetchWorkspaces())
      .unwrap()
      .catch(e => {
        console.error("Workspace fetch error:", e);
        setError("Failed to load workspaces");
      })
      .finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    initFetch();
  }, [initFetch]);

  const logout = (event) => {
    event.preventDefault();
    Auth.logout()
  }

  const openQuickProfile = () => {
    profileDisclosures.onOpen();
  };

  const handleWorkspaceSelect = (workspace) => {
    setCurrentWorkspace(workspace);
    setIsPopoverOpen(false);
    Config.setDefaultWorkspace(workspace);
    // Optionally, trigger a soft reload or data refetch here instead of full reload
    // window.location.assign('/');
  };

  // -- Create / edit workspace ---------------------------------------------

  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const [form, setForm] = useState(emptyForm);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setForm(emptyForm);
    setIsPopoverOpen(false);
    createModal.onOpen();
  };

  const openEditModal = (event, workspace) => {
    event.stopPropagation(); // don't also trigger handleWorkspaceSelect on the row
    setEditingWorkspace(workspace);
    setForm({ name: workspace.name, description: workspace.description || '' });
    setIsPopoverOpen(false);
    editModal.onOpen();
  };

  const handleCreateWorkspace = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      const workspace = await dispatch(createWorkspace({ name: form.name.trim(), description: form.description.trim() || null })).unwrap();
      toast({ title: "Workspace created", status: "success", duration: 2500, isClosable: true });
      createModal.onClose();
      handleWorkspaceSelect(workspace);
    } catch (err) {
      toast({ title: "Couldn't create workspace", description: typeof err === 'string' ? err : undefined, status: "error", duration: 3500, isClosable: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateWorkspace = async () => {
    if (!form.name.trim() || !editingWorkspace) return;
    setIsSaving(true);
    try {
      const workspace = await dispatch(updateWorkspace({
        id: editingWorkspace.workspace_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
      })).unwrap();
      toast({ title: "Workspace updated", status: "success", duration: 2500, isClosable: true });
      editModal.onClose();
      if (currentWorkspace?.workspace_id === workspace.workspace_id) {
        setCurrentWorkspace(workspace);
        Config.setDefaultWorkspace(workspace);
      }
    } catch (err) {
      toast({ title: "Couldn't update workspace", description: typeof err === 'string' ? err : undefined, status: "error", duration: 3500, isClosable: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <QuickProfilePopover disclosures={profileDisclosures} user={user} />
      <Box p="2" fontSize="14px">
        <Center>
          <Flex align="center" minW={0} gap={2}>
            <Avatar size="xs" name={currentWorkspace?.name} />
            <Text
              fontWeight="bold"
              color={nameColor}
              maxW="140px"
              isTruncated
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {currentWorkspace?.name}
            </Text>
            <Popover
              isOpen={isPopoverOpen}
              onOpen={() => setIsPopoverOpen(true)}
              onClose={() => setIsPopoverOpen(false)}
              placement="bottom"
            >
              <PopoverTrigger>
                <IconButton
                  aria-label="Select workspace"
                  icon={<HiChevronUpDown />}
                  size="sm"
                  variant="ghost"
                  alignSelf="center"
                  mt={0}
                  mb={0}
                  p={0}
                />
              </PopoverTrigger>
              <PopoverContent w="260px" bg={popoverBg} borderColor={popoverBorder}>
                <PopoverArrow bg={popoverBg} />
                <PopoverCloseButton />
                <PopoverHeader mb="1" borderColor={popoverBorder}>Workspaces</PopoverHeader>
                <PopoverBody pb="1">
                  {loading && <Center py={2}><Spinner size="sm" /></Center>}
                  {error && (
                    <Alert status="error" mb={2} borderRadius="md">
                      <AlertIcon />
                      {error}
                    </Alert>
                  )}
                  <VStack align="stretch" spacing="1" maxH="240px" overflowY="auto">
                    {workspaces.map((workspace) => {
                      const isSelected = workspace.workspace_id === currentWorkspace?.workspace_id;
                      const isOwner = user?.user_id && workspace.owner_id === user.user_id;
                      return (
                        <HStack
                          key={workspace.workspace_id}
                          p="1.5"
                          spacing={2}
                          cursor="pointer"
                          onClick={() => handleWorkspaceSelect(workspace)}
                          _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                          borderRadius="md"
                          bg={isSelected ? selectedBg : 'transparent'}
                          border="1px solid"
                          borderColor={isSelected ? selectedBorder : 'transparent'}
                          justify="space-between"
                        >
                          <HStack spacing={2} minW={0}>
                            <Avatar size="2xs" name={workspace.name} />
                            <Text fontWeight={isSelected ? 'bold' : 'normal'} isTruncated>
                              {workspace.name}
                            </Text>
                          </HStack>
                          {isOwner && (
                            <IconButton
                              aria-label="Edit workspace"
                              icon={<FiEdit2 />}
                              size="xs"
                              variant="ghost"
                              onClick={(e) => openEditModal(e, workspace)}
                            />
                          )}
                        </HStack>
                      );
                    })}
                    {!loading && workspaces.length === 0 && (
                      <Text fontSize="sm" color={mutedText} py={2}>No workspaces yet.</Text>
                    )}
                  </VStack>

                  <Button
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiPlus />}
                    onClick={openCreateModal}
                    mt="1"
                    w="100%"
                  >
                    New Workspace
                  </Button>

                  <Divider borderColor={dividerColor} mt="1" />
                  <Box pt="1">
                    <HStack align="center" justify="space-between" p="1" borderRadius="md" cursor="pointer" _hover={{ bg: footerHoverBg }} onClick={openQuickProfile}>
                      <HStack spacing="2">
                        <FaUser />
                        <Text>Quick Profile</Text>
                      </HStack>
                    </HStack>
                    <HStack align="center" justify="space-between" p="1" borderRadius="md" cursor="pointer" _hover={{ bg: footerHoverBg }} onClick={() => navigate('/settings')}>
                      <HStack spacing="2">
                        <FaCog />
                        <Text>Settings</Text>
                      </HStack>
                    </HStack>
                    <HStack align="center" justify="space-between" p="1" borderRadius="md" cursor="pointer" _hover={{ bg: footerHoverBg }} onClick={logout}>
                      <HStack spacing="2">
                        <MdExitToApp />
                        <Text>Logout</Text>
                      </HStack>
                    </HStack>
                  </Box>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        </Center>
      </Box>

      {/* New Workspace Modal */}
      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Workspace</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Description</FormLabel>
                <Textarea size="sm" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={createModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateWorkspace} isLoading={isSaving} isDisabled={!form.name.trim()}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Workspace Modal */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Workspace</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Description</FormLabel>
                <Textarea size="sm" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={editModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleUpdateWorkspace} isLoading={isSaving} isDisabled={!form.name.trim()}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default WorkspaceSelector;

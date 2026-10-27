import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, FormControl, FormLabel, FormErrorMessage, Input, InputGroup, InputRightElement, IconButton,
  VStack, List, ListItem, ListIcon, useToast,
} from '@chakra-ui/react';
import { FiCheckCircle, FiCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import UserService from '../../services/userservice';

// Mirrors utils/passwords.py on the backend -- shown live so users see
// what's missing before submitting rather than after a 400.
const RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
  { label: 'A special character (!@#$%^&*…)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function PasswordInput({ value, onChange, autoComplete, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <InputGroup size="sm">
      <Input type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} autoFocus={autoFocus} />
      <InputRightElement>
        <IconButton
          size="xs"
          variant="ghost"
          icon={visible ? <FiEyeOff /> : <FiEye />}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible(v => !v)}
        />
      </InputRightElement>
    </InputGroup>
  );
}

export default function ChangePasswordModal({ isOpen, onClose }) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const allRulesPass = RULES.every(r => r.test(next));
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current && allRulesPass && confirm === next && !saving;

  const close = () => {
    setCurrent(''); setNext(''); setConfirm(''); setError(null);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await UserService.changePassword(current, next);
      toast({ title: 'Password changed', status: 'success', duration: 3000, isClosable: true });
      close();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close}>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={submit}>
        <ModalHeader>Change password</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!error}>
              <FormLabel fontSize="sm">Current password</FormLabel>
              <PasswordInput value={current} onChange={(e) => { setCurrent(e.target.value); setError(null); }} autoComplete="current-password" autoFocus />
              <FormErrorMessage>{error}</FormErrorMessage>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">New password</FormLabel>
              <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
              <List spacing={1} mt={2} fontSize="xs">
                {RULES.map(rule => {
                  const ok = rule.test(next);
                  return (
                    <ListItem key={rule.label} color={ok ? 'green.500' : 'gray.500'}>
                      <ListIcon as={ok ? FiCheckCircle : FiCircle} />
                      {rule.label}
                    </ListItem>
                  );
                })}
              </List>
            </FormControl>
            <FormControl isRequired isInvalid={mismatch}>
              <FormLabel fontSize="sm">Confirm new password</FormLabel>
              <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              <FormErrorMessage>Passwords don't match</FormErrorMessage>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={close}>Cancel</Button>
          <Button colorScheme="teal" type="submit" isLoading={saving} isDisabled={!canSubmit}>Change password</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

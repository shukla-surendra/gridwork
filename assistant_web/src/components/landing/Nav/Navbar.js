import React from "react";
import RouterLink from 'next/link';
import {
  Box,
  Container,
  Flex,
  HStack,
  IconButton,
  Button,
  useColorModeValue,
  useDisclosure,
  Collapse,
  VStack,
  Text,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import Auth from '../../../utils/auth';
import appData from '../../../config.json';

const navLinks = [
  { name: 'Pomodoro', path: '/pomodoro' },
  { name: 'About', path: '/about' },
  // { name: 'Features', path: '/feature' },
  // { name: 'Pricing', path: '/pricing' }
];

const dropdownLinks = [
  {
    name: 'Blog',
    path: '/blogs'
  }
];

export default function Navbar() {
  const { isOpen, onToggle } = useDisclosure();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const linkColor = useColorModeValue('gray.600', 'gray.200');
  const linkHoverColor = 'brand.500';

  const NavLink = ({ to, children }) => (
    <RouterLink href={to}
      style={{
        color: linkColor,
        fontWeight: 'medium',
        _hover: { color: linkHoverColor }
      }}
    >
      {children}
    </RouterLink>
  );

  return (
    <Box
      as="nav"
      position="fixed"
      w="full"
      bg={bgColor}
      borderBottomWidth="1px"
      borderColor={borderColor}
      zIndex="sticky"
    >
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <IconButton
            size="md"
            icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
            aria-label="Open Menu"
            display={{ md: 'none' }}
            onClick={onToggle}
          />
          <HStack spacing={8} alignItems="center">
            <RouterLink href="/">
              <Text
                fontSize="2xl"
                fontWeight="bold"
                color="brand.500"
                _hover={{ color: 'brand.600' }}
              >
                {appData.project_name}
              </Text>
            </RouterLink>
            <HStack
              as="nav"
              spacing={4}
              display={{ base: 'none', md: 'flex' }}
            >
              {navLinks.map((link) => (
                <NavLink key={link.path} to={link.path}>
                  {link.name}
                </NavLink>
              ))}
            </HStack>
          </HStack>
          <Flex alignItems="center">
            {Auth.loggedIn() ? (
              <Button
                as={RouterLink}
                href="/dashboard"
                colorScheme="blue"
                size="sm"
              >
                Go to Dashboard
              </Button>
            ) : (
              <HStack spacing={4}>
                <Button
                  as={RouterLink}
                  href="/login"
                  variant="ghost"
                  size="sm"
                >
                  Login
                </Button>
                <Button
                  as={RouterLink}
                  href="/signup"
                  colorScheme="blue"
                  size="sm"
                >
                  Sign Up
                </Button>
              </HStack>
            )}
          </Flex>
        </Flex>

        <Collapse in={isOpen} animateOpacity>
          <Box
            pb={4}
            display={{ md: 'none' }}
          >
            <VStack as="nav" spacing={4}>
              {navLinks.map((link) => (
                <NavLink key={link.path} to={link.path}>
                  {link.name}
                </NavLink>
              ))}
              {Auth.loggedIn() ? (
                <Button
                  as={RouterLink}
                  href="/dashboard"
                  colorScheme="blue"
                  size="sm"
                  w="full"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    as={RouterLink}
                    href="/login"
                    variant="ghost"
                    size="sm"
                    w="full"
                  >
                    Login
                  </Button>
                  <Button
                    as={RouterLink}
                    href="/signup"
                    colorScheme="blue"
                    size="sm"
                    w="full"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </VStack>
          </Box>
        </Collapse>
      </Container>
    </Box>
  );
}
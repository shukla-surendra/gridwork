import React from 'react';
import {
  Box,
  VStack,
  IconButton,
  Tooltip,
  useColorModeValue,
  useColorMode,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  FiHome,
  FiCalendar,
  FiFileText,
  FiUsers,
  FiSettings,
  FiMoon,
  FiSun,
} from 'react-icons/fi';

const Sidebar = () => {
  const router = useRouter();
  const location = { pathname: router.pathname };
  const { colorMode, toggleColorMode } = useColorMode();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const menuItems = [
    { icon: FiHome, label: 'Home', path: '/' },
    { icon: FiCalendar, label: 'Tasks', path: '/tasks' },
    { icon: FiFileText, label: 'Notes', path: '/notes' },
    { icon: FiUsers, label: 'Team', path: '/team' },
    { icon: FiSettings, label: 'Settings', path: '/settings' },
  ];

  return (
    <Box
      as="nav"
      position="fixed"
      left={0}
      w="60px"
      h="100vh"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      py={4}
    >
      <VStack spacing={4}>
        {menuItems.map((item) => (
          <Tooltip key={item.path} label={item.label} placement="right">
            <Link href={item.path}>
              <IconButton
                icon={<item.icon />}
                variant={location.pathname === item.path ? 'solid' : 'ghost'}
                colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
                aria-label={item.label}
                size="lg"
                fontSize="20px"
              />
            </Link>
          </Tooltip>
        ))}
        <Box flex={1} />
        <Tooltip label={colorMode === 'light' ? 'Dark Mode' : 'Light Mode'} placement="right">
          <IconButton
            icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
            onClick={toggleColorMode}
            variant="ghost"
            aria-label="Toggle color mode"
            size="lg"
            fontSize="20px"
          />
        </Tooltip>
      </VStack>
    </Box>
  );
};

export default Sidebar; 
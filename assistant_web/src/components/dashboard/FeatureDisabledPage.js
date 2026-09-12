import React, { useState } from 'react';
import { Box, Center, VStack, Icon, Heading, Text, Button } from '@chakra-ui/react';
import { FiSlash } from 'react-icons/fi';
import RouterLink from 'next/link';
import Navbar from './Navbar';
import Header from './Header';

// Shown in place of a page's real content when its module has been
// switched off in Settings > Modules -- Tasks/Boards/Calendar/Time
// Blocking are "nav-only" toggles (see modules/registry.py): the backend
// API stays reachable (Notes, Comments, Epics, Sprints, etc. all depend
// on Tasks/Boards existing), so this component is the only thing that
// actually enforces the toggle for these four -- it's not just cosmetic
// nav-hiding, it's what keeps a disabled page from rendering at all.
export default function FeatureDisabledPage({ featureName }) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  return (
    <Box minH="100vh">
      <Navbar isCollapsed={isMenuCollapsed} onToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Center minH="calc(100vh - 4rem)" p={6}>
          <VStack spacing={4} textAlign="center" maxW="sm">
            <Icon as={FiSlash} boxSize={10} color="gray.400" />
            <Heading size="md">{featureName} is disabled</Heading>
            <Text color="gray.500">
              A workspace owner turned this feature off. Ask them to re-enable it in Settings &gt; Modules.
            </Text>
            <Button as={RouterLink} href="/settings" colorScheme="teal" size="sm">
              Go to Settings
            </Button>
          </VStack>
        </Center>
      </Box>
    </Box>
  );
}

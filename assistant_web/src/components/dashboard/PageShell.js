import React, { useState } from 'react';
import { Box, Flex, HStack, Text, Spinner, useColorModeValue } from '@chakra-ui/react';
import Head from 'next/head';
import Navbar from './Navbar';
import Header from './Header';

// Sidebar + header + a title bar with actions on the right: the frame
// every dashboard screen draws.
export default function PageShell({ title, icon: TitleIcon, actions, loading, children }) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Box minH="100vh" bg={bgColor}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease" minH="100vh">
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box p={{ base: 3, md: 4, lg: 5 }}>
            <Flex
              justify="space-between"
              align={{ base: 'stretch', lg: 'center' }}
              direction={{ base: 'column', lg: 'row' }}
              gap={3}
              bg={cardBg}
              p={4}
              mb={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack spacing={3}>
                {TitleIcon && <TitleIcon size={22} />}
                <Text fontSize="xl" fontWeight="bold">{title}</Text>
                {loading && <Spinner size="sm" />}
              </HStack>
              {actions && <Flex gap={2} align="center" wrap="wrap">{actions}</Flex>}
            </Flex>
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
}

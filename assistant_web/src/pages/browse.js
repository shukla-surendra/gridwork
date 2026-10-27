import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Center, Spinner, VStack, Text, Button, Heading, useColorModeValue } from '@chakra-ui/react';
import TaskService from '@/services/taskservice';
import { issuePagePath } from '@/utils/issueLinks';

// /browse/KEY permalink: /browse?key=ENG-42 resolves the key and
// forwards to the page that owns the issue, which opens it.
export default function BrowseIssuePage() {
  const router = useRouter();
  const { key } = router.query;
  const [notFound, setNotFound] = useState(false);
  const pageBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    if (!router.isReady) return;
    if (!key) {
      setNotFound(true);
      return;
    }
    TaskService.getByKey(key)
      .then(res => router.replace(issuePagePath(res.data)))
      .catch(() => setNotFound(true));
  }, [router, router.isReady, key]);

  return (
    <Box minH="100vh" bg={pageBg}>
      <Center minH="100vh">
        {notFound ? (
          <VStack spacing={3}>
            <Heading size="md">{key ? `Issue ${key} not found` : 'No issue key given'}</Heading>
            <Text color="gray.500" fontSize="sm">It may have been deleted, or you may not have access to it.</Text>
            <Button colorScheme="teal" size="sm" onClick={() => router.push('/tasks')}>Go to tasks</Button>
          </VStack>
        ) : (
          <VStack spacing={3}>
            <Spinner />
            <Text color="gray.500" fontSize="sm">Opening {key}…</Text>
          </VStack>
        )}
      </Center>
    </Box>
  );
}

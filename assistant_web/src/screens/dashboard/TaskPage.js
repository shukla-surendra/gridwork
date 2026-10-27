import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box, Button, Center, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import IssueView from '../../components/issues/IssueView';

// An issue on its own page (/page-detail?task_id=...): the same view the
// board opens in a modal, with room to read long descriptions and threads.
const TaskPage = () => {
  const router = useRouter();
  const { task_id: taskId } = router.query;
  const [task, setTask] = useState(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // IssueView fetches the issue itself; seed it with just the id.
  const current = task?.task_id === taskId ? task : (taskId ? { task_id: taskId } : null);

  return (
    <>
      <Head>
        <title>{task?.ticket_key ? `${task.ticket_key} ${task.title || ''}` : 'Issue'}</title>
      </Head>
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box p={{ base: 3, md: 5 }}>
            {router.isReady && !taskId ? (
              <Center py={20}>
                <VStack>
                  <Text>No issue selected.</Text>
                  <Button size="sm" onClick={() => router.push('/tasks')}>Go to tasks</Button>
                </VStack>
              </Center>
            ) : current && (
              <Box bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" maxW="1280px" mx="auto">
                <IssueView
                  isPage
                  task={current}
                  setTask={(update) => setTask((prev) => (typeof update === 'function' ? update(prev?.task_id === taskId ? prev : current) : update))}
                  onDeleted={() => router.push('/tasks')}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default TaskPage;

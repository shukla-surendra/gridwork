import {
    Avatar,
    Icon,
    Drawer,
    DrawerContent,
    DrawerOverlay,
    useColorModeValue
  } from '@chakra-ui/react';
  // Here we have used react-icons package for the icons
  import { StatusIndicator } from '../../components/dashboard/StatusIndicator'
  import React, { useState, useEffect, useCallback } from "react";
  import { useDispatch, useSelector } from "react-redux";
  import { retrieveTasks } from "../../slices/tasks";
  import { Box, Flex, Grid, Stack, GridItem, Text, useDisclosure, Tbody, Table, Thead, Th, Tr, Td } from "@chakra-ui/react";
  import { AddIcon } from '@chakra-ui/icons';
  import Navbar from "../../components/dashboard/Navbar";
  import EditTaskDrawer from "../../components/dashboard/drawers/EditTaskDrawer";
  import NewTaskDrawer from "../../components/dashboard/drawers/NewTaskDrawer";
  import DeleteTaskNoteModal from "../../components/dashboard/modals/DeleteTaskNoteModal";
  import { IconButton } from '@chakra-ui/react';
  import Head from 'next/head';
  import { formatLocalDateTime } from "../../utils/locale"
  import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
  import TaskBoardViewBox from "../../components/dashboard/sections/TaskBoardViewBox";
  import Header from "../../components/dashboard/Header";
  
  
  export default function TaskDetailPage() {
    const menu_open = useDisclosure();
    const [currentTask, setCurrentTask] = useState({ task_id: "", title: "", descrtiption: "", status: "" });
    const delete_modal = useDisclosure()
    const edit_task_drawer = useDisclosure()
    const new_task_drawer = useDisclosure()
    const tasks = useSelector(state => state.tasks.tasks);
    const handleDeleteItem = (task) => {
      setCurrentTask(task);
      delete_modal.onOpen(true);
    };
  
    const handleAddItem = () => {
      new_task_drawer.onOpen();
    };
  
    const handleUpdateItem = (task) => {
      setCurrentTask(task);
      console.log(task, "editing")
      // update_modal.onOpen(true);
      edit_task_drawer.onOpen()
    };
  
    const priorityColorMapping = {
      'High': 'red',
      'Medium': 'yellow',
      'Low': 'green',
    };
  
    const dispatch = useDispatch();
  
    const initFetch = useCallback(() => {
      dispatch(retrieveTasks());
    }, [dispatch])
  
    useEffect(() => {
      initFetch()
    }, [initFetch])
    return (
      <>
        <Head>
          <title>Tasks</title>
          <meta name="description" content="App Description" />
          <meta name="theme-color" content="#008f68" />
        </Head>
        <EditTaskDrawer currentTask={currentTask} setCurrentTask={setCurrentTask} disclosures={edit_task_drawer}></EditTaskDrawer>
        <NewTaskDrawer currentTask={{}} disclosures={new_task_drawer}></NewTaskDrawer>
        <DeleteTaskNoteModal currentTask={currentTask} disclosures={delete_modal} />
  
        <Box as="section" bg={useColorModeValue('gray.50', 'gray.700')} minH="100vh">
          <Navbar display={{ base: 'none', md: 'unset' }} />
          <Drawer isOpen={menu_open.isOpen} onClose={menu_open.onClose} placement="left">
            <DrawerOverlay />
            <DrawerContent>
              <Navbar w="full" borderRight="none" />
            </DrawerContent>
          </Drawer>
          <Box ml={{ base: 0, md: 60 }} transition=".3s ease">
          <Header menu_open={menu_open}></Header>
  
            <Box as="main" p={3} minH="25rem" bg={useColorModeValue('auto', 'gray.800')}>
              {/* board view code */}
              <Flex direction={'column'} justifyContent="center">
                
                <Box>
                  <Stack bg="#FFFFFF" m={'5px'} p={'30px'} borderRadius="10px">
                    {/* board view code start*/}
                    <Flex justifyContent="left">
                      <Box>
  
                        <Flex>
  
                          <Tabs>
                            <TabList>
                              <Tab>Board View</Tab>
                              <Tab>Table View</Tab>
                              <Stack>
                  <IconButton
                    aria-label="Add Task"
                    icon={<AddIcon />}
                    size="sm"
                    onClick={() => handleAddItem({})}
                    variant="ghost"
                  />
  
                </Stack>
                            </TabList>
  
                            <TabPanels>
                              <TabPanel >
  
                                <Grid templateColumns="repeat(3, 1fr)" gap={6}>
                                  <GridItem>
  
                                    <Text as='b' fontSize={14} >Not Started</Text>
  
                                    <Box >
  
                                      {/* render todo tasks */}
                                      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
  
                                        {tasks.filter(task => task.status === 'todo').map((task, index) => (
                                          <GridItem key={index}>
                                            <TaskBoardViewBox task={task} handleDeleteItem={handleDeleteItem} handleUpdateItem={handleUpdateItem} priorityColorMapping={priorityColorMapping}></TaskBoardViewBox>
                                          </GridItem>))}
  
                                      </Grid>
                                    </Box>
                                  </GridItem>
  
  
                                  <GridItem>
                                    <Text as='b' fontSize={14}>In Progress</Text>
                                    <Box >
  
                                      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
  
                                        {tasks.filter(task => task.status === 'in_progress').map((task, index) => (
                                          <GridItem key={index}>
                                            <TaskBoardViewBox task={task} handleUpdateItem={handleUpdateItem} priorityColorMapping={priorityColorMapping}></TaskBoardViewBox>
                                          </GridItem>))}
  
                                      </Grid>
                                    </Box>
                                  </GridItem>
                                  <GridItem>
                                    <Text as='b' fontSize={14}>Done</Text>
                                    <Box >
                                      {/* render completed tasks */}
                                      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
  
                                        {tasks.filter(task => task.status === 'done').map((task, index) => (
                                          <GridItem key={index}>
                                            <TaskBoardViewBox task={task} handleUpdateItem={handleUpdateItem} priorityColorMapping={priorityColorMapping}></TaskBoardViewBox>
                                          </GridItem>))}
  
                                      </Grid>
                                    </Box>
                                  </GridItem>
  
                                </Grid>
  
                              </TabPanel>
                              <TabPanel>
  
  
  
                                <Grid templateColumns="repeat(1, 1fr)" gap={6}>
                                  <GridItem>
                                    <Box>
                                      {/* render todo tasks */}
                                      <Table variant="simple">
                                        <Thead>
                                          <Tr fontSize={'14px'} fontWeight={'bold'}>
                                            <Th>Title</Th>
                                            <Th>Due On</Th>
                                            <Th>Created At</Th>
                                            <Th>Status</Th>
  
                                          </Tr>
                                        </Thead>
                                        <Tbody>
                                          {tasks.map((task, index) => (
                                            <Tr  fontSize={'14px'}>
                                              <Td> <Text onClick={() => handleUpdateItem(task)}>{task.title} </Text></Td>
                                              <Td>
  
                                                {formatLocalDateTime(task.due_on)}
                                              </Td>
  
                                              <Td>{formatLocalDateTime(task.created_at)}</Td>
                                              <td><StatusIndicator status={task.status} /></td>
  
                                            </Tr>
  
                                          ))}
  
                                        </Tbody>
                                      </Table>
  
                                    </Box>
                                  </GridItem>
                                </Grid>
  
                              </TabPanel>
  
                            </TabPanels>
                          </Tabs>
  
                        </Flex>
  
                      </Box>
                    </Flex>
                    {/* board view code end*/}
                  </Stack>
                </Box>
              </Flex>
  
  
  
            </Box>
          </Box>
        </Box>
  
      </>
    );
  }
  
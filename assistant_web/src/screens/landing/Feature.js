import React from 'react';
import { Heading, Text, Stack } from '@chakra-ui/react';
import Navbar from "../../components/landing/Nav/Navbar"
import Footer from "../../components/landing/Footer";

const Feature = () => {
  return (<>
  <Navbar></Navbar>
    <Stack spacing={4} alignItems="center">
      <Heading as="h1" size="xl">
        About Our Product
      </Heading>
      <Text>
        Our product is designed to help you stay productive and organized by
        providing the following features:
      </Text>
      <Stack spacing={2} alignItems="flex-start">
        <Text fontWeight="bold">Todo:</Text>
        <Text>
          Create and manage tasks that need to be completed, and mark them as
          done when finished.
        </Text>
        <Text fontWeight="bold">Tasks:</Text>
        <Text>
          Organize your tasks into categories and set deadlines to keep yourself
          on track.
        </Text>
        <Text fontWeight="bold">Pomodoro:</Text>
        <Text>
          Use the Pomodoro technique to break your work into manageable intervals
          and increase productivity.
        </Text>
        <Text fontWeight="bold">Productivity:</Text>
        <Text>
          Track your productivity and see how much you've accomplished over time.
        </Text>
      </Stack>
    </Stack>
    <Footer></Footer>
    </>
  );
};

export default Feature;

import {
    Box,
    Button,
    Container,
    Heading,
    SimpleGrid,
    Stack,
    Text,
  } from "@chakra-ui/react";
import Navbar from "../../components/landing/Nav/Navbar"
import Footer from "../../components/landing/Footer";
  
  const Pricing= () => {
    return (
        <>
          <Navbar></Navbar>
      <Box py={16}>
        <Container maxW="container.lg">
          <Heading as="h1" size="xl" mb={8} textAlign="center">
            Choose Your Plan
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            <Stack
              bg="white"
              border="1px"
              borderColor="gray.200"
              borderRadius="lg"
              p={8}
              shadow="md"
            >
              <Text fontWeight="bold" fontSize="lg" mb={2}>
                Free
              </Text>
              <Text fontSize="2xl" fontWeight="bold" mb={8}>
                $0
              </Text>
              <Stack spacing={4}>
                <Text>10 tasks per day</Text>
                <Text>Basic Pomodoro timer</Text>
                <Text>No task categories</Text>
                <Text>No task deadlines</Text>
                <Text>No support</Text>
              </Stack>
              <Button colorScheme="blue" mt={8} isFullWidth>
                Get Started
              </Button>
            </Stack>
            <Stack
              bg="white"
              border="1px"
              borderColor="gray.200"
              borderRadius="lg"
              p={8}
              shadow="md"
            >
              <Text fontWeight="bold" fontSize="lg" mb={2}>
                Standard
              </Text>
              <Text fontSize="2xl" fontWeight="bold" mb={8}>
                $9.99/month
              </Text>
              <Stack spacing={4}>
                <Text>Unlimited tasks</Text>
                <Text>Full-featured Pomodoro timer</Text>
                <Text>Task categories</Text>
                <Text>Task deadlines</Text>
                <Text>Email support</Text>
              </Stack>
              <Button colorScheme="blue" mt={8} isFullWidth>
                Sign Up
              </Button>
            </Stack>
            <Stack
              bg="white"
              border="1px"
              borderColor="gray.200"
              borderRadius="lg"
              p={8}
              shadow="md"
            >
              <Text fontWeight="bold" fontSize="lg" mb={2}>
                Pro
              </Text>
              <Text fontSize="2xl" fontWeight="bold" mb={8}>
                $19.99/month
              </Text>
              <Stack spacing={4}>
                <Text>All Standard features</Text>
                <Text>Team collaboration</Text>
                <Text>Advanced analytics</Text>
                <Text>Priority support</Text>
              </Stack>
              <Button colorScheme="blue" mt={8} isFullWidth>
                Sign Up
              </Button>
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>
      <Footer></Footer>
      </>
    );
  };
  
  export default Pricing;
  
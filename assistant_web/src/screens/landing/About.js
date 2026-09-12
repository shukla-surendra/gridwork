import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Icon,
  VStack,
  HStack,
  useColorModeValue,
  Divider,
  Image
} from '@chakra-ui/react';
import { 
  FiTarget, 
  FiUsers, 
  FiShield, 
  FiTrendingUp,
  FiClock,
  FiCheckCircle
} from 'react-icons/fi';
import Navbar from "../../components/landing/Nav/Navbar";
import Footer from "../../components/landing/Footer";

const Feature = ({ icon, title, description }) => (
  <HStack align="start" spacing={4}>
    <Icon as={icon} boxSize={6} color="blue.500" />
    <VStack align="start" spacing={1}>
      <Text fontWeight="bold" fontSize="lg">{title}</Text>
      <Text color="gray.600">{description}</Text>
    </VStack>
  </HStack>
);

const About = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'white');

  return (
    <>
      <Navbar />
      <Box bg={useColorModeValue('gray.50', 'gray.900')} py={20}>
        <Container maxW="6xl">
          <VStack spacing={16} align="stretch">
            {/* Hero Section */}
            <VStack spacing={8} textAlign="center">
              <Heading
                as="h1"
                size="2xl"
                bgGradient="linear(to-r, blue.500, blue.300)"
                bgClip="text"
                fontWeight="extrabold"
              >
                About GridWork
              </Heading>
              <Text fontSize="xl" color={textColor} maxW="3xl">
                One workspace for wherever work happens -- in the office, at home, or anywhere in between
              </Text>
            </VStack>

            {/* Mission Section */}
            <Box bg={bgColor} p={8} borderRadius="xl" boxShadow="lg">
              <VStack spacing={6} align="start">
                <Heading size="lg" color={headingColor}>Our Mission</Heading>
                <Text fontSize="lg" color={textColor}>
                  At GridWork, we're dedicated to giving teams one workspace that follows them from
                  the local office to fully remote, and everywhere in between. Our mission is to
                  empower individuals and teams to achieve more by providing intelligent,
                  intuitive, and efficient tools that adapt to your workflow, wherever you work from.
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} w="full">
                  <Feature
                    icon={FiTarget}
                    title="Precision & Efficiency"
                    description="Delivering precise AI-powered solutions that enhance productivity and streamline workflows."
                  />
                  <Feature
                    icon={FiUsers}
                    title="User-Centric Design"
                    description="Creating intuitive interfaces that adapt to your needs, making complex tasks simple."
                  />
                  <Feature
                    icon={FiShield}
                    title="Security First"
                    description="Implementing enterprise-grade security to protect your data and privacy."
                  />
                  <Feature
                    icon={FiTrendingUp}
                    title="Continuous Innovation"
                    description="Constantly evolving our platform with cutting-edge AI technology and features."
                  />
                </SimpleGrid>
              </VStack>
            </Box>

            {/* Values Section */}
            <Box bg={bgColor} p={8} borderRadius="xl" boxShadow="lg">
              <VStack spacing={6} align="start">
                <Heading size="lg" color={headingColor}>Our Values</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} w="full">
                  <VStack spacing={4} align="start">
                    <Icon as={FiCheckCircle} boxSize={8} color="blue.500" />
                    <Heading size="md">Excellence</Heading>
                    <Text color={textColor}>
                      We strive for excellence in everything we do, from product development to customer support.
                    </Text>
                  </VStack>
                  <VStack spacing={4} align="start">
                    <Icon as={FiUsers} boxSize={8} color="blue.500" />
                    <Heading size="md">Collaboration</Heading>
                    <Text color={textColor}>
                      We believe in the power of teamwork and building strong relationships with our users.
                    </Text>
                  </VStack>
                  <VStack spacing={4} align="start">
                    <Icon as={FiClock} boxSize={8} color="blue.500" />
                    <Heading size="md">Innovation</Heading>
                    <Text color={textColor}>
                      We're committed to continuous innovation and staying ahead of technological advancements.
                    </Text>
                  </VStack>
                </SimpleGrid>
              </VStack>
            </Box>

            {/* Features Section */}
            <Box bg={bgColor} p={8} borderRadius="xl" boxShadow="lg">
              <VStack spacing={6} align="start">
                <Heading size="lg" color={headingColor}>Key Features</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} w="full">
                  <Box>
                    <Heading size="md" mb={4}>AI-Powered Assistance</Heading>
                    <Text color={textColor}>
                      Our intelligent assistant helps you manage tasks, organize notes, and optimize your workflow 
                      using advanced natural language processing and machine learning.
                    </Text>
                  </Box>
                  <Box>
                    <Heading size="md" mb={4}>Seamless Integration</Heading>
                    <Text color={textColor}>
                      Connect with your favorite tools and services to create a unified productivity ecosystem 
                      that works the way you do.
                    </Text>
                  </Box>
                  <Box>
                    <Heading size="md" mb={4}>Smart Analytics</Heading>
                    <Text color={textColor}>
                      Gain valuable insights into your productivity patterns and receive personalized 
                      recommendations for improvement.
                    </Text>
                  </Box>
                  <Box>
                    <Heading size="md" mb={4}>Team Collaboration</Heading>
                    <Text color={textColor}>
                      Work seamlessly with your team through shared workspaces, real-time updates, 
                      and collaborative features.
                    </Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default About;

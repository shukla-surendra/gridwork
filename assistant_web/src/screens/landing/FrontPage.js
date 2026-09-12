import React from "react";
import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Text,
  Button,
  Image,
  List,
  ListItem,
  Flex,
  useColorModeValue,
  VStack,
  HStack,
  Icon,
  SimpleGrid,
  Badge,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FaPlayCircle, FaCheck, FaRocket, FaChartLine, FaUsers, FaClock } from 'react-icons/fa';
import { motion } from 'framer-motion';
import appData from '../../config.json';

const MotionBox = motion(Box);

export default function FrontPage() {
  const bgColor = useColorModeValue('white', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.300');
  const accentColor = useColorModeValue('brand.500', 'brand.300');
  const isMobile = useBreakpointValue({ base: true, md: false });
  const featureCardBg = useColorModeValue('white', 'gray.800');
  const featureCardBorder = useColorModeValue('gray.200', 'gray.700');

  const stats = [
    { label: 'Active Users', value: '10K+' },
    { label: 'Tasks Completed', value: '1M+' },
    { label: 'Productivity Boost', value: '40%' },
  ];

  const features = [
    {
      icon: FaRocket,
      title: 'Lightning Fast',
      description: 'Quick access to all your tasks and notes'
    },
    {
      icon: FaChartLine,
      title: 'Smart Analytics',
      description: 'Track your productivity with detailed insights'
    },
    {
      icon: FaUsers,
      title: 'Team Collaboration',
      description: 'Work together seamlessly with your team'
    },
    {
      icon: FaClock,
      title: 'Time Management',
      description: 'Optimize your schedule for maximum efficiency'
    }
  ];

  const FeatureCard = ({ icon, title, description, index }) => (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      <Box
        p={8}
        bg={featureCardBg}
        borderRadius="2xl"
        borderWidth="1px"
        borderColor={featureCardBorder}
        transition="all 0.3s"
        _hover={{
          transform: 'translateY(-8px)',
          boxShadow: 'xl',
        }}
      >
        <VStack spacing={4} align="start">
          <Icon as={icon} w={8} h={8} color={accentColor} />
          <Heading size="md">{title}</Heading>
          <Text color={secondaryTextColor}>{description}</Text>
        </VStack>
      </Box>
    </MotionBox>
  );

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        as="section" 
        position="relative"
        minH="100vh"
        bg={bgColor}
        overflow="hidden"
      >
        <Container maxW="container.xl" position="relative" zIndex={1}>
          <Grid 
            templateColumns={{ base: '1fr', md: '1fr 1fr' }} 
            gap={12} 
            alignItems="center"
            minH="100vh"
            py={20}
          >
            <GridItem>
              <VStack spacing={8} align="start">
                <Badge 
                  colorScheme="brand" 
                  px={4} 
                  py={1} 
                  borderRadius="full"
                  fontSize="sm"
                >
                  New Release
                </Badge>
                <Heading
                  as="h1"
                  size="4xl"
                  fontWeight="bold"
                  lineHeight="1.1"
                >
                  Transform Your <br />
                  <Text as="span" color={accentColor}>Productivity</Text>
                </Heading>
                <Text fontSize="2xl" color={secondaryTextColor} maxW="2xl">
                  The all-in-one workspace for your tasks, notes, and team collaboration.
                  Designed for speed and efficiency.
                </Text>
                <HStack spacing={6} pt={4}>
                  <Button
                    colorScheme="brand"
                    size="lg"
                    px={8}
                    h={14}
                    fontSize="lg"
                    borderRadius="full"
                  >
                    Get Started Free
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    px={8}
                    h={14}
                    fontSize="lg"
                    borderRadius="full"
                    leftIcon={<FaPlayCircle />}
                  >
                    Watch Demo
                  </Button>
                </HStack>
              </VStack>
            </GridItem>
            <GridItem display={{ base: 'none', md: 'block' }}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Box
                  position="relative"
                  borderRadius="3xl"
                  overflow="hidden"
                  boxShadow="2xl"
                >
                  <Image
                    src="/img/banner.png"
                    alt="Dashboard Preview"
                    w="full"
                    objectFit="cover"
                  />
                </Box>
              </MotionBox>
            </GridItem>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box as="section" py={20} bg={useColorModeValue('gray.50', 'gray.800')}>
        <Container maxW="container.xl">
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {stats.map((stat, index) => (
              <Box
                key={index}
                p={8}
                bg={bgColor}
                borderRadius="2xl"
                textAlign="center"
                boxShadow="lg"
              >
                <Text fontSize="4xl" fontWeight="bold" color={accentColor}>
                  {stat.value}
                </Text>
                <Text fontSize="lg" color={secondaryTextColor}>
                  {stat.label}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box as="section" py={20} bg={bgColor}>
        <Container maxW="container.xl">
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center" maxW="3xl" mx="auto">
              <Badge colorScheme="brand" px={4} py={1} borderRadius="full">
                Features
              </Badge>
              <Heading size="2xl">Everything you need to succeed</Heading>
              <Text fontSize="xl" color={secondaryTextColor}>
                Powerful tools designed to help you work smarter, not harder
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8} w="full">
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  index={index}
                />
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box 
        as="section" 
        py={20} 
        bg={useColorModeValue('gray.50', 'gray.800')}
        position="relative"
        overflow="hidden"
      >
        <Container maxW="container.xl" position="relative" zIndex={1}>
          <VStack spacing={8} textAlign="center" maxW="3xl" mx="auto">
            <Badge colorScheme="brand" px={4} py={1} borderRadius="full">
              Ready to Start?
            </Badge>
            <Heading size="2xl">Join thousands of productive teams</Heading>
            <Text fontSize="xl" color={secondaryTextColor}>
              Start your journey to better productivity today
            </Text>
            <Button
              colorScheme="brand"
              size="lg"
              px={8}
              h={14}
              fontSize="lg"
              borderRadius="full"
            >
              Get Started for Free
            </Button>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}
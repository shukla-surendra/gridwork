import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Icon,
  Heading,
  Text,
  Badge,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
  Center,
} from '@chakra-ui/react';
import { FiCheckCircle } from 'react-icons/fi';

// Shared shell for a real, navigable route whose backend isn't wired up yet
// (see docs/PRODUCT_ROADMAP.md) -- sets the page's visual/IA shape now so
// building the real feature later is a data-wiring task, not a UI-design one.
export default function ComingSoon({ icon, title, description, features = [], accentColor = 'blue.500' }) {
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const iconBg = useColorModeValue('gray.50', 'gray.900');

  return (
    <Center minH="calc(100vh - 8rem)">
      <VStack
        spacing={6}
        maxW="480px"
        bg={cardBg}
        borderRadius="xl"
        boxShadow="md"
        p={10}
        textAlign="center"
      >
        <Box p={4} borderRadius="full" bg={iconBg}>
          <Icon as={icon} boxSize={10} color={accentColor} />
        </Box>

        <VStack spacing={2}>
          <HStack>
            <Heading size="lg">{title}</Heading>
            <Badge colorScheme="purple" borderRadius="full" px={2}>Coming soon</Badge>
          </HStack>
          <Text color={textColor}>{description}</Text>
        </VStack>

        {features.length > 0 && (
          <List spacing={2} textAlign="left" w="100%">
            {features.map((feature) => (
              <ListItem key={feature} color={textColor}>
                <ListIcon as={FiCheckCircle} color={accentColor} />
                {feature}
              </ListItem>
            ))}
          </List>
        )}
      </VStack>
    </Center>
  );
}

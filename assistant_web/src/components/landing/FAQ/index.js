import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import appData from '../../../config.json';

const FAQ = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'white');
  const accordionBg = useColorModeValue('gray.50', 'gray.700');
  const accordionHoverBg = useColorModeValue('gray.100', 'gray.600');

  const faqItems = [
    {
      question: "What if I had multiple members I want to add to my workspace?",
      answer: "No worries even if you have multiple members to add. Just copy the link from User settings and share, or you could add them with their email id."
    },
    {
      question: "Can I use Google account to create an account?",
      answer: "Yes, you can use your Google account to sign up and log in to our platform. This provides a quick and secure way to access our services."
    },
    {
      question: "How secure is my data?",
      answer: "We take security seriously. All your data is encrypted and stored securely. We use industry-standard security practices to protect your information."
    },
    {
      question: "Can I export my data?",
      answer: "Yes, you can export your tasks, notes, and other data at any time. We provide multiple export formats for your convenience."
    }
  ];

  return (
    <Box as="section" py={20} bg={bgColor}>
      <Container maxW="container.xl">
        <VStack spacing={12} align="stretch">
          <VStack spacing={4} textAlign="center">
            <Heading
              as="h2"
              size="2xl"
              color={headingColor}
              fontWeight="bold"
            >
              Frequently Asked Questions
            </Heading>
            <Text fontSize="lg" color={textColor}>
              Can't find the answer you're looking for? Reach out to our{' '}
              <Text as="a" href={`mailto:${appData.support_email}`} color="blue.500">
                support team
              </Text>
            </Text>
          </VStack>

          <Accordion allowMultiple>
            {faqItems.map((item, index) => (
              <AccordionItem key={index} border="none" mb={4}>
                <AccordionButton
                  p={4}
                  bg={accordionBg}
                  borderRadius="lg"
                  _hover={{ bg: accordionHoverBg }}
                >
                  <Box flex="1" textAlign="left" fontWeight="medium">
                    {item.question}
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4} color={textColor}>
                  {item.answer}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </VStack>
      </Container>
    </Box>
  );
};

export default FAQ;
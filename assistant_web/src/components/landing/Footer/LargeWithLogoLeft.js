import {
  Box,
  Container,
  Stack,
  SimpleGrid,
  Text,
  Link,
  useColorModeValue,
  Heading,
  Image,
  Icon,
} from '@chakra-ui/react';
import { FaTwitter, FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';
import appData from '../../../config.json';

const ListHeader = ({ children }) => {
  return (
    <Text fontWeight="bold" fontSize="lg" mb={2}>
      {children}
    </Text>
  );
};

const SocialButton = ({ icon, href }) => {
  return (
    <Link
      href={href}
      isExternal
      p={2}
      color={useColorModeValue('gray.600', 'gray.300')}
      _hover={{ color: 'blue.500' }}
    >
      <Icon as={icon} w={5} h={5} />
    </Link>
  );
};

const Footer = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.600', 'gray.300');

  return (
    <Box bg={bgColor} color={textColor}>
      <Container as={Stack} maxW="container.xl" py={10}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={8}>
          <Stack align="flex-start">
            <ListHeader>Product</ListHeader>
            <Link href="#">Features</Link>
            <Link href="#">Pricing</Link>
            <Link href="#">Integrations</Link>
            <Link href="#">Updates</Link>
          </Stack>

          <Stack align="flex-start">
            <ListHeader>Get Started</ListHeader>
            <Link href="#">Documentation</Link>
            <Link href="#">Tutorials</Link>
            <Link href="#">Resources</Link>
            <Link href="#">Community</Link>
          </Stack>

          <Stack align="flex-start">
            <ListHeader>Solutions</ListHeader>
            <Link href="#">For Teams</Link>
            <Link href="#">For Enterprise</Link>
            <Link href="#">For Education</Link>
            <Link href="#">For Startups</Link>
          </Stack>

          <Stack align="flex-start">
            <ListHeader>Resource</ListHeader>
            <Link href="#">Blog</Link>
            <Link href="#">Help Center</Link>
            <Link href="#">Contact Us</Link>
            <Link href="#">Status</Link>
          </Stack>
        </SimpleGrid>
      </Container>

      <Box py={10}>
        <Container maxW="container.xl">
          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing={4}
            justify="space-between"
            align={{ base: 'center', md: 'center' }}
          >
            <Stack direction="row" spacing={6}>
              <Image
                src={appData.logo}
                alt="Logo"
                height="40px"
                objectFit="contain"
              />
              <Stack spacing={1}>
                <Heading size="sm">{appData.office_address}</Heading>
                <Text fontSize="sm">{appData.support_email}</Text>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={6}>
              <SocialButton icon={FaTwitter} href="#" />
              <SocialButton icon={FaFacebook} href="#" />
              <SocialButton icon={FaInstagram} href="#" />
              <SocialButton icon={FaLinkedin} href="#" />
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Box py={4} borderTop="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
        <Container maxW="container.xl">
          <Text textAlign="center" fontSize="sm">
            © {new Date().getFullYear()} {appData.app_name}. All rights reserved.
          </Text>
        </Container>
      </Box>
    </Box>
  );
};

export default Footer;
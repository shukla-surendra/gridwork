import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  InputLeftElement,
  VStack,
  Heading,
  Text,
  useColorModeValue,
  Container,
  Flex,
  Image,
  Icon,
  Divider,
  useToast,
  Checkbox,
  Link,
  HStack,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiArrowLeft
} from 'react-icons/fi';
import {
  FaGoogle,
  FaGithub,
  FaTwitter
} from 'react-icons/fa';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { login, tryDemo } from '@/slices/auth';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const toast = useToast();
  const router = useRouter();
  const dispatch = useDispatch();

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleTryDemo = async () => {
    setIsDemoLoading(true);
    try {
      await dispatch(tryDemo()).unwrap();
      // auth.login() (called inside the tryDemo thunk) does a hard
      // window.location redirect to '/' on success -- nothing else to do
      // here on the happy path, this component is about to unmount.
    } catch (error) {
      toast({
        title: "Couldn't start demo",
        description: typeof error === 'string' ? error : 'Please try again',
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setIsDemoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await dispatch(login(formData)).unwrap();

      toast({
        title: "Login Successful",
        description: "Welcome back!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      router.push('/dashboard');
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - GridWork</title>
        <meta name="description" content="Login to your GridWork account" />
      </Head>

      <Flex minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
        {/* Left side - Login Form */}
        <Container maxW="container.md" py={8}>
          <Box
            bg={bg}
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <VStack spacing={6} align="stretch">
              {/* Back Button */}
              <Box>
                <Tooltip label="Go back to home">
                  <Link as={NextLink} href="/" display="inline-flex" alignItems="center" color="blue.500">
                    <Icon as={FiArrowLeft} mr={2} />
                    Back to Home
                  </Link>
                </Tooltip>
              </Box>

              {/* Header */}
              <Box textAlign="center">
                <Heading size="xl" mb={2}>Welcome Back</Heading>
                <Text color="gray.500">Sign in to continue to your account</Text>
              </Box>

              {/* Social Login Buttons */}
              <HStack spacing={4} justify="center">
                <Tooltip label="Sign in with Google">
                  <IconButton
                    icon={<FaGoogle />}
                    aria-label="Google login"
                    variant="outline"
                    size="lg"
                    isRound
                  />
                </Tooltip>
                <Tooltip label="Sign in with GitHub">
                  <IconButton
                    icon={<FaGithub />}
                    aria-label="GitHub login"
                    variant="outline"
                    size="lg"
                    isRound
                  />
                </Tooltip>
                <Tooltip label="Sign in with Twitter">
                  <IconButton
                    icon={<FaTwitter />}
                    aria-label="Twitter login"
                    variant="outline"
                    size="lg"
                    isRound
                  />
                </Tooltip>
              </HStack>

              <Divider />

              {/* Login Form */}
              <form onSubmit={handleSubmit}>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <Icon as={FiMail} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        size="lg"
                      />
                    </InputGroup>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <Icon as={FiLock} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        size="lg"
                      />
                      <InputRightElement>
                        <IconButton
                          variant="ghost"
                          icon={showPassword ? <FiEyeOff /> : <FiEye />}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <Flex justify="space-between" w="full">
                    <Checkbox
                      isChecked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    >
                      Remember me
                    </Checkbox>
                    <Link color="blue.500" href="#">
                      Forgot password?
                    </Link>
                  </Flex>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    w="full"
                    isLoading={isLoading}
                    loadingText="Signing in..."
                  >
                    Sign In
                  </Button>
                </VStack>
              </form>

              <Button
                variant="outline"
                colorScheme="blue"
                size="lg"
                w="full"
                onClick={handleTryDemo}
                isLoading={isDemoLoading}
                loadingText="Setting up your demo..."
              >
                Try Demo
              </Button>
              <Text fontSize="sm" color="gray.500" textAlign="center" mt={-2}>
                No signup needed — creates a fresh account pre-filled with sample tasks, contacts, and deals
              </Text>

              {/* Sign Up Link */}
              <Text textAlign="center" mt={4}>
                Don&apos;t have an account?{' '}
                <Link as={NextLink} href="/signup" color="blue.500" fontWeight="medium">
                  Sign up
                </Link>
              </Text>
            </VStack>
          </Box>
        </Container>

        {/* Right side - Image/Illustration */}
        <Box
          display={{ base: 'none', lg: 'block' }}
          flex="1"
          bg="blue.500"
          position="relative"
          overflow="hidden"
        >
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1))"
          />
          <Flex
            direction="column"
            justify="center"
            align="center"
            h="full"
            p={8}
            color="white"
          >
            <Image
              src="/img/login-img.png"
              alt="Login Illustration"
              maxW="400px"
              mb={8}
            />
            <Heading size="xl" mb={4}>GridWork</Heading>
            <Text fontSize="lg" textAlign="center" maxW="md">
              Your all-in-one productivity platform for managing tasks, notes, and projects efficiently.
            </Text>
          </Flex>
        </Box>
      </Flex>
    </>
  );
}

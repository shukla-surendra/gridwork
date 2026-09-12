import {
    Flex,
    Box,
    FormControl,
    FormLabel,
    Input,
    InputGroup,
    HStack,
    InputRightElement,
    InputLeftElement,
    Stack,
    Button,
    Image,
    Text,
    useColorModeValue,
    Heading,
    Divider,
    Icon,
    useToast,
    Link as ChakraLink,
    Center,
    IconButton,
    Tooltip
  } from '@chakra-ui/react';

import { FaGoogle, FaGithub, FaTwitter } from 'react-icons/fa';
import { useDispatch } from "react-redux";
import { useState } from 'react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { signupUser } from '../../../slices/users'
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
  
export default function SignupCard() {
    const [showPassword, setShowPassword] = useState(false);
    const [formState, setFormState] = useState({ first_name: '', last_name: '', email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const dispatch = useDispatch();
    const router = useRouter();
  const navigate = (path) => router.push(path);
    const toast = useToast();

    const handleChange = event => {
      const { name, value } = event.target;
      setFormState({...formState, [name]: value});
    };

    const handleSubmit = async event => {
      event.preventDefault();
      setIsLoading(true);
      
      try {
        await dispatch(signupUser(formState)).unwrap();
        toast({
          title: 'Account created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate('/login');
      } catch (error) {
        toast({
          title: 'Signup failed',
          description: error || 'Please try again',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <Flex
      minH={'100vh'}
      align={'center'}
      justify={'center'}
      bg={useColorModeValue('gray.50', 'gray.800')}
      color='#666666'>
      <Stack spacing={8} mx={'auto'} maxW={'lg'} py={12} px={6}>
        <Stack align={'center'}>
          <Link href={'/'}>
            <Image
              src={process.env.PUBLIC_URL + '/big_logo.png'}
              alt="Logo"
              h="12"
              mb={4}
            />
          </Link>
          <Heading fontSize={'2xl'} textAlign={'center'}>
            Create your account
          </Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            to start organizing your tasks effectively
          </Text>
        </Stack>
        <Box
          rounded={'lg'}
          bg={useColorModeValue('white', 'gray.700')}
          boxShadow={'lg'}
          p={8}
        >
          <Stack spacing={4}>
            {/* Social Login Buttons */}
            <HStack spacing={4} justify="center">
              <Tooltip label="Sign up with Google">
                <IconButton
                  icon={<FaGoogle />}
                  aria-label="Google signup"
                  variant="outline"
                  size="lg"
                  isRound
                />
              </Tooltip>
              <Tooltip label="Sign up with GitHub">
                <IconButton
                  icon={<FaGithub />}
                  aria-label="GitHub signup"
                  variant="outline"
                  size="lg"
                  isRound
                />
              </Tooltip>
              <Tooltip label="Sign up with Twitter">
                <IconButton
                  icon={<FaTwitter />}
                  aria-label="Twitter signup"
                  variant="outline"
                  size="lg"
                  isRound
                />
              </Tooltip>
            </HStack>

            <Flex align="center" my={6}>
              <Divider flex="1" />
              <Text mx={4} color="gray.500" fontSize="sm">OR</Text>
              <Divider flex="1" />
            </Flex>

            <form onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <HStack>
                  <Box>
                    <FormControl id="firstName" isRequired>
                      <FormLabel>First Name</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <Icon as={FiUser} color="gray.400" />
                        </InputLeftElement>
                        <Input 
                          type="text" 
                          name="first_name" 
                          value={formState.first_name} 
                          onChange={handleChange}
                          placeholder="John"
                        />
                      </InputGroup>
                    </FormControl>
                  </Box>
                  <Box>
                    <FormControl id="lastName">
                      <FormLabel>Last Name</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <Icon as={FiUser} color="gray.400" />
                        </InputLeftElement>
                        <Input 
                          type="text"
                          name="last_name" 
                          value={formState.last_name} 
                          onChange={handleChange}
                          placeholder="Doe"
                        />
                      </InputGroup>
                    </FormControl>
                  </Box>
                </HStack>
                <FormControl id="email" isRequired>
                  <FormLabel>Email address</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiMail} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="email"
                      name="email" 
                      value={formState.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                    />
                  </InputGroup>
                </FormControl>
                <FormControl id="password" isRequired>
                  <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiLock} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formState.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                    />
                    <InputRightElement h={'full'}>
                      <Button
                        variant={'ghost'}
                        onClick={() => setShowPassword((showPassword) => !showPassword)}
                      >
                        {showPassword ? <ViewIcon /> : <ViewOffIcon />}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <Stack spacing={10} pt={2}>
                  <Button
                    type="submit"
                    loadingText="Creating account..."
                    size="lg"
                    bg={'blue.400'}
                    color={'white'}
                    _hover={{
                      bg: 'blue.500',
                    }}
                    isLoading={isLoading}
                  >
                    Sign up
                  </Button>
                </Stack>
                <Stack pt={6}>
                  <Text align={'center'}>
                    Already a user?{' '}
                    <ChakraLink as={Link} href="/login" color={'blue.400'}>
                      Login
                    </ChakraLink>
                  </Text>
                </Stack>
              </Stack>
            </form>
          </Stack>
        </Box>
      </Stack>
    </Flex>
    );
  }
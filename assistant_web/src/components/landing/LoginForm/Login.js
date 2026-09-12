import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Stack,
  useToast,
  Button,
  Heading,
  Text,
  Icon,
  Image,
} from '@chakra-ui/react';
import { FaGoogle, FaLinkedin, FaGithub } from 'react-icons/fa';
import { userLogin } from '../../../slices/users'
import Auth from '../../../utils/auth'
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';


export default function LoginForm() {

  const buttonStyle = {
    backgroundColor: 'white',
    border: '1px solid gray',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    marginBottom: '10px',
  };

  const iconStyle = {
    marginRight: '10px',
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const toast = useToast();
  const [showSecondStep, setShowSecondStep] = useState(false);
 
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!showSecondStep) {
      // First step validation
      if (!email) {
        toast({
          title: 'Please fill in all fields',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // If first step is valid, show second step
      setShowSecondStep(true);
    } else {
      // Second step validation
      if (!password) {
        toast({
          title: 'Please enter your password',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // If second step is valid, submit form
      console.log(`Submitting login form with email ${email} and password ${password}`);
      const loginPayload = { email, password };
    console.log("login payload", loginPayload)
    dispatch(userLogin(loginPayload))
      .unwrap()
      .then(data => {
        console.log(data);
        toast({
          title: 'Login Successful',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        Auth.login(data);
      }).catch(e => {
        console.error(e);
        toast({
          title: 'Login Failed',
          description: e.message || 'Unable to login. Please try again.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      });
    }
    
  }

  const responseMessage = (response) => {
    console.log(response);
};
const errorMessage = (error) => {
    console.log(error);
};
  return (
    <div className="row">
      <Box className="col-md-5">
        <Text textAlign={'center'}>
          Smart calendar to remind you of your
          task anywhere, everywhere!
        </Text>
        <Image src={process.env.PUBLIC_URL + '/assets/calender_feature.png'} alt='Dan Abramov' />
      </Box>
      <Stack className="col-md-7" spacing={8} mx={'auto'} bg={'#FFF'} maxW={'lg'} py={12} px={6}>
        <Stack align={'center'}>
          <Box alignContent={'center'}>
          <Link href={'/'}>
            <Image
              src={process.env.PUBLIC_URL + '/big_logo.png'}
              className="h-12 w-auto"
              alt="reply"
            />
            </Link>
          </Box>
          <Text
            className="font-normal font-segoeui text-black_900 text-left w-auto"
            variant="body4"
          >
            Keep you Up-to date
          </Text>
<Flex direction="column" flexWrap="wrap" alignItems="center">


        <GoogleLogin onSuccess={responseMessage} onError={errorMessage} />

    </Flex>
        </Stack>
        <Box rounded={'lg'} boxShadow={'lg'} p={8}>
      <form onSubmit={handleSubmit}>
        {!showSecondStep ? (
          <Stack spacing={4}>
            <FormControl id="email">
              <FormLabel>Email address</FormLabel>
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </FormControl>
            <Stack spacing={10}>
              <Button
                type="submit"
                bg="#146CA4"
                color={'white'}
                _hover={{
                  bg: 'blue.500',
                }}>
                Continue
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={4}>
            <FormControl id="password">
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </FormControl>
            <Stack spacing={10}>
              <Stack
                direction={{ base: 'column', sm: 'row' }}
                align={'start'}
                justify={'space-between'}>
                <Checkbox>Remember me</Checkbox>
                <Link color="#146CA4">Forgot password?</Link>
              </Stack>
              <Button
                type="submit"
                bg="#146CA4"
                color={'white'}
                _hover={{
                  bg: 'blue.500',
                }}>
                Sign in
              </Button>
              <Button variant="link" onClick={() => setShowSecondStep(false)}>
                Back
              </Button>
            </Stack>
          </Stack>
        )}
      </form>
    </Box>
      </Stack>
    </div>
  );
}
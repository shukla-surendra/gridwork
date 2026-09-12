import {
    Flex,
    Container,
    Heading,
    Stack,
    Text,
    Button,
    Icon
  } from '@chakra-ui/react';
  
  export default function HeroIllustration() {
    return (
      <Container maxW={'5xl'}>
        <Stack
          textAlign={'center'}
          align={'center'}
          spacing={{ base: 8, md: 10 }}
          py={{ base: 20, md: 28 }}>
          <Heading
            fontWeight={600}
            fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
            lineHeight={'110%'}>
            Get things done and {' '}
            <Text as={'span'} color={'#146CA4'}>
            stay focused
            </Text>
          </Heading>
          <Text color={'gray.500'} maxW={'3xl'}>
          Our productivity app is designed to help you stay organized and focused, so you can get more done in less time. With features like a to-do list, notes, and a pomodoro timer, our app makes it easy to prioritize tasks, capture ideas, and stay on track throughout the day.
          </Text>
          <Stack spacing={6} direction={'row'}>
            <Button
              rounded={'full'}
              px={6}
              colorScheme={'orange'}
              bg={'#146CA4'}
              _hover={{ bg: 'blue.500' }}>
              Get started
            </Button>
            <Button rounded={'full'} px={6}>
              Learn more
            </Button>
          </Stack>
         
        </Stack>
      </Container>
    );
  }
  
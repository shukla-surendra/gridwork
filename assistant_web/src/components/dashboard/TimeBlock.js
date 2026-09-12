import React, { useState, useEffect } from 'react';
import { Box, Flex, Text, useColorModeValue, Progress } from '@chakra-ui/react';

const TimeBlock = ({ startTime, endTime, description }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Color mode values
  const timeCircleBg = useColorModeValue('blue.50', 'blue.900');
  const timeCircleText = useColorModeValue('blue.600', 'blue.300');
  const textColor = useColorModeValue('gray.900', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const progressBg = useColorModeValue('gray.100', 'gray.700');
  const progressBarColor = useColorModeValue('blue.500', 'blue.400');

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const totalMinutes = (endTime - startTime) / 1000 / 60;
  const elapsedMinutes = (currentTime - startTime) / 1000 / 60;
  const progress = Math.min((elapsedMinutes / totalMinutes) * 100, 100);

  return (
    <Flex alignItems="center" position="relative" width="100%">
      <Box
        height="48px"
        width="48px"
        borderRadius="xl"
        backgroundColor={timeCircleBg}
        display="flex"
        alignItems="center"
        justifyContent="center"
        marginRight="4"
        boxShadow="sm"
      >
        <Text fontWeight="bold" fontSize="md" color={timeCircleText}>
          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Box>
      <Box flexGrow={1} position="relative">
        <Text fontWeight="bold" fontSize="lg" color={textColor} mb={1}>
          {description}
        </Text>
        <Text color={subTextColor} fontSize="sm" mb={2}>
          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Progress 
          value={progress} 
          size="sm" 
          colorScheme="blue"
          bg={progressBg}
          borderRadius="full"
          hasStripe
          isAnimated
        />
      </Box>
    </Flex>
  );
};

export default TimeBlock;

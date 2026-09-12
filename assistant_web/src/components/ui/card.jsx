import { Box } from '@chakra-ui/react';

export function Card({ children, ...props }) {
  return (
    <Box
      bg="white"
      boxShadow="xl"
      borderRadius="2xl"
      p={6}
      {...props}
    >
      {children}
    </Box>
  );
}

export function CardContent({ children, ...props }) {
  return (
    <Box {...props}>
      {children}
    </Box>
  );
}
  
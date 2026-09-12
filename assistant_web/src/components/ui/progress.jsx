import { Progress as ChakraProgress } from '@chakra-ui/react';

export function Progress({ value, ...props }) {
  return (
    <ChakraProgress
      value={value}
      size="sm"
      colorScheme="green"
      borderRadius="full"
      {...props}
    />
  );
}
  
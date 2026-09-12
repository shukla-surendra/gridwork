import { Button as ChakraButton } from '@chakra-ui/react';

export function Button({ children, variant = "default", ...props }) {
  const variants = {
    default: {
      colorScheme: 'blue',
    },
    secondary: {
      colorScheme: 'gray',
    },
    success: {
      colorScheme: 'green',
    },
    danger: {
      colorScheme: 'red',
    },
    outline: {
      variant: 'outline',
      colorScheme: 'gray',
    },
  };

  return (
    <ChakraButton
      borderRadius="2xl"
      fontWeight="medium"
      boxShadow="md"
      transition="all 0.2s"
      {...variants[variant]}
      {...props}
    >
      {children}
    </ChakraButton>
  );
}

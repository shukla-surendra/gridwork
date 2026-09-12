import { Box, Heading, Text } from '@chakra-ui/react';

const BlogPost = ({ title, content, date, author }) => {
  return (
    <Box p={4} shadow="md" borderWidth="1px">
      <Heading fontSize="xl">{title}</Heading>
      <Text mt={2} fontSize="sm" color="gray.500">
        {date} by {author}
      </Text>
      <Text mt={4}>{content}</Text>
    </Box>
  );
};

export default BlogPost;

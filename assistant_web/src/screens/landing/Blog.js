import { Box, Container, Stack } from '@chakra-ui/react';
import BlogPost from './BlogPost';
import Navbar from "../../components/landing/Nav/Navbar"
import Footer from "../../components/landing/Footer";

const Blog = () => {
  const posts = [
    {
      id: 1,
      title: 'The Power of Pomodoro Technique for Boosting Productivity',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
      date: 'March 5, 2023',
      author: 'John Doe'
    },
    {
      id: 2,
      title: 'How Taking Notes Can Help You Remember Information Better',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
      date: 'March 2, 2023',
      author: 'Jane Smith'
    },
    {
      id: 3,
      title: 'The Benefits of Using a To-Do List for Time Management',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
      date: 'February 28, 2023',
      author: 'John Doe'
    }
  ];

  return (
    <>
              <Navbar></Navbar>
    <Box>
      <Container maxW="container.lg" py={8}>
        <Stack spacing={8}>
          {posts.map(post => (
            <BlogPost key={post.id} title={post.title} content={post.content} date={post.date} author={post.author} />
          ))}
        </Stack>
      </Container>
    </Box>
    <Footer></Footer>
    </>
  );
};

export default Blog;

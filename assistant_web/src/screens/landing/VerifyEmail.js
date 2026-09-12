import { useEffect, useState } from "react";
import { Button, Flex, Heading, Text } from "@chakra-ui/react";
import { useRouter } from 'next/router';
import axios from "axios";

function VerifyEmail() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  const { token } = router.query;
  const history = useHistory();

  useEffect(() => {
    axios.post("/api/verify-email", { token })
      .then(() => {
        setLoading(false);
        setSuccess(true);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, [token]);

  const handleGoToLogin = () => {
    history.push("/login");
  };

  let content;
  if (loading) {
    content = <Text>Loading...</Text>;
  } else if (success) {
    content = (
      <>
        <Heading mb={4}>Email Verified</Heading>
        <Text>Your email has been successfully verified.</Text>
        <Button mt={4} onClick={handleGoToLogin}>Go to Login</Button>
      </>
    );
  } else {
    content = (
      <>
        <Heading mb={4}>Email Verification Failed</Heading>
        <Text>Sorry, we could not verify your email.</Text>
        <Button mt={4} onClick={handleGoToLogin}>Go to Login</Button>
      </>
    );
  }

  return (
    <Flex align="center" justify="center" height="100vh">
      <Flex direction="column" align="center" justify="center" p={8} borderWidth={1} borderRadius={8}>
        {content}
      </Flex>
    </Flex>
  );
}

export default VerifyEmail;

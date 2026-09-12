import { Box, Container, Heading, Text } from "@chakra-ui/react";
import Navbar from "../../components/landing/Nav/Navbar"
import Footer from "../../components/landing/Footer";

const PrivacyPolicyPage = () => {
  return (
    <>
      <Navbar></Navbar>
    <Box py={16}>
      <Container maxW="container.lg">
        <Heading as="h1" size="xl" mb={8}>
          Privacy Policy
        </Heading>
        <Text mb={4}>
          We take your privacy seriously. This policy explains how we collect,
          use, disclose, and protect your personal information.
        </Text>
        <Text fontWeight="bold" mb={2}>
          What personal information do we collect?
        </Text>
        <Text mb={4}>
          We may collect personal information from you such as your name, email
          address, and payment information if you sign up for a paid plan. We
          may also collect information about your usage of the app, such as the
          tasks you create and how often you use the Pomodoro timer.
        </Text>
        <Text fontWeight="bold" mb={2}>
          How do we use your personal information?
        </Text>
        <Text mb={4}>
          We use your personal information to provide you with the app's
          features and services, including creating and managing tasks and
          providing the Pomodoro timer. We may also use your personal
          information to communicate with you about updates and changes to the
          app, as well as to send you marketing communications about our other
          products and services.
        </Text>
        <Text fontWeight="bold" mb={2}>
          Do we share your personal information?
        </Text>
        <Text mb={4}>
          We do not sell, trade, or otherwise transfer your personal
          information to third parties. However, we may share your personal
          information with service providers who help us operate the app or
          provide services to you (such as payment processors). We may also
          share your personal information if we are required to do so by law or
          if we believe it is necessary to protect our rights, property, or
          safety, or the rights, property, or safety of others.
        </Text>
        <Text fontWeight="bold" mb={2}>
          How do we protect your personal information?
        </Text>
        <Text mb={4}>
          We take reasonable measures to protect your personal information from
          unauthorized access, disclosure, alteration, and destruction. We use
          encryption to protect your payment information and restrict access to
          your personal information to employees who need to know that
          information in order to operate the app and provide services to you.
        </Text>
        <Text fontWeight="bold" mb={2}>
          How long do we retain your personal information?
        </Text>
        <Text mb={4}>
          We retain your personal information for as long as necessary to
          provide you with the app's features and services and to comply with
          our legal obligations. We may also retain your personal information
          for a longer period of time if necessary to resolve disputes,
          enforce our agreements, or for other legitimate business purposes.
        </Text>
        <Text fontWeight="bold" mb={2}>
          Can you opt out of receiving marketing communications?
        </Text>
        <Text mb={4}>
          Yes, you can opt out of receiving marketing communications from us by
          following the instructions provided in the communication or by
          contacting us at the email address below.
        </Text>
        <Text mb={4}>
          If you have any questions or concerns about our privacy policy or the
          use         of your personal information, please contact us at
          <Text as="a" href="mailto:privacy@yourapp.com" color="blue.500" ml={1}>
            privacy@yourapp.com
          </Text>
          .
        </Text>
        <Text fontWeight="bold" mb={2}>
          Changes to this privacy policy
        </Text>
        <Text mb={4}>
          We may update this privacy policy from time to time to reflect changes
          in our practices or for other operational, legal, or regulatory
          reasons. We encourage you to review this policy periodically for any
          changes. Your continued use of the app after we make changes indicates
          your acceptance of those changes.
        </Text>
        <Text mb={4}>
          Last updated: March 8, 2023
        </Text>
      </Container>
    </Box>
    <Footer></Footer>
    </>
  );
};

export default PrivacyPolicyPage;


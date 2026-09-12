import { Container, Heading, Text } from "@chakra-ui/react";
import Navbar from "../../components/landing/Nav/Navbar"
import Footer from "../../components/landing/Footer";

const TermsOfUse = () => {
  return (
    <><Navbar></Navbar>
    <Container maxW="container.lg" py={12}>
      <Heading mb={6}>Terms of Use</Heading>
      <Text mb={2}>
        These Terms of Use and your use of the app shall be governed by and construed in
        accordance with the laws of the jurisdiction where the headquarters of our company
        is located, without regard to its conflict of law provisions.
      </Text>
      <Text mb={2}>
        By accessing or using the app, you agree to be bound by these Terms of Use. If you
        disagree with any part of the terms, then you may not access the app.
      </Text>
      <Text mb={2}>
        Our app and its content are provided "as is" and "as available" without warranty
        of any kind, either express or implied, including, but not limited to, the implied
        warranties of merchantability, fitness for a particular purpose, or non-infringement.
      </Text>
      <Text mb={2}>
        In no event shall our company or its affiliates, or any of their respective officers,
        directors, employees, agents, or suppliers be liable for any direct, indirect, punitive,
        special, or consequential damages arising out of, or in any way connected with, your
        access to, display of, or use of the app or with the delay or inability to access,
        display, or use the app (including, but not limited to, your reliance upon opinions
        appearing on the app; any computer viruses, information, software, linked sites, products,
        and services obtained through the app; or otherwise arising out of the access to, display
        of, or use of the app) whether based on a theory of negligence, contract, tort, strict
        liability, or otherwise, and even if we have been advised of the possibility of such damages.
      </Text>
      <Text mb={2}>
        If any provision of these Terms of Use is held to be invalid or unenforceable, such provision
        shall be struck and the remaining provisions shall be enforced. You agree that these Terms
        of Use and your use of the app are expressly and solely governed by the laws of the jurisdiction
        where the headquarters of our company is located, notwithstanding any principles of conflicts
        of law.
      </Text>
      <Text mb={2}>
        Our failure to exercise or enforce any right or provision of these Terms of Use shall not
        constitute a waiver of such right or provision. The Terms of Use constitutes the entire
        agreement between you and our company and governs your use of the app, superseding any prior
        agreements (including, but not limited to, any prior versions of the Terms of Use).
      </Text>
      <Text>
        If you have any questions or concerns about our Terms of Use, please contact us at
        legal@yourproductivityapp.com.
      </Text>
    </Container>
    <Footer></Footer>
    </>
  );
};

export default TermsOfUse;

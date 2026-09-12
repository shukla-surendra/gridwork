import React from "react";
import { Box, Container } from "@chakra-ui/react";
import Footer from "../../components/landing/Footer";
import PomodoroApp from "../../components/landing/Pomodoro/PomodoroTimer";
import Navbar from "../../components/landing/Nav/Navbar";

export default function Pomodoro() {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Box flex="1" pt={20} pb={8}>
        <Container maxW="container.md">
          <PomodoroApp />
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}

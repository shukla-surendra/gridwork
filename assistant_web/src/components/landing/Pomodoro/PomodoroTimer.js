import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  useColorModeValue,
  Input,
  FormControl,
  FormLabel,
  IconButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Switch,
  Divider,
} from "@chakra-ui/react";
import { FiPlay, FiPause, FiRefreshCw, FiVolume2, FiVolumeX, FiSettings } from "react-icons/fi";

const MODES = {
  pomodoro: "Pomodoro",
  short: "Short Break",
  long: "Long Break",
};

const MODE_COLORS = {
  [MODES.pomodoro]: "brand.500",
  [MODES.short]: "green.500",
  [MODES.long]: "blue.500",
};

export default function PomodoroApp() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [mode, setMode] = useState(MODES.pomodoro);
  const [pomodoroTime, setPomodoroTime] = useState(25);
  const [shortBreakTime, setShortBreakTime] = useState(5);
  const [longBreakTime, setLongBreakTime] = useState(15);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(pomodoroTime * 60);
  const [isMuted, setIsMuted] = useState(false);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartPomodoros, setAutoStartPomodoros] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);
  // Audio doesn't exist in Node -- lazily created client-side only, both to
  // avoid crashing Next's static-export prerender and to stop re-creating
  // a new Audio object on every render (the original always did).
  const alertSound = useMemo(() => (typeof window !== 'undefined' ? new Audio("/alerts/alert.mp3") : null), []);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [history, setHistory] = useState([]);

  // Color mode values
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("gray.800", "gray.200");
  const subTextColor = useColorModeValue("gray.500", "gray.400");

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(getDurationByMode(mode) * 60);
    }
  }, [mode]);

  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(getDurationByMode(mode) * 60);
    }
  }, [pomodoroTime, shortBreakTime, longBreakTime]);

  useEffect(() => {
    let timer;
    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && secondsLeft === 0) {
      if (!isMuted) {
        alertSound.play();
      }

      if (Notification.permission === "granted") {
        new Notification(`${mode} finished`, {
          body: mode === MODES.pomodoro ? "Time for a break!" : "Back to work!",
        });
      }

      setHistory((prev) => [
        ...prev,
        { mode, completedAt: new Date().toISOString() },
      ]);

      if (mode === MODES.pomodoro) {
        setCompletedPomodoros((prev) => prev + 1);
        if ((completedPomodoros + 1) % 4 === 0) {
          setMode(MODES.long);
        } else {
          setMode(MODES.short);
        }
      } else {
        setMode(MODES.pomodoro);
      }

      setIsRunning(false);
    }

    return () => clearInterval(timer);
  }, [isRunning, secondsLeft, isMuted]);

  useEffect(() => {
    const min = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
    const sec = (secondsLeft % 60).toString().padStart(2, "0");
    document.title = `${min}:${sec} ${isRunning ? "⏳" : "⏸️"} ${mode}`;
  }, [secondsLeft, isRunning, mode]);

  const getDurationByMode = (m) => {
    if (m === MODES.pomodoro) return pomodoroTime;
    if (m === MODES.short) return shortBreakTime;
    return longBreakTime;
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(getDurationByMode(mode) * 60);
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const progress =
    (100 * (getDurationByMode(mode) * 60 - secondsLeft)) /
    (getDurationByMode(mode) * 60);

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      boxShadow="lg"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
    >
      <Box
        h="2"
        bg={MODE_COLORS[mode]}
        transition="background-color 0.3s"
      />
      
      <VStack spacing={8} p={8}>
        <HStack spacing={2} w="full" justify="space-between">
          <HStack spacing={2}>
            {Object.values(MODES).map((m) => (
              <Button
                key={m}
                size="sm"
                colorScheme={m === mode ? "brand" : "gray"}
                variant={m === mode ? "solid" : "ghost"}
                onClick={() => {
                  setMode(m);
                  setIsRunning(false);
                }}
              >
                {m}
              </Button>
            ))}
          </HStack>
          <Tooltip label="Settings">
            <IconButton
              aria-label="Settings"
              icon={<FiSettings />}
              variant="ghost"
              colorScheme="gray"
              onClick={onOpen}
            />
          </Tooltip>
        </HStack>

        <VStack spacing={4}>
          <Text fontSize="2xl" fontWeight="bold" color={textColor}>
            {mode} Timer
          </Text>
          <Text
            fontSize="6xl"
            fontWeight="bold"
            color={MODE_COLORS[mode]}
            fontFamily="mono"
          >
            {minutes}:{seconds}
          </Text>
        </VStack>

        <Box w="full" h="2" bg="gray.100" borderRadius="full" overflow="hidden">
          <Box
            h="full"
            bg={MODE_COLORS[mode]}
            transition="width 1s"
            width={`${progress}%`}
          />
        </Box>

        <HStack spacing={4}>
          <Tooltip label={isRunning ? "Pause" : "Start"}>
            <IconButton
              aria-label={isRunning ? "Pause" : "Start"}
              icon={isRunning ? <FiPause /> : <FiPlay />}
              colorScheme={isRunning ? "yellow" : "green"}
              size="lg"
              onClick={() => setIsRunning(!isRunning)}
            />
          </Tooltip>
          <Tooltip label="Reset">
            <IconButton
              aria-label="Reset"
              icon={<FiRefreshCw />}
              colorScheme="gray"
              size="lg"
              onClick={handleReset}
            />
          </Tooltip>
          <Tooltip label={isMuted ? "Unmute" : "Mute"}>
            <IconButton
              aria-label={isMuted ? "Unmute" : "Mute"}
              icon={isMuted ? <FiVolumeX /> : <FiVolume2 />}
              colorScheme={isMuted ? "red" : "green"}
              size="lg"
              onClick={() => setIsMuted(!isMuted)}
            />
          </Tooltip>
        </HStack>

        {mode === MODES.pomodoro && (
          <Text color={subTextColor}>
            Long break in {4 - (completedPomodoros % 4)} Pomodoros
          </Text>
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Timer Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <Box>
                <Text fontWeight="medium" mb={4}>Timer Duration (minutes)</Text>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Pomodoro</FormLabel>
                    <Input
                      type="number"
                      min={1}
                      value={pomodoroTime}
                      onChange={(e) => setPomodoroTime(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Short Break</FormLabel>
                    <Input
                      type="number"
                      min={1}
                      value={shortBreakTime}
                      onChange={(e) => setShortBreakTime(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Long Break</FormLabel>
                    <Input
                      type="number"
                      min={1}
                      value={longBreakTime}
                      onChange={(e) => setLongBreakTime(Number(e.target.value))}
                    />
                  </FormControl>
                </VStack>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="medium" mb={4}>Auto Start</Text>
                <VStack spacing={4}>
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0">Auto-start Pomodoros</FormLabel>
                    <Switch
                      isChecked={autoStartPomodoros}
                      onChange={(e) => setAutoStartPomodoros(e.target.checked)}
                    />
                  </FormControl>
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0">Auto-start Breaks</FormLabel>
                    <Switch
                      isChecked={autoStartBreaks}
                      onChange={(e) => setAutoStartBreaks(e.target.checked)}
                    />
                  </FormControl>
                </VStack>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="medium" mb={4}>Notifications</Text>
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel mb="0">Show Notifications</FormLabel>
                  <Switch
                    isChecked={showNotifications}
                    onChange={(e) => setShowNotifications(e.target.checked)}
                  />
                </FormControl>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="brand" mr={3} onClick={onClose}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

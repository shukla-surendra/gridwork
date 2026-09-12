import React from 'react';
import { useState } from "react";
import { Modal, Button, FormControl, FormLabel, Grid, NumberIncrementStepper, NumberInput, NumberDecrementStepper, NumberInputField, NumberInputStepper, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton } from "@chakra-ui/react";
import { SettingsIcon } from '@chakra-ui/icons'



const PomodoroSetting = ({ isActive, mode, setTime, setRestTime, isResting, setShortBreakTime, setLongBreakTime, workTime, setWorkTime, restTime }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleWorkTimeChange = (e) => {
    const newWorkTime = Number(e.target.value);
    setWorkTime(newWorkTime);
    if (!isActive && mode === 'pomodoro') {
      setTime(newWorkTime * 60);
    }
  };

  const handleRestTimeChange = (value) => {
    const newRestTime = Number(value);
    setRestTime(newRestTime);
    if (!isActive && isResting) {
      setTime(newRestTime * 60);
    }
  };


  const handleShortBreakTimeChange = (value) => {
    const newShortBreakTime = Number(value);
    setShortBreakTime(newShortBreakTime);
    if (!isActive && mode === 'shortBreak') {
      setTime(newShortBreakTime * 60);
    }
  };

  const handleLongBreakTimeChange = (e) => {
    const newLongBreakTime = Number(e.target.value);
    setLongBreakTime(newLongBreakTime);
    if (!isActive && mode === 'longBreak') {
      setTime(newLongBreakTime * 60);
    }
  };

  return (
    <>
      <Button variant="ghost" colorScheme="gray" aria-label="Open Settings" onClick={() => setIsOpen(true)}><SettingsIcon></SettingsIcon></Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Set Timer Duration</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={4}>

              <FormControl id="workTime">
                <FormLabel>Work Time</FormLabel>
                <NumberInput value={workTime} onChange={handleWorkTimeChange} min={1} max={60}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper onClick={() => setWorkTime(Math.min(workTime + 1, 60))} />
                    <NumberDecrementStepper onClick={() => setWorkTime(Math.min(workTime - 1, 60))} />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              <FormControl id="restTime">
                <FormLabel>Rest Time</FormLabel>

                <NumberInput value={restTime} onChange={handleRestTimeChange} min={1} max={60}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper onClick={() => setRestTime(Math.min(restTime + 1, 60))} />
                    <NumberDecrementStepper onClick={() => setRestTime(Math.min(restTime - 1, 60))} />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            {/* <Button colorScheme="green" onClick={startTimer}>
        Start Timer
      </Button> */}
          </ModalFooter>
        </ModalContent>
      </Modal>

    </>
  );
};

export default PomodoroSetting;

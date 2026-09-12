import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  Button,
  VStack,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  useDisclosure,
  Badge,
  Tooltip,
} from "@chakra-ui/react";

// FullCalendar v6 injects its own styles at runtime -- no separate CSS import needed (v5 required one, which broke under Next.js's node_modules-global-CSS restriction).

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { FiCalendar, FiPlus, FiSettings, FiUsers, FiVideo } from "react-icons/fi";
import { useSelector } from 'react-redux';
import Navbar from "../../components/dashboard/Navbar";
import Header from "../../components/dashboard/Header";
import FeatureDisabledPage from "../../components/dashboard/FeatureDisabledPage";
import { selectIsModuleEnabled } from "../../slices/modules";
import Head from 'next/head';

export default function CalendarPage() {
  const calendarEnabled = useSelector((state) => selectIsModuleEnabled(state, 'calendar'));
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState("timeGridWeek");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: "",
    end: "",
    description: "",
    meetingType: "in-person",
    attendees: [],
    location: "",
    color: "#3182CE",
  });

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const handleDateSelect = (selectInfo) => {
    setNewEvent({
      ...newEvent,
      start: selectInfo.startStr,
      end: selectInfo.endStr,
    });
    onOpen();
  };

  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setNewEvent({
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      description: clickInfo.event.extendedProps.description || "",
      meetingType: clickInfo.event.extendedProps.meetingType || "in-person",
      attendees: clickInfo.event.extendedProps.attendees || [],
      location: clickInfo.event.extendedProps.location || "",
      color: clickInfo.event.backgroundColor,
    });
    onOpen();
  };

  const handleSubmit = () => {
    const calendarApi = selectedEvent?.view?.calendar;
    const eventData = {
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      backgroundColor: newEvent.color,
      borderColor: newEvent.color,
      extendedProps: {
        description: newEvent.description,
        meetingType: newEvent.meetingType,
        attendees: newEvent.attendees,
        location: newEvent.location,
      },
    };

    if (selectedEvent) {
      selectedEvent.setProp("title", newEvent.title);
      selectedEvent.setProp("start", newEvent.start);
      selectedEvent.setProp("end", newEvent.end);
      selectedEvent.setProp("backgroundColor", newEvent.color);
      selectedEvent.setProp("borderColor", newEvent.color);
      selectedEvent.setExtendedProp("description", newEvent.description);
      selectedEvent.setExtendedProp("meetingType", newEvent.meetingType);
      selectedEvent.setExtendedProp("attendees", newEvent.attendees);
      selectedEvent.setExtendedProp("location", newEvent.location);
    } else {
      calendarApi.addEvent(eventData);
    }

    onClose();
    setSelectedEvent(null);
    setNewEvent({
      title: "",
      start: "",
      end: "",
      description: "",
      meetingType: "in-person",
      attendees: [],
      location: "",
      color: "#3182CE",
    });
  };

  const renderEventContent = (eventInfo) => {
    return (
      <Box p={1}>
        <Text fontSize="sm" fontWeight="bold" color="white">
          {eventInfo.event.title}
        </Text>
        <HStack spacing={1} mt={1}>
          {eventInfo.event.extendedProps.meetingType === "virtual" && (
            <Tooltip label="Virtual Meeting">
              <FiVideo size={12} color="white" />
            </Tooltip>
          )}
          {eventInfo.event.extendedProps.attendees?.length > 0 && (
            <Tooltip label={`${eventInfo.event.extendedProps.attendees.length} attendees`}>
              <FiUsers size={12} color="white" />
            </Tooltip>
          )}
        </HStack>
      </Box>
    );
  };

  if (!calendarEnabled) {
    return <FeatureDisabledPage featureName="Calendar" />;
  }

  return (
    <>
      <Head>
        <title>Calendar</title>
        <meta name="description" content="App Description" />
        <meta name="theme-color" content="#008f68" />
      </Head>

      <Box minH="100vh" bg={bgColor}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box
          ml={{ base: 0, md: isMenuCollapsed ? "60px" : "250px" }}
          transition="all 0.3s ease"
          minH="100vh"
        >
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Box p={{ base: 3, md: 4, lg: 5 }}>
            <VStack spacing={8} align="stretch">
              <Flex
                justifyContent="space-between"
                alignItems="center"
                w="full"
                bg={cardBg}
                p={4}
                borderRadius="lg"
                boxShadow="sm"
              >
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  color="blue.600"
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <FiCalendar size={24} /> Calendar
                </Text>
                <HStack spacing={3}>
                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<FiSettings />}
                      variant="outline"
                      size="md"
                      colorScheme="blue"
                    >
                      View
                    </MenuButton>
                    <MenuList>
                      <MenuItem onClick={() => setView("dayGridMonth")}>
                        Month View
                      </MenuItem>
                      <MenuItem onClick={() => setView("timeGridWeek")}>
                        Week View
                      </MenuItem>
                      <MenuItem onClick={() => setView("timeGridDay")}>
                        Day View
                      </MenuItem>
                      <MenuItem onClick={() => setView("listWeek")}>
                        List View
                      </MenuItem>
                    </MenuList>
                  </Menu>
                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    size="md"
                    onClick={() => onOpen()}
                  >
                    New Event
                  </Button>
                </HStack>
              </Flex>

              <Box
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="lg"
                p={4}
                w="full"
                boxShadow="sm"
              >
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                  }}
                  editable={true}
                  selectable={true}
                  selectMirror={true}
                  dayMaxEvents={true}
                  weekends={true}
                  events={events}
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  eventContent={renderEventContent}
                  height="auto"
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                  allDaySlot={false}
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                  }}
                  eventBorderColor="transparent"
                  eventBackgroundColor="blue.500"
                  eventTextColor="white"
                  dayHeaderFormat={{ weekday: 'long' }}
                  slotLabelFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                  }}
                  slotLabelInterval="01:00"
                  expandRows={true}
                  stickyHeaderDates={true}
                  nowIndicator={true}
                  dayMaxEventRows={true}
                  moreLinkText="+%d more"
                  moreLinkClick="popover"
                />
              </Box>
            </VStack>
          </Box>
        </Box>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            bg="blue.500"
            color="white"
            borderTopRadius="md"
          >
            {selectedEvent ? "Edit Event" : "New Event"}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={6}>
            <VStack spacing={6}>
              <FormControl isRequired>
                <FormLabel fontWeight="medium">Title</FormLabel>
                <Input
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  placeholder="Enter event title"
                  size="lg"
                />
              </FormControl>

              <HStack w="full" spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontWeight="medium">Start Time</FormLabel>
                  <Input
                    type="datetime-local"
                    value={newEvent.start}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, start: e.target.value })
                    }
                    size="lg"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="medium">End Time</FormLabel>
                  <Input
                    type="datetime-local"
                    value={newEvent.end}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, end: e.target.value })
                    }
                    size="lg"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel fontWeight="medium">Meeting Type</FormLabel>
                <Select
                  value={newEvent.meetingType}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, meetingType: e.target.value })
                  }
                  size="lg"
                >
                  <option value="in-person">In-Person Meeting</option>
                  <option value="virtual">Virtual Meeting</option>
                  <option value="hybrid">Hybrid Meeting</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="medium">Location</FormLabel>
                <Input
                  value={newEvent.location}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, location: e.target.value })
                  }
                  placeholder="Meeting room or video call link"
                  size="lg"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="medium">Attendees</FormLabel>
                <Input
                  value={newEvent.attendees.join(", ")}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      attendees: e.target.value.split(",").map((email) => email.trim()),
                    })
                  }
                  placeholder="Enter email addresses separated by commas"
                  size="lg"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="medium">Description</FormLabel>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                  placeholder="Enter event description"
                  size="lg"
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="medium">Color</FormLabel>
                <Input
                  type="color"
                  value={newEvent.color}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, color: e.target.value })
                  }
                  size="lg"
                  p={1}
                  h={12}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor="gray.200">
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSubmit}>
              {selectedEvent ? "Update Event" : "Create Event"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

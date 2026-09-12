import React, { useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useColorModeValue,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotifications, markNotificationRead } from "../../slices/notifications";

const getTypeColor = (type) => {
  switch (type) {
    case 'task_assigned':
      return 'blue';
    case 'comment_added':
      return 'yellow';
    case 'meeting':
      return 'purple';
    case 'deadline':
      return 'red';
    default:
      return 'gray';
  }
};

export default function NotificationList() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const dispatch = useDispatch();
  const { notifications, loading } = useSelector((state) => state.notifications);
  const bgColor = useColorModeValue("white", "gray.800");

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const recent = notifications.slice(0, 5);

  return (
    <Box w="340px" maxH="400px" overflowY="auto" p={3}>
      <VStack align="stretch" spacing={2}>
        {loading && <Center py={4}><Spinner size="sm" /></Center>}
        {!loading && recent.length === 0 && (
          <Text color="gray.500" textAlign="center">
            No notifications
          </Text>
        )}
        {recent.map((n) => (
          <Box
            key={n.notification_id}
            p={3}
            borderRadius="md"
            bg={n.is_read ? "gray.100" : "blue.50"}
            boxShadow="sm"
            cursor="pointer"
            _hover={{ bg: "blue.100" }}
            onClick={() => {
              if (!n.is_read) dispatch(markNotificationRead(n.notification_id));
            }}
          >
            <HStack justify="space-between">
              <Text fontWeight="bold" fontSize="sm">{n.title}</Text>
              {!n.is_read && <Badge colorScheme="blue">New</Badge>}
            </HStack>
            <Text fontSize="sm" color="gray.700" mt={1}>
              {n.message}
            </Text>
            <HStack mt={2} spacing={2}>
              <Badge colorScheme={getTypeColor(n.type)}>{n.type}</Badge>
            </HStack>
          </Box>
        ))}
      </VStack>
      <Button
        mt={4}
        w="100%"
        size="sm"
        colorScheme="blue"
        variant="outline"
        onClick={() => navigate('/notifications')}
      >
        View all notifications
      </Button>
    </Box>
  );
}

import React from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Flex,
  Icon,
  Button,
  Divider,
  useColorModeValue,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { FiBell } from "react-icons/fi";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { markNotificationRead, markAllNotificationsRead, selectUnreadCount } from "../../slices/notifications";
import { notificationMeta, notificationHref, asUtc } from "../../utils/notificationMeta";
import { timeAgo } from "../../utils/locale";

// The bell dropdown. Fetching/polling lives in the Header so the unread
// badge stays current while this is closed.
export default function NotificationList({ onClose }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { notifications, loading, loaded } = useSelector((state) => state.notifications);
  const unreadCount = useSelector(selectUnreadCount);
  const unreadBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const hoverBg = useColorModeValue("gray.100", "whiteAlpha.200");
  const mutedColor = useColorModeValue("gray.600", "gray.400");

  const recent = notifications.slice(0, 8);

  const open = (n) => {
    if (!n.is_read) dispatch(markNotificationRead(n.notification_id));
    const href = notificationHref(n);
    if (href) {
      onClose?.();
      router.push(href);
    }
  };

  return (
    <Box w="360px">
      <Flex justify="space-between" align="center" px={4} py={3}>
        <Text fontWeight="semibold">Notifications</Text>
        {unreadCount > 0 && (
          <Button size="xs" variant="ghost" colorScheme="blue" onClick={() => dispatch(markAllNotificationsRead())}>
            Mark all as read
          </Button>
        )}
      </Flex>
      <Divider />
      <Box maxH="420px" overflowY="auto">
        {loading && !loaded && <Center py={6}><Spinner size="sm" /></Center>}
        {loaded && recent.length === 0 && (
          <VStack py={8} spacing={2} color={mutedColor}>
            <Icon as={FiBell} boxSize={6} />
            <Text fontSize="sm">You're all caught up</Text>
          </VStack>
        )}
        {recent.map((n) => {
          const meta = notificationMeta(n.type);
          return (
            <HStack
              key={n.notification_id}
              align="start"
              spacing={3}
              px={4}
              py={3}
              bg={n.is_read ? "transparent" : unreadBg}
              _hover={{ bg: hoverBg }}
              cursor="pointer"
              onClick={() => open(n)}
            >
              <Icon as={meta.icon} mt={1} color={`${meta.color}.500`} />
              <Box flex="1" minW={0}>
                <Text fontSize="sm" fontWeight={n.is_read ? "normal" : "semibold"} noOfLines={2}>{n.title}</Text>
                {n.message && <Text fontSize="xs" color={mutedColor} noOfLines={2}>{n.message}</Text>}
                <Text fontSize="xs" color={mutedColor} mt={1}>{timeAgo(asUtc(n.created_at))}</Text>
              </Box>
              {!n.is_read && <Box w={2} h={2} mt={2} borderRadius="full" bg="blue.500" flexShrink={0} />}
            </HStack>
          );
        })}
      </Box>
      <Divider />
      <Button
        w="100%"
        size="sm"
        variant="ghost"
        borderRadius={0}
        onClick={() => { onClose?.(); router.push('/notifications'); }}
      >
        View all notifications
      </Button>
    </Box>
  );
}

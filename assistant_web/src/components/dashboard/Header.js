import React, { useEffect } from 'react';
import {
    IconButton,
    Flex,
    HStack,
    useColorModeValue,
    useDisclosure,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Text,
    Avatar,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider,
    Box,
    Button,
    Kbd
} from '@chakra-ui/react';
import { FiMenu, FiBell, FiSearch, FiChevronDown, FiLogOut, FiUser, FiSettings, FiPlus, FiCheckSquare, FiFileText } from 'react-icons/fi';
import NotificationList from "./NotificationList";
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../slices/auth';
import auth from '../../utils/auth';
import QuickProfilePopover from './modals/QuickProfilePopover';
import CommandPalette from './CommandPalette';
import { fetchNotifications, selectUnreadCount } from '../../slices/notifications';
import NewTaskDrawer from './drawers/NewTaskDrawer';
import NewNoteDrawer from './drawers/NewNoteDrawer';

const Header = ({ onMenuToggle }) => {
    const { isOpen: isQuickProfileOpen, onOpen: onQuickProfileOpen, onClose: onQuickProfileClose } = useDisclosure();
    const { isOpen: isNotificationsOpen, onOpen: onNotificationsOpen, onClose: onNotificationsClose } = useDisclosure();
    const { isOpen: isNewTaskOpen, onOpen: onNewTaskOpen, onClose: onNewTaskClose } = useDisclosure();
    const { isOpen: isNewNoteOpen, onOpen: onNewNoteOpen, onClose: onNewNoteClose } = useDisclosure();
    const { isOpen: isSearchOpen, onOpen: onSearchOpen, onClose: onSearchClose } = useDisclosure();

    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const router = useRouter();
    const navigate = (path) => router.push(path);
    const dispatch = useDispatch();
    
    const user = useSelector(state => state.auth.user);
    const unreadCount = useSelector(selectUnreadCount);
    const badgeBorder = bgColor;

    // Keep the bell's unread count fresh: poll while the tab is visible and
    // refresh as soon as the user comes back to it.
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible') dispatch(fetchNotifications());
        };
        refresh();
        const timer = setInterval(refresh, 60000);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [dispatch]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                onSearchOpen();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onSearchOpen]);

    const handleLogout = () => {
        dispatch(logout()); // Dispatch Redux logout action
        auth.logout(); // Call auth service logout
        navigate('/login'); // Redirect to login page
    };

    return (
        <Box
            as="header"
            position="sticky"
            top="0"
            zIndex="sticky"
            bg={bgColor}
            borderBottom="1px"
            borderColor={borderColor}
        >
            <Flex
                h="16"
                alignItems="center"
                justifyContent="space-between"
                px={4}
            >
                <HStack spacing={4}>
                    <IconButton
                        icon={<FiMenu />}
                        variant="ghost"
                        onClick={onMenuToggle}
                        aria-label="Toggle menu"
                    />
                    <Button
                        leftIcon={<FiSearch />}
                        variant="outline"
                        size="sm"
                        color="gray.500"
                        fontWeight="normal"
                        justifyContent="flex-start"
                        w={{ base: 'auto', md: '280px' }}
                        onClick={onSearchOpen}
                        aria-label="Search"
                    >
                        <Text display={{ base: 'none', md: 'block' }} flex="1" textAlign="left">Search…</Text>
                        <HStack spacing={1} display={{ base: 'none', md: 'flex' }}>
                            <Kbd fontSize="xs">⌘</Kbd><Kbd fontSize="xs">K</Kbd>
                        </HStack>
                    </Button>
                </HStack>

                <HStack spacing={2}>
                    <Menu>
                        <MenuButton as={Button} leftIcon={<FiPlus />} colorScheme="blue" size="sm">
                            Create
                        </MenuButton>
                        <MenuList>
                            <MenuItem icon={<FiCheckSquare />} onClick={onNewTaskOpen}>Issue</MenuItem>
                            <MenuItem icon={<FiFileText />} onClick={onNewNoteOpen}>Note</MenuItem>
                        </MenuList>
                    </Menu>

                    <Popover
                        isOpen={isNotificationsOpen}
                        onClose={onNotificationsClose}
                        placement="bottom-end"
                        zIndex={1000}
                    >
                        <PopoverTrigger>
                            <Box position="relative">
                                <IconButton
                                    icon={<FiBell />}
                                    variant="ghost"
                                    onClick={onNotificationsOpen}
                                    aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                                />
                                {unreadCount > 0 && (
                                    <Box
                                        position="absolute"
                                        top="4px"
                                        right="4px"
                                        minW="18px"
                                        h="18px"
                                        px={1}
                                        borderRadius="full"
                                        bg="red.500"
                                        color="white"
                                        fontSize="10px"
                                        fontWeight="bold"
                                        lineHeight="18px"
                                        textAlign="center"
                                        border="2px solid"
                                        borderColor={badgeBorder}
                                        boxSizing="content-box"
                                        pointerEvents="none"
                                    >
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Box>
                                )}
                            </Box>
                        </PopoverTrigger>
                        <PopoverContent 
                            width="360px" 
                            position="relative"
                            zIndex={1000}
                            boxShadow="xl"
                        >
                            <PopoverBody p={0}>
                                <NotificationList onClose={onNotificationsClose} />
                            </PopoverBody>
                        </PopoverContent>
                    </Popover>

                    <Menu>
                        <MenuButton
                            as={Button}
                            rightIcon={<FiChevronDown />}
                            variant="ghost"
                            leftIcon={<Avatar size="sm" name={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User'} src={user?.avatar_url} />}
                        >
                            <Text display={{ base: "none", md: "block" }}>
                                {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User'}
                            </Text>
                        </MenuButton>
                        <MenuList>
                            <MenuItem icon={<FiUser />} onClick={onQuickProfileOpen}>
                                Quick Profile
                            </MenuItem>
                            <MenuItem icon={<FiSettings />} onClick={() => navigate('/settings')}>
                                Settings
                            </MenuItem>
                            <MenuDivider />
                            <MenuItem icon={<FiLogOut />} onClick={handleLogout}>
                                Logout
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </HStack>
            </Flex>

            {/* Modals and Drawers */}
            <CommandPalette isOpen={isSearchOpen} onClose={onSearchClose} />
            <QuickProfilePopover isOpen={isQuickProfileOpen} onClose={onQuickProfileClose} user={user} />
            <NewTaskDrawer 
                currentTask={{}} 
                disclosures={{ 
                    isOpen: isNewTaskOpen, 
                    onOpen: onNewTaskOpen, 
                    onClose: onNewTaskClose 
                }} 
            />
            <NewNoteDrawer 
                currentTask={{}} 
                disclosures={{ 
                    isOpen: isNewNoteOpen, 
                    onOpen: onNewNoteOpen, 
                    onClose: onNewNoteClose 
                }} 
            />
        </Box>
    );
};

export default Header;


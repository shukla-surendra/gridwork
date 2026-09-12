import React, { useState } from 'react';
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
    useColorMode,
    Select,
    Box,
    Button
} from '@chakra-ui/react';
import { FiMenu, FiBell, FiSearch, FiSun, FiMoon, FiChevronDown, FiLogOut, FiUser, FiSettings } from 'react-icons/fi';
import NotificationList from "./NotificationList";
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../slices/auth';
import auth from '../../utils/auth';
import QuickProfilePopover from './modals/QuickProfilePopover';
import UnifiedCreateButton from './UnifiedCreateButton';
import NewTaskDrawer from './drawers/NewTaskDrawer';
import NewNoteDrawer from './drawers/NewNoteDrawer';

const Header = ({ onMenuToggle }) => {
    const { isOpen: isQuickProfileOpen, onOpen: onQuickProfileOpen, onClose: onQuickProfileClose } = useDisclosure();
    const { isOpen: isNotificationsOpen, onOpen: onNotificationsOpen, onClose: onNotificationsClose } = useDisclosure();
    const { isOpen: isNewTaskOpen, onOpen: onNewTaskOpen, onClose: onNewTaskClose } = useDisclosure();
    const { isOpen: isNewNoteOpen, onOpen: onNewNoteOpen, onClose: onNewNoteClose } = useDisclosure();

    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const { colorMode, toggleColorMode } = useColorMode();
    const router = useRouter();
    const navigate = (path) => router.push(path);
    const dispatch = useDispatch();
    
    const user = useSelector(state => state.auth.user);

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
                    <IconButton
                        icon={<FiSearch />}
                        variant="ghost"
                        aria-label="Search"
                    />
                </HStack>

                <HStack spacing={4}>
                    <Popover
                        isOpen={isNotificationsOpen}
                        onClose={onNotificationsClose}
                        placement="bottom-end"
                        zIndex={1000}
                    >
                        <PopoverTrigger>
                            <IconButton
                                icon={<FiBell />}
                                variant="ghost"
                                onClick={onNotificationsOpen}
                                aria-label="Notifications"
                            />
                        </PopoverTrigger>
                        <PopoverContent 
                            width="340px" 
                            position="relative"
                            zIndex={1000}
                            boxShadow="xl"
                        >
                            <PopoverBody p={0}>
                                <NotificationList />
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


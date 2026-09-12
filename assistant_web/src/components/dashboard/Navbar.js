import React, { useEffect } from "react";
import {
  Icon,
  useColorModeValue,
  Divider,
  VStack,
  Text,
  Box,
  Flex,
  useColorMode,
  IconButton,
  Tooltip,
  useDisclosure,
  Spacer
} from '@chakra-ui/react';
// Here we have used react-icons package for the icons

import { 
  AiOutlineBook, 
  AiOutlineDatabase,
  AiOutlineTeam
} from 'react-icons/ai';
import { 
  BsCalendarCheck, 
  BsKanban,
  BsListTask,
  BsFileEarmarkText,
  BsGraphUp,
  BsPersonLinesFill,
  BsChatDots
} from 'react-icons/bs';
import { 
  FiClock, 
  FiWatch, 
  FiFileText, 
  FiCheckSquare,
  FiBook,
  FiDatabase,
  FiUsers,
  FiSettings,
  FiHome,
  FiCalendar,
  FiBarChart2,
  FiSun,
  FiMoon,
  FiGrid,
  FiMenu,
  FiX,
  FiList,
  FiBell,
  FiBox
} from 'react-icons/fi';
import {
  MdOutlineDashboard,
  MdOutlineSpaceDashboard,
  MdOutlineAnalytics,
  MdSchool
} from 'react-icons/md';

import RouterLink from 'next/link';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import WorkspaceSelector from "./sections/WorkSpaceSelector";
import { fetchModules } from "../../slices/modules";

// Plug-and-play modules -- a module only shows up here once it's both
// registered on the backend AND has a known frontend route. Adding a new
// module's nav entry means adding one line to each of these two maps.
const MODULE_ICONS = { box: FiBox, users: FiUsers, school: MdSchool };
const MODULE_ROUTES = { inventory: "/inventory", hr: "/hr", school_erp: "/school-erp" };

const Navbar = ({ isCollapsed, onToggle }) => {
  const router = useRouter();
  const location = { pathname: router.pathname };
  const { colorMode, toggleColorMode } = useColorMode();
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const { isOpen, onToggle: onWorkspaceToggle } = useDisclosure();
  const dispatch = useDispatch();
  const { items: moduleItems, byKey: moduleState } = useSelector((state) => state.modules);

  useEffect(() => {
    dispatch(fetchModules());
  }, [dispatch]);

  const enabledModules = moduleItems.filter(m => m.enabled && MODULE_ROUTES[m.key]);

  // Default-on features (Wiki, CRM, ...) stay visible until the fetch
  // above actually confirms they were switched off, so there's no flash
  // of missing nav items on every page load while it's in flight.
  const isFeatureVisible = (key) => moduleState[key] !== false;

  return (
    <Box
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      w={isCollapsed ? '60px' : '250px'}
      pos="fixed"
      h="full"
      transition="all 0.3s ease"
      zIndex="sticky"
    >
      <VStack h="full" align="stretch" spacing={0}>
        {/* Header */}
        <Flex
          p={4}
          align="center"
          borderBottom="1px"
          borderColor={borderColor}
          justify="space-between"
          bg={bgColor}
          position="sticky"
          top={0}
          zIndex={1}
        >
          <RouterLink href="/dashboard" style={{ textDecoration: 'none' }}>
            <Flex align="center" gap={2}>
              <Text 
                fontSize={isCollapsed ? "xl" : "lg"} 
                fontWeight="bold" 
                color={useColorModeValue("gray.800", "white")}
              >
                {isCollapsed ? "G" : "GridWork"}
              </Text>
            </Flex>
          </RouterLink>
          <IconButton
            icon={<Icon as={isCollapsed ? FiMenu : FiX} />}
            variant="ghost"
            onClick={onToggle}
            aria-label="Toggle Menu"
            size="sm"
          />
        </Flex>

        {/* Scrollable Content */}
        <Box overflowY="auto" flex={1}>
          {/* Workspace Selector */}
          <Box p={2}>
            <WorkspaceSelector isCollapsed={isCollapsed} />
          </Box>

          <Divider />

          {/* Quick Access */}
          <Box p={2}>
            {!isCollapsed && (
              <Text
                px={4}
                py={2}
                fontSize="xs"
                fontWeight="bold"
                color="gray.500"
                textTransform="uppercase"
              >
                Quick Access
              </Text>
            )}
            <NavItem
              icon={FiHome}
              to="/dashboard"
              isActive={location.pathname === '/dashboard'}
              isCollapsed={isCollapsed}
            >
              Dashboard
            </NavItem>
            {isFeatureVisible('tasks') && (
              <NavItem
                icon={FiFileText}
                to="/tasks"
                isActive={location.pathname === '/tasks'}
                isCollapsed={isCollapsed}
              >
                Tasks
              </NavItem>
            )}
            {isFeatureVisible('boards') && (
              <NavItem
                icon={BsKanban}
                to="/boards"
                isActive={location.pathname === '/boards'}
                isCollapsed={isCollapsed}
              >
                Boards
              </NavItem>
            )}
            {isFeatureVisible('notes') && (
              <NavItem
                icon={FiBook}
                to="/notes"
                isActive={location.pathname === '/notes'}
                isCollapsed={isCollapsed}
              >
                Notes
              </NavItem>
            )}
            {isFeatureVisible('calendar') && (
              <NavItem
                icon={FiCalendar}
                to="/calendar"
                isActive={location.pathname === '/calendar'}
                isCollapsed={isCollapsed}
              >
                Calendar
              </NavItem>
            )}
            {isFeatureVisible('timeblocks') && (
              <NavItem
                icon={FiClock}
                to="/timeblock"
                isActive={location.pathname === '/timeblock'}
                isCollapsed={isCollapsed}
              >
                Time Block
              </NavItem>
            )}
            {isFeatureVisible('reminders') && (
              <NavItem
                icon={FiBell}
                to="/reminders"
                isActive={location.pathname === '/reminders'}
                isCollapsed={isCollapsed}
              >
                Reminders
              </NavItem>
            )}
          </Box>

          <Divider />

          {/* Knowledge -- notetaking + Confluence-style docs/tables, already
              built (WikiPage/DatabasePage) but previously not linked anywhere */}
          <Box p={2}>
            {!isCollapsed && (
              <Text
                px={4}
                py={2}
                fontSize="xs"
                fontWeight="bold"
                color="gray.500"
                textTransform="uppercase"
              >
                Knowledge
              </Text>
            )}
            {isFeatureVisible('wiki') && (
              <NavItem
                icon={AiOutlineBook}
                to="/wiki"
                isActive={location.pathname === '/wiki'}
                isCollapsed={isCollapsed}
              >
                Wiki
              </NavItem>
            )}
            {isFeatureVisible('database') && (
              <NavItem
                icon={FiDatabase}
                to="/database"
                isActive={location.pathname === '/database'}
                isCollapsed={isCollapsed}
              >
                Database
              </NavItem>
            )}
          </Box>

          <Divider />

          {/* Collaboration */}
          <Box p={2}>
            {!isCollapsed && (
              <Text
                px={4}
                py={2}
                fontSize="xs"
                fontWeight="bold"
                color="gray.500"
                textTransform="uppercase"
              >
                Collaboration
              </Text>
            )}
            {isFeatureVisible('crm') && (
              <NavItem
                icon={BsPersonLinesFill}
                to="/crm"
                isActive={location.pathname === '/crm'}
                isCollapsed={isCollapsed}
              >
                CRM
              </NavItem>
            )}
            {isFeatureVisible('chat') && (
              <NavItem
                icon={BsChatDots}
                to="/chat"
                isActive={location.pathname === '/chat'}
                isCollapsed={isCollapsed}
              >
                Chat
              </NavItem>
            )}
          </Box>

          {enabledModules.length > 0 && (
            <>
              <Divider />
              <Box p={2}>
                {!isCollapsed && (
                  <Text
                    px={4}
                    py={2}
                    fontSize="xs"
                    fontWeight="bold"
                    color="gray.500"
                    textTransform="uppercase"
                  >
                    Modules
                  </Text>
                )}
                {enabledModules.map(module => (
                  <NavItem
                    key={module.key}
                    icon={MODULE_ICONS[module.icon] || FiGrid}
                    to={MODULE_ROUTES[module.key]}
                    isActive={location.pathname === MODULE_ROUTES[module.key]}
                    isCollapsed={isCollapsed}
                  >
                    {module.name}
                  </NavItem>
                ))}
              </Box>
            </>
          )}

          <Divider />

          {/* Workspace */}
          <Box p={2}>
            {!isCollapsed && (
              <Text
                px={4}
                py={2}
                fontSize="xs"
                fontWeight="bold"
                color="gray.500"
                textTransform="uppercase"
              >
                Workspace
              </Text>
            )}
            <NavItem
              icon={FiUsers}
              to="/members"
              isActive={location.pathname === '/members'}
              isCollapsed={isCollapsed}
            >
              Members
            </NavItem>
            {isFeatureVisible('reports') && (
              <NavItem
                icon={FiBarChart2}
                to="/reports"
                isActive={location.pathname === '/reports'}
                isCollapsed={isCollapsed}
              >
                Reports
              </NavItem>
            )}
            <NavItem
              icon={FiSettings}
              to="/settings"
              isActive={location.pathname === '/settings'}
              isCollapsed={isCollapsed}
            >
              Settings
            </NavItem>
          </Box>
        </Box>

        {/* Footer */}
        <Box p={4} borderTop="1px" borderColor={borderColor}>
          <Flex justify="space-between" align="center">
            <Tooltip label={colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}>
              <IconButton
                icon={<Icon as={colorMode === 'light' ? FiMoon : FiSun} />}
                onClick={toggleColorMode}
                variant="ghost"
                aria-label="Toggle color mode"
                size="sm"
              />
            </Tooltip>
          </Flex>
        </Box>
      </VStack>
    </Box>
  );
};

const NavItem = ({ icon, children, isCollapsed, to, isActive, onClick, ...rest }) => {
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.600', 'blue.200');

  const content = (
    <Flex
      align="center"
      p={4}
      mx={2}
      borderRadius="lg"
      role="group"
      cursor="pointer"
      _hover={{
        bg: hoverBg,
      }}
      bg={isActive ? activeBg : 'transparent'}
      color={isActive ? activeColor : 'inherit'}
      {...rest}
    >
      <Icon
        mr={isCollapsed ? 0 : 4}
        fontSize="16"
        as={icon}
      />
      {!isCollapsed && (
        <Text fontSize="sm" fontWeight={isActive ? 'bold' : 'normal'}>
          {children}
        </Text>
      )}
    </Flex>
  );

  if (to) {
    return <RouterLink href={to}>{content}</RouterLink>;
  }

  return content;
};

export default Navbar;
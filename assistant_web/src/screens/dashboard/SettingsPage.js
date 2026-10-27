import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Switch,
  Icon,
  Button,
  useColorMode,
  useColorModeValue,
  IconButton,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Spinner,
  Divider,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react';
import { FiArrowLeft, FiMoon, FiSun, FiBell, FiUser, FiGlobe, FiGrid, FiBox, FiBriefcase } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { retrieveSettings, updateSettings } from '../../slices/settings';
import { updateProfile } from '../../slices/auth';
import { updateWorkspace } from '../../slices/workspaces';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import ModuleService from '../../services/ModuleService';
import UserService from '../../services/userservice';
import AvatarUpload from '../../components/dashboard/modals/AvatarUpload';
import ChangePasswordModal from '../../components/settings/ChangePasswordModal';
import ConfigService from '../../utils/config';
import Auth from '../../utils/auth';
import { NOTIFICATION_TYPES } from '../../utils/notificationMeta';

const MODULE_ICONS = { box: FiBox };

const SettingsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const toast = useToast();
  const changePasswordModal = useDisclosure();
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const { colorMode, toggleColorMode } = useColorMode();
  const { settings } = useSelector((state) => state.settings);
  const { user } = useSelector((state) => state.auth);
  const [savingType, setSavingType] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  // Profile fields live on the User record, not UserSettings -- saved
  // through a separate PUT /users/{id} call (see handleSave), which is
  // also why email isn't editable here: there's no backend support for
  // changing it yet, so it's shown read-only rather than accepting an
  // edit that would silently never save.
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', bio: '' });

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState(null);

  // Workspace + Danger Zone -- moved here from the retired UserSettings
  // popup, which duplicated a chunk of this page. The popup (Header's
  // "Quick Profile") now only handles the fast stuff: avatar/name/theme.
  let workspace = null;
  try { workspace = ConfigService.getDefaultWorkspace(); } catch (e) { /* none selected */ }
  const isWorkspaceOwner = !!(workspace && user && String(workspace.owner_id) === String(user.user_id));
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    setWorkspaceName(workspace?.name || '');
  }, [workspace?.workspace_id]);

  const handleSaveWorkspace = () => {
    if (!workspaceName.trim()) {
      toast({ title: "Workspace name can't be empty", status: 'warning', duration: 2500, isClosable: true });
      return;
    }
    setIsSavingWorkspace(true);
    dispatch(updateWorkspace({ id: workspace.workspace_id, name: workspaceName.trim() }))
      .unwrap()
      .then((updated) => {
        ConfigService.setDefaultWorkspace({ ...workspace, name: updated.name });
        toast({ title: 'Workspace renamed', status: 'success', duration: 2500, isClosable: true });
      })
      .catch(err => toast({ title: "Couldn't rename workspace", description: err.message, status: 'error', duration: 3500, isClosable: true }))
      .finally(() => setIsSavingWorkspace(false));
  };

  const handleDeleteAccount = () => {
    setIsDeletingAccount(true);
    UserService.remove(user.user_id)
      .then(() => {
        toast({ title: 'Account deleted', status: 'info', duration: 2000, isClosable: true });
        Auth.logout();
      })
      .catch(err => {
        toast({
          title: "Couldn't delete account",
          description: err.response?.data?.detail || 'Please try again',
          status: 'error', duration: 3500, isClosable: true,
        });
        setIsDeletingAccount(false);
        setConfirmingDelete(false);
      });
  };

  useEffect(() => {
    dispatch(retrieveSettings());
    loadModules();
  }, [dispatch]);

  const loadModules = async () => {
    try {
      const response = await ModuleService.getAll();
      setModules(response.data);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setModulesLoading(false);
    }
  };

  const handleToggleModule = async (moduleKey, enabled) => {
    setTogglingKey(moduleKey);
    try {
      const response = await ModuleService.toggle(moduleKey, enabled);
      setModules(prev => prev.map(m => m.key === moduleKey ? response.data : m));
      toast({
        title: `${response.data.name} ${enabled ? 'enabled' : 'disabled'}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Couldn't update module",
        description: error.response?.data?.detail || 'Please try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setTogglingKey(null);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  // In-app notification types are on unless explicitly switched off
  // (backend: utils/notifications.py). Saved immediately, like modules.
  const isTypeEnabled = (type) => settings?.notification_settings?.[type] !== false;

  const handleToggleNotificationType = async (type, enabled) => {
    setSavingType(type);
    try {
      await dispatch(updateSettings({
        settings_id: settings.settings_id,
        user_id: settings.user_id,
        workspace_id: settings.workspace_id,
        notification_settings: { ...(settings.notification_settings || {}), [type]: enabled },
      })).unwrap();
    } catch (error) {
      toast({ title: "Couldn't update notification settings", status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSavingType(null);
    }
  };

  const handleProfileChange = (key, value) => {
    setProfileForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user?.user_id) return;
    setIsSavingProfile(true);
    try {
      await dispatch(updateProfile({ userId: user.user_id, data: profileForm })).unwrap();
      toast({ title: 'Profile saved', status: 'success', duration: 2500, isClosable: true });
    } catch (error) {
      toast({
        title: "Couldn't save profile",
        description: typeof error === 'string' ? error : (error.message || 'Please try again'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const profileDirty = !!user && (
    profileForm.first_name !== (user.first_name || '') ||
    profileForm.last_name !== (user.last_name || '') ||
    profileForm.bio !== (user.bio || '')
  );

  if (!settings) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Flex justify="center" align="center" h="50vh">
            <Spinner size="xl" />
          </Flex>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
    <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <IconButton
              icon={<FiArrowLeft />}
              variant="ghost"
              onClick={() => router.back()}
              aria-label="Go back"
            />
            <Heading size="lg">Settings</Heading>
          </HStack>
        </Flex>

        {/* Settings Tabs */}
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>
              <HStack spacing={2}>
                <FiUser />
                <Text>Profile</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <FiBell />
                <Text>Notifications</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <FiGlobe />
                <Text>Appearance</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <FiBriefcase />
                <Text>Workspace</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <FiGrid />
                <Text>Modules</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Profile Settings */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Profile Information</Heading>
                    <HStack>
                      <AvatarUpload user={user} size="lg" />
                      <Text fontSize="sm" color="gray.500">Click the camera icon to change your photo.</Text>
                    </HStack>
                    <HStack spacing={4} align="flex-start">
                      <FormControl>
                        <FormLabel>First Name</FormLabel>
                        <Input
                          value={profileForm.first_name}
                          onChange={(e) => handleProfileChange('first_name', e.target.value)}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Last Name</FormLabel>
                        <Input
                          value={profileForm.last_name}
                          onChange={(e) => handleProfileChange('last_name', e.target.value)}
                        />
                      </FormControl>
                    </HStack>
                    <FormControl>
                      <FormLabel>Email</FormLabel>
                      <Input value={user?.email || ''} isReadOnly isDisabled />
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Email changes aren't supported yet.
                      </Text>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Bio</FormLabel>
                      <Textarea
                        value={profileForm.bio}
                        onChange={(e) => handleProfileChange('bio', e.target.value)}
                      />
                    </FormControl>
                    <Flex justify="flex-end">
                      <Button colorScheme="blue" onClick={handleSaveProfile} isLoading={isSavingProfile} isDisabled={!profileDirty}>
                        Save profile
                      </Button>
                    </Flex>
                  </VStack>
                </Box>

                <Box p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor="red.300">
                  <VStack spacing={4} align="stretch">
                    <Heading size="md" color="red.500">Danger Zone</Heading>
                    <HStack justify="space-between">
                      <Text fontSize="sm">Change your password</Text>
                      <Button size="sm" onClick={changePasswordModal.onOpen}>Change Password</Button>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text fontSize="sm">Permanently delete your account and all its data</Text>
                      {!confirmingDelete ? (
                        <Button colorScheme="red" variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
                          Delete Account
                        </Button>
                      ) : (
                        <HStack>
                          <Text color="red.500" fontSize="sm">This can't be undone.</Text>
                          <Button colorScheme="red" size="sm" onClick={handleDeleteAccount} isLoading={isDeletingAccount}>
                            Confirm Delete
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
                        </HStack>
                      )}
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            {/* Notification Settings */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Heading size="md">In-app notifications</Heading>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Choose what shows up under the bell. You're never notified about your own changes.
                      </Text>
                    </Box>
                    {Object.entries(NOTIFICATION_TYPES).map(([type, meta]) => (
                      <FormControl key={type} display="flex" alignItems="center" justifyContent="space-between">
                        <HStack spacing={3}>
                          <Icon as={meta.icon} color={`${meta.color}.500`} />
                          <Box>
                            <FormLabel mb={0} htmlFor={`notify-${type}`}>{meta.label}</FormLabel>
                            <Text fontSize="xs" color="gray.500">{meta.description}</Text>
                          </Box>
                        </HStack>
                        <Switch
                          id={`notify-${type}`}
                          isChecked={isTypeEnabled(type)}
                          isDisabled={savingType === type}
                          onChange={(e) => handleToggleNotificationType(type, e.target.checked)}
                        />
                      </FormControl>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            {/* Appearance */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Appearance</Heading>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel mb="0">Dark Mode</FormLabel>
                      <IconButton
                        icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
                        onClick={toggleColorMode}
                        variant="ghost"
                        aria-label="Toggle color mode"
                      />
                    </FormControl>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            {/* Workspace -- moved here from the retired UserSettings popup. */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Workspace</Heading>
                    {!workspace ? (
                      <Text color="gray.500">No workspace selected.</Text>
                    ) : (
                      <FormControl>
                        <FormLabel>Workspace Name</FormLabel>
                        <HStack>
                          <Input
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            isReadOnly={!isWorkspaceOwner}
                          />
                          {isWorkspaceOwner && (
                            <Button colorScheme="blue" size="sm" onClick={handleSaveWorkspace} isLoading={isSavingWorkspace}>
                              Save
                            </Button>
                          )}
                        </HStack>
                        {!isWorkspaceOwner && (
                          <Text fontSize="sm" color="gray.500" mt={1}>
                            Only the workspace owner can rename this workspace.
                          </Text>
                        )}
                      </FormControl>
                    )}
                    <Divider />
                    <Text fontSize="sm" color="gray.500">
                      Manage members from the <Text as="a" href="/members" color="blue.500" textDecoration="underline">Members</Text> page.
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            {/* Modules -- plug-and-play feature modules (ERP etc.), each
                enabled independently per workspace. */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Modules</Heading>
                    <Text fontSize="sm" color="gray.500">
                      Turn on additional feature modules for this workspace. Disabled modules are
                      completely hidden from navigation and their APIs refuse requests.
                    </Text>
                    {modulesLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      modules.map(module => {
                        const ModuleIcon = MODULE_ICONS[module.icon] || FiGrid;
                        return (
                          <FormControl key={module.key} display="flex" alignItems="center" justifyContent="space-between">
                            <HStack spacing={3}>
                              <ModuleIcon />
                              <Box>
                                <FormLabel mb={0}>{module.name}</FormLabel>
                                <Text fontSize="xs" color="gray.500">{module.description}</Text>
                              </Box>
                            </HStack>
                            <Switch
                              isChecked={module.enabled}
                              isDisabled={togglingKey === module.key}
                              onChange={(e) => handleToggleModule(module.key, e.target.checked)}
                            />
                          </FormControl>
                        );
                      })
                    )}
                    {!modulesLoading && modules.length === 0 && (
                      <Text fontSize="sm" color="gray.400">No modules available yet.</Text>
                    )}
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
          </VStack>
        </Box>
      </Box>
      <ChangePasswordModal isOpen={changePasswordModal.isOpen} onClose={changePasswordModal.onClose} />
    </Box>
  );
};

export default SettingsPage; 
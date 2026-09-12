import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Icon,
  Text,
  HStack
} from '@chakra-ui/react';
import { FaPlus, FaStickyNote, FaTasks } from 'react-icons/fa';

const UnifiedCreateButton = ({ onCreateNote, onCreateTask }) => {
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        icon={<Icon as={FaPlus} />}
        variant="ghost"
        size="sm"
        aria-label="Create"
      />
      <MenuList>
        <MenuItem onClick={onCreateNote}>
          <HStack>
            <Icon as={FaStickyNote} />
            <Text>Create Note</Text>
          </HStack>
        </MenuItem>
        <MenuItem onClick={onCreateTask}>
          <HStack>
            <Icon as={FaTasks} />
            <Text>Create Task</Text>
          </HStack>
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

export default UnifiedCreateButton; 
import React from 'react';
import { IconButton, Icon } from '@chakra-ui/react';
import { FaEdit } from 'react-icons/fa';

const UnifiedEditButton = ({ item, type, onEdit }) => {
  const handleEdit = () => {
    onEdit(item);
  };

  return (
    <IconButton
      icon={<Icon as={FaEdit} />}
      variant="ghost"
      size="sm"
      aria-label={`Edit ${type === 'note' ? 'Note' : 'Task'}`}
      onClick={handleEdit}
    />
  );
};

export default UnifiedEditButton; 
import React, { useRef, useState } from "react";
import { Avatar, Box, IconButton, useToast } from "@chakra-ui/react";
import { FiCamera } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { uploadAvatar } from "../../../slices/auth";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function fullName(user) {
  return `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
}

// Shared by UserProfile.js and UserSettings.js so both stay in sync with the
// same validation and upload behavior instead of drifting independently.
export default function AvatarUpload({ user, size = "2xl" }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-selecting the same file still fires onChange
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Unsupported image type", description: "Use PNG, JPEG, WEBP, or GIF", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: "Image too large", description: "Max 5MB", status: "warning", duration: 3000, isClosable: true });
      return;
    }

    setIsUploading(true);
    dispatch(uploadAvatar({ userId: user.user_id, file }))
      .unwrap()
      .then(() => toast({ title: "Profile picture updated", status: "success", duration: 2500, isClosable: true }))
      .catch(err => toast({ title: "Couldn't upload picture", description: err, status: "error", duration: 3500, isClosable: true }))
      .finally(() => setIsUploading(false));
  };

  return (
    <Box position="relative" display="inline-block">
      <Avatar size={size} name={fullName(user) || user?.email} src={user?.avatar_url} />
      <IconButton
        aria-label="Change profile picture"
        icon={<FiCamera />}
        size="xs"
        isRound
        colorScheme="blue"
        position="absolute"
        bottom="0"
        right="0"
        isLoading={isUploading}
        onClick={() => inputRef.current?.click()}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={handleFile}
      />
    </Box>
  );
}

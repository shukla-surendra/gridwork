import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar, Box, Button, HStack, Select, Spinner, Text, Textarea, Tooltip, VStack,
  useColorModeValue, useToast,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import CommentService from '../../services/CommentService';
import ConfigService from '../../utils/config';
import { htmlToText } from '../../utils/htmlToText';
import { fullDateTime, relativeTime } from '../../utils/locale';

const isHtml = (value) => /<[a-z][\s\S]*>/i.test(value || '');

const authorName = (comment) => {
  if (comment.author_name) return comment.author_name;
  const user = comment.user || {};
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown user';
};

// Saves on Ctrl/Cmd+Enter, cancels on Escape.
const editorKeys = (onSave, onCancel) => (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    onSave();
  } else if (e.key === 'Escape') {
    e.stopPropagation();
    onCancel();
  }
};

function Comment({ comment, canEdit, canDelete, onSaved, onDeleted, mutedColor }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const workspaceId = ConfigService.getDefaultWorkspace().workspace_id;
  const body = isHtml(comment.content) ? htmlToText(comment.content) : comment.content;

  const startEdit = () => { setDraft(body); setEditing(true); };

  const save = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const res = await CommentService.updateComment(workspaceId, comment.comment_id, draft);
      onSaved(res.data);
      setEditing(false);
    } catch (err) {
      toast({ title: "Couldn't save the comment", description: err.response?.data?.detail, status: 'error', duration: 3000 });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await CommentService.deleteComment(workspaceId, comment.comment_id);
      onDeleted(comment.comment_id);
    } catch (err) {
      toast({ title: "Couldn't delete the comment", description: err.response?.data?.detail, status: 'error', duration: 3000 });
      setBusy(false);
    }
  };

  return (
    <HStack align="flex-start" spacing={3}>
      <Avatar size="sm" name={authorName(comment)} src={comment.author_name ? undefined : comment.user?.avatar_url} />
      <Box flex={1} minW={0}>
        <HStack spacing={2} fontSize="sm" flexWrap="wrap">
          <Text fontWeight="semibold">{authorName(comment)}</Text>
          <Tooltip label={fullDateTime(comment.created_at)} openDelay={400}>
            <Text color={mutedColor}>{relativeTime(comment.created_at)}</Text>
          </Tooltip>
          {comment.edited && <Text color={mutedColor}>(edited)</Text>}
          {comment.author_name && <Text color={mutedColor}>· imported</Text>}
        </HStack>

        {editing ? (
          <Box mt={1}>
            <Textarea
              size="sm"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={editorKeys(save, () => setEditing(false))}
              rows={Math.min(Math.max(draft.split('\n').length, 3), 12)}
            />
            <HStack mt={2} spacing={2}>
              <Button size="sm" colorScheme="blue" onClick={save} isLoading={busy} isDisabled={!draft.trim()}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </HStack>
          </Box>
        ) : (
          <Text fontSize="sm" mt={0.5} whiteSpace="pre-wrap" wordBreak="break-word">{body}</Text>
        )}

        {!editing && (canEdit || canDelete) && (
          confirmDelete ? (
            <HStack mt={1} spacing={2} fontSize="sm">
              <Text color={mutedColor}>Delete this comment? This can't be undone.</Text>
              <Button size="xs" colorScheme="red" onClick={remove} isLoading={busy}>Delete</Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </HStack>
          ) : (
            <HStack mt={1} spacing={3}>
              {canEdit && <Button size="xs" variant="link" color={mutedColor} onClick={startEdit}>Edit</Button>}
              {canDelete && <Button size="xs" variant="link" color={mutedColor} onClick={() => setConfirmDelete(true)}>Delete</Button>}
            </HStack>
          )
        )}
      </Box>
    </HStack>
  );
}

// Comment thread on an issue: add, edit your own, delete your own (owners
// and admins can delete any). Comments are plain text; line breaks are kept.
export default function IssueComments({ taskId, canModerate = false, onCountChange }) {
  const toast = useToast();
  const currentUser = useSelector((state) => state.auth.user);
  const currentUserId = currentUser?.user_id;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState('newest');
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [posting, setPosting] = useState(false);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const workspaceId = () => ConfigService.getDefaultWorkspace().workspace_id;

  const load = useCallback(() => {
    if (!taskId) return;
    setLoading(true);
    CommentService.listComments(workspaceId(), taskId, order)
      .then((res) => setComments(res.data || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [taskId, order]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { onCountChange?.(comments.length); }, [comments.length, onCountChange]);

  const cancelDraft = () => { setDraft(''); setComposing(false); };

  const post = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      const res = await CommentService.createComment(workspaceId(), { task_id: taskId, content: draft });
      setComments((prev) => (order === 'newest' ? [res.data, ...prev] : [...prev, res.data]));
      cancelDraft();
    } catch (err) {
      toast({ title: "Couldn't add the comment", description: err.response?.data?.detail, status: 'error', duration: 3000 });
    } finally {
      setPosting(false);
    }
  };

  const currentName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim();

  const composer = (
    <HStack align="flex-start" spacing={3}>
      <Avatar size="sm" name={currentName} src={currentUser?.avatar_url} />
      <Box flex={1}>
        <Textarea
          size="sm"
          placeholder="Add a comment…"
          value={draft}
          onFocus={() => setComposing(true)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={editorKeys(post, cancelDraft)}
          rows={composing ? 4 : 1}
          resize="vertical"
        />
        {composing && (
          <HStack mt={2} spacing={2}>
            <Button size="sm" colorScheme="blue" onClick={post} isLoading={posting} isDisabled={!draft.trim()}>Save</Button>
            <Button size="sm" variant="ghost" onClick={cancelDraft}>Cancel</Button>
            <Text fontSize="xs" color={mutedColor}>Ctrl + Enter to save</Text>
          </HStack>
        )}
      </Box>
    </HStack>
  );

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="flex-end">
        <Select size="xs" width="auto" value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Comment order">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </HStack>
      {order === 'newest' && composer}
      {loading ? (
        <Spinner size="sm" />
      ) : comments.length === 0 ? (
        <Text fontSize="sm" color={mutedColor}>No comments yet.</Text>
      ) : (
        comments.map((c) => (
          <Comment
            key={c.comment_id}
            comment={c}
            mutedColor={mutedColor}
            canEdit={c.user_id === currentUserId && !c.author_name}
            canDelete={c.user_id === currentUserId || canModerate}
            onSaved={(updated) => setComments((prev) => prev.map((x) => (x.comment_id === updated.comment_id ? updated : x)))}
            onDeleted={(id) => setComments((prev) => prev.filter((x) => x.comment_id !== id))}
          />
        ))
      )}
      {order === 'oldest' && composer}
    </VStack>
  );
}

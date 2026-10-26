import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@chakra-ui/react';
import TaskService from '../services/taskservice';

// Jira's ?selectedIssue=ENG-42 behaviour for any page with an issue drawer:
// - arriving with the param opens that issue (via onOpenIssue)
// - selectIssue(task) puts the open issue's key in the URL, so the address
//   bar is always a shareable link to it
// - clearSelectedIssue() drops the param when the drawer closes
export default function useSelectedIssue(onOpenIssue) {
  const router = useRouter();
  const toast = useToast();
  const selectedIssue = router.query.selectedIssue;
  // Key we put in the URL ourselves -- the effect below must not re-fetch
  // and re-open an issue the user just clicked.
  const selectedByUs = useRef(null);
  const onOpenRef = useRef(onOpenIssue);
  onOpenRef.current = onOpenIssue;

  const replaceQuery = useCallback((query) => {
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    if (!router.isReady || !selectedIssue || selectedIssue === selectedByUs.current) return;
    selectedByUs.current = selectedIssue;
    TaskService.getByKey(selectedIssue)
      .then(res => onOpenRef.current(res.data))
      .catch(() => {
        toast({ title: `Issue ${selectedIssue} not found`, status: 'warning', duration: 3000, isClosable: true });
        selectedByUs.current = null;
        const { selectedIssue: _drop, ...rest } = router.query;
        replaceQuery(rest);
      });
  }, [router.isReady, selectedIssue, router.query, replaceQuery, toast]);

  const selectIssue = useCallback((task) => {
    if (!task?.ticket_key || task.ticket_key === router.query.selectedIssue) return;
    selectedByUs.current = task.ticket_key;
    replaceQuery({ ...router.query, selectedIssue: task.ticket_key });
  }, [router.query, replaceQuery]);

  const clearSelectedIssue = useCallback(() => {
    selectedByUs.current = null;
    if (!router.query.selectedIssue) return;
    const { selectedIssue: _drop, ...rest } = router.query;
    replaceQuery(rest);
  }, [router.query, replaceQuery]);

  return { selectIssue, clearSelectedIssue };
}

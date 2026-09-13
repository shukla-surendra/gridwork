import { useWorkspaceStore } from '../store/workspaceStore';

export const useWorkspaceId = () => {
  const { currentWorkspace } = useWorkspaceStore();
  return currentWorkspace?.workspace_id || null;
}; 
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

export function useWorkspaceQuery(options) {
  const { workspaceId, user, accessToken } = useSelector(state => state.auth);
  return useQuery({ ...options, queryKey: ['workspace', user?.id, workspaceId, ...options.queryKey], enabled: Boolean(accessToken && workspaceId) && options.enabled !== false });
}

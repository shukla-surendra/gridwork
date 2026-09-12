import { Badge } from "@chakra-ui/react";
import { labelForStatus, getStatusColor } from "../../utils/taskStatus";

export function StatusIndicator({ status }) {
  return <Badge colorScheme={getStatusColor(status)}>{labelForStatus(status)}</Badge>;
}

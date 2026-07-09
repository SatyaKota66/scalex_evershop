import { GridPagination } from '@components/admin/grid/GridPagination';
import { Badge } from '@components/common/ui/Badge.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { useAlertContext } from '@components/common/modal/Alert';
import { Button } from '@components/common/ui/Button.js';
import axios from 'axios';
import React, { useState } from 'react';

type BotReg = {
  uuid: string;
  botName: string;
  organizationName: string;
  contactEmail: string;
  status: string;
  intendedActions: string[];
  requestedPermissions: string[];
  createdAt: { text: string };
  viewUrl: string;
  updateApi: string;
};

type Collection = {
  items: BotReg[];
  total: number;
  currentFilters: { key: string; operation: string; value: string }[];
};

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, 'success' | 'destructive' | 'warning' | 'default'> = {
    approved: 'success',
    rejected: 'destructive',
    pending: 'warning'
  };
  return <Badge variant={variantMap[status] ?? 'default'}>{status}</Badge>;
}

function ApprovalActions({
  reg,
  onDone
}: {
  reg: BotReg;
  onDone: () => void;
}) {
  const { openAlert, closeAlert } = useAlertContext();
  const [loading, setLoading] = useState(false);

  const act = (status: string, note?: string) => {
    openAlert({
      heading: `${status === 'approved' ? 'Approve' : 'Reject'} "${reg.botName}"?`,
      content:
        status === 'approved'
          ? 'This will grant the bot access to the storefront APIs.'
          : 'This will deny the bot access to the storefront APIs.',
      primaryAction: {
        title: 'Cancel',
        onAction: closeAlert,
        variant: 'secondary'
      },
      secondaryAction: {
        title: status === 'approved' ? 'Approve' : 'Reject',
        variant: status === 'approved' ? 'default' : 'destructive',
        onAction: async () => {
          setLoading(true);
          try {
            await axios.patch(reg.updateApi, { status, admin_note: note ?? '' });
            closeAlert();
            onDone();
          } finally {
            setLoading(false);
          }
        }
      }
    });
  };

  if (reg.status !== 'pending') {
    return <span className="text-gray-400 text-xs italic">—</span>;
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="default" onClick={() => act('approved')} disabled={loading}>
        Approve
      </Button>
      <Button size="sm" variant="destructive" onClick={() => act('rejected')} disabled={loading}>
        Reject
      </Button>
    </div>
  );
}

interface Props {
  botRegistrations: Collection;
}

export default function BotRegistrationGrid({ botRegistrations }: Props) {
  const { items = [], total = 0, currentFilters = [] } = botRegistrations ?? {};
  const limit = 20;
  const page = parseInt(
    currentFilters.find((f) => f.key === 'page')?.value ?? '1',
    10
  );

  const refresh = () => window.location.reload();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot / Agent Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>Bot Name</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Contact Email</TableCell>
              <TableCell>Intended Actions</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((reg) => (
              <TableRow key={reg.uuid}>
                <TableCell>
                  <a
                    href={reg.viewUrl}
                    className="text-primary hover:underline font-medium"
                  >
                    {reg.botName}
                  </a>
                </TableCell>
                <TableCell>{reg.organizationName}</TableCell>
                <TableCell>{reg.contactEmail}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {reg.intendedActions.map((a) => (
                      <Badge key={a} variant="outline">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={reg.status} />
                </TableCell>
                <TableCell>{reg.createdAt?.text ?? '—'}</TableCell>
                <TableCell>
                  <ApprovalActions reg={reg} onDone={refresh} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {items.length === 0 && (
          <div className="flex w-full justify-center mt-6 text-gray-500">
            No bot registrations found
          </div>
        )}

        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    botRegistrations(filters: $filters) {
      items {
        uuid
        botName
        organizationName
        contactEmail
        status
        intendedActions
        requestedPermissions
        createdAt {
          text
        }
        viewUrl
        updateApi
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;

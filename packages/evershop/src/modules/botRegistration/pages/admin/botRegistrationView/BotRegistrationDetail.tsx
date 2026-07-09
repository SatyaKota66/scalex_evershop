import { Badge } from '@components/common/ui/Badge.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { Button } from '@components/common/ui/Button.js';
import { useAlertContext } from '@components/common/modal/Alert';
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

type BotReg = {
  uuid: string;
  botName: string;
  organizationName: string;
  contactEmail: string;
  purposeOfAccess: string;
  callbackUrl: string | null;
  allowedDomain: string | null;
  expectedUsagePattern: string | null;
  requestedPermissions: string[];
  intendedActions: string[];
  adminNote: string | null;
  apiKey: string | null;
  status: string;
  createdAt: { text: string } | null;
  updatedAt: { text: string } | null;
  updateApi: string;
};

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, 'success' | 'destructive' | 'warning' | 'default'> = {
    approved: 'success',
    rejected: 'destructive',
    pending: 'warning'
  };
  return (
    <Badge variant={variantMap[status] ?? 'default'} className="text-sm px-3 py-1">
      {status.toUpperCase()}
    </Badge>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 w-44 shrink-0 text-sm">{label}</span>
      <span className="text-sm font-medium break-words flex-1">{value ?? '—'}</span>
    </div>
  );
}

function PublicKeyPanel({ publicKey }: { publicKey: string }) {
  const [copied, setCopied] = useState(false);
  const encoded = btoa(publicKey);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="text-green-800 flex items-center gap-2">
          <span>🔑</span> {_('Bot Public Key (RSA-2048)')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-green-700 mb-3">
          {_('Share this public key with the bot owner. The bot uses it to obtain an access token.')}
        </p>

        {/* PEM (raw) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {_('Public Key PEM')}
            </span>
            <Button
              variant="secondary"
              onClick={() => copy(publicKey, 'PEM key')}
              className="h-7 text-xs px-2"
            >
              {copied ? '✓ Copied' : 'Copy PEM'}
            </Button>
          </div>
          <pre className="bg-white border border-green-200 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono max-h-48">
            {publicKey}
          </pre>
        </div>

        {/* Base64-encoded (for header) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {_('X-Bot-Key Header Value (base64)')}
            </span>
            <Button
              variant="secondary"
              onClick={() => copy(encoded, 'Header value')}
              className="h-7 text-xs px-2"
            >
              Copy Header Value
            </Button>
          </div>
          <pre className="bg-white border border-green-200 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono max-h-24">
            {encoded}
          </pre>
        </div>

        <div className="mt-4 p-3 bg-white border border-green-200 rounded text-xs text-gray-600">
          <p className="font-semibold mb-1">{_('Bot integration guide:')}</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>{_('Bot calls')} <code className="bg-gray-100 px-1 rounded">POST /api/bot/token</code> {_('with')} <code className="bg-gray-100 px-1 rounded">X-Bot-Key: {'<base64 value above>'}</code></li>
            <li>{_('Server returns a signed RS256 JWT valid for 1 hour.')}</li>
            <li>{_('Bot sends')} <code className="bg-gray-100 px-1 rounded">Authorization: Bearer {'<token>'}</code> {_('on every storefront request.')}</li>
            <li>{_('Server verifies the JWT using our stored public key — bot is auto-authenticated.')}</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  botRegistration: BotReg;
  gridUrl: string;
}

export default function BotRegistrationDetail({ botRegistration, gridUrl }: Props) {
  const { openAlert, closeAlert } = useAlertContext();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(botRegistration?.adminNote ?? '');
  const [currentStatus, setCurrentStatus] = useState(botRegistration?.status ?? 'pending');
  const [publicKey, setPublicKey] = useState<string | null>(botRegistration?.apiKey ?? null);

  if (!botRegistration) {
    return (
      <Card>
        <CardContent>
          <p className="text-red-500 py-4">Registration not found.</p>
        </CardContent>
      </Card>
    );
  }

  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await axios.patch(botRegistration.updateApi, { status, admin_note: note });
      setCurrentStatus(status);
      // On approval the API returns the generated public key
      if (status === 'approved' && res.data?.data?.publicKey) {
        setPublicKey(res.data.data.publicKey);
      }
      toast.success(`Registration ${status} successfully`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = (status: string) => {
    openAlert({
      heading: `${status === 'approved' ? 'Approve' : 'Reject'} this registration?`,
      content:
        status === 'approved'
          ? 'The bot will be granted an RSA key pair for authenticated access to the storefront.'
          : "The bot's access request will be denied.",
      primaryAction: {
        title: 'Cancel',
        onAction: closeAlert,
        variant: 'secondary'
      },
      secondaryAction: {
        title: status === 'approved' ? 'Approve' : 'Reject',
        variant: status === 'approved' ? 'default' : 'destructive',
        onAction: async () => {
          closeAlert();
          await updateStatus(status);
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <a href={gridUrl} className="text-primary hover:underline text-sm">
          ← {_('Back to Bot Registrations')}
        </a>
      </div>

      {/* Status card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{botRegistration.botName}</CardTitle>
          <StatusBadge status={currentStatus} />
        </CardHeader>
        <CardContent>
          <InfoRow label="Organization" value={botRegistration.organizationName} />
          <InfoRow label="Contact Email" value={botRegistration.contactEmail} />
          <InfoRow label="Submitted" value={botRegistration.createdAt?.text} />
          <InfoRow label="Last Updated" value={botRegistration.updatedAt?.text} />
        </CardContent>
      </Card>

      {/* Public key panel — visible when approved */}
      {currentStatus === 'approved' && publicKey && (
        <PublicKeyPanel publicKey={publicKey} />
      )}

      {/* Access details */}
      <Card>
        <CardHeader>
          <CardTitle>Access Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Purpose of Access" value={botRegistration.purposeOfAccess} />
          <InfoRow label="Callback URL" value={botRegistration.callbackUrl} />
          <InfoRow label="Allowed Domain" value={botRegistration.allowedDomain} />
          <InfoRow
            label="Expected Usage Pattern"
            value={botRegistration.expectedUsagePattern}
          />
        </CardContent>
      </Card>

      {/* Permissions & actions */}
      <Card>
        <CardHeader>
          <CardTitle>Requested Permissions &amp; Intended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow
            label="Requested Permissions"
            value={
              <div className="flex flex-wrap gap-1">
                {botRegistration.requestedPermissions.map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))}
              </div>
            }
          />
          <InfoRow
            label="Intended Actions"
            value={
              <div className="flex flex-wrap gap-1">
                {botRegistration.intendedActions.map((a) => (
                  <Badge key={a} variant="outline">
                    {a}
                  </Badge>
                ))}
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Admin approval panel */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">
              {_('Admin Note (optional)')}
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-2 text-sm resize-y min-h-[80px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={_('Add a note for this decision (visible internally only)')}
            />
          </div>

          {botRegistration.adminNote && currentStatus !== 'pending' && (
            <div className="mb-4 p-3 bg-gray-50 border rounded text-sm text-gray-700">
              <strong>Previous note:</strong> {botRegistration.adminNote}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={() => confirmAction('approved')}
              disabled={loading || currentStatus === 'approved'}
            >
              {_('Approve')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmAction('rejected')}
              disabled={loading || currentStatus === 'rejected'}
            >
              {_('Reject')}
            </Button>
            {currentStatus !== 'pending' && (
              <Button
                variant="secondary"
                onClick={() => updateStatus('pending')}
                disabled={loading}
              >
                {_('Reset to Pending')}
              </Button>
            )}
          </div>

          {currentStatus !== 'pending' && (
            <p className="text-xs text-gray-400 mt-3">
              {_('Current status:')} <strong>{currentStatus}</strong>.{' '}
              {_('You can change the decision at any time.')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query($uuid: String!) {
    botRegistration(uuid: $uuid) {
      uuid
      botName
      organizationName
      contactEmail
      purposeOfAccess
      callbackUrl
      allowedDomain
      expectedUsagePattern
      requestedPermissions
      intendedActions
      adminNote
      apiKey
      status
      createdAt {
        text
      }
      updatedAt {
        text
      }
      updateApi
    }
    gridUrl: url(routeId: "botRegistrationGrid")
  }
`;

export const variables = `
{
  uuid: getContextValue('botRegistrationUuid')
}`;

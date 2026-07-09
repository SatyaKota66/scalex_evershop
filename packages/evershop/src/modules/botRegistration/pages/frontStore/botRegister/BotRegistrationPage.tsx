import React, { useState } from 'react';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { UrlField } from '@components/common/form/UrlField.js';
import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { Card, CardContent } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { toast } from 'react-toastify';

interface Props {
  registerBotApiUrl: string;
}

const PERMISSION_OPTIONS = [
  { value: 'browse_catalog', label: 'Browse Catalog' },
  { value: 'search_products', label: 'Search Products' },
  { value: 'create_cart', label: 'Create Cart' },
  { value: 'initiate_checkout', label: 'Initiate Checkout' },
  { value: 'read_orders', label: 'Read Orders' },
  { value: 'manage_wishlist', label: 'Manage Wishlist' }
];

const ACTION_OPTIONS = [
  { value: 'browse', label: 'Browse' },
  { value: 'search', label: 'Search' },
  { value: 'cart_creation', label: 'Cart Creation' },
  { value: 'checkout_initiation', label: 'Checkout Initiation' }
];

type SubmittedData = {
  uuid: string;
  bot_name: string;
  status: string;
};

function extractCheckedKeys(
  formData: Record<string, unknown>,
  prefix: string,
  options: { value: string }[]
): string[] {
  return options
    .filter((opt) => formData[`${prefix}${opt.value}`] === true)
    .map((opt) => opt.value);
}

export default function BotRegistrationPage({ registerBotApiUrl }: Props) {
  const [submitted, setSubmitted] = useState<SubmittedData | null>(null);

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-2xl">
          <Card>
            <CardContent>
              <div className="flex flex-col items-center py-8 gap-4 text-center">
                <div className="text-5xl">✅</div>
                <h2 className="text-2xl font-semibold text-green-700">
                  {_('Registration Submitted!')}
                </h2>
                <p className="text-gray-600 max-w-md">
                  {_(
                    'Your bot registration has been received and is pending review. You will be notified at your contact email once it is approved.'
                  )}
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full max-w-sm text-left text-sm mt-2">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">{_('Bot Name')}</span>
                    <span className="font-medium">{submitted.bot_name}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">{_('Reference ID')}</span>
                    <span className="font-mono text-xs break-all">{submitted.uuid}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">{_('Status')}</span>
                    <span className="capitalize font-medium text-yellow-600">
                      {submitted.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">{_('Bot / Agent Registration')}</h1>
          <p className="text-gray-500">
            {_(
              'Register your AI agent, partner bot, or commerce agent before accessing the storefront APIs.'
            )}
          </p>
        </div>

        <Card>
          <CardContent>
            <Form
              id="botRegistrationForm"
              method="POST"
              onSubmit={async (formData) => {
                const requested_permissions = extractCheckedKeys(
                  formData as Record<string, unknown>,
                  'perm_',
                  PERMISSION_OPTIONS
                );
                const intended_actions = extractCheckedKeys(
                  formData as Record<string, unknown>,
                  'action_',
                  ACTION_OPTIONS
                );

                if (requested_permissions.length === 0) {
                  toast.error(_('Please select at least one permission'));
                  throw new Error('validation');
                }
                if (intended_actions.length === 0) {
                  toast.error(_('Please select at least one intended action'));
                  throw new Error('validation');
                }

                const payload = {
                  bot_name: (formData as any).bot_name,
                  organization_name: (formData as any).organization_name,
                  contact_email: (formData as any).contact_email,
                  purpose_of_access: (formData as any).purpose_of_access,
                  callback_url: (formData as any).callback_url || undefined,
                  allowed_domain: (formData as any).allowed_domain || undefined,
                  expected_usage_pattern:
                    (formData as any).expected_usage_pattern || undefined,
                  requested_permissions,
                  intended_actions
                };

                const response = await fetch(registerBotApiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.error) {
                  toast.error(result.error.message);
                  throw new Error(result.error.message);
                }

                setSubmitted(result.data);
              }}
              submitBtnText={_('Submit Registration')}
            >
              {/* Identity */}
              <section className="mb-6">
                <h2 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">
                  {_('Bot Identity')}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField
                    name="bot_name"
                    label={_('Bot / Agent Name')}
                    required
                    placeholder={_('e.g. ShopAssistantBot')}
                    validation={{ required: _('Bot name is required') }}
                  />
                  <InputField
                    name="organization_name"
                    label={_('Organization Name')}
                    required
                    placeholder={_('e.g. Acme Corp')}
                    validation={{ required: _('Organization name is required') }}
                  />
                </div>
                <div className="mt-4">
                  <EmailField
                    name="contact_email"
                    label={_('Contact Email')}
                    required
                    placeholder={_('contact@yourorg.com')}
                    validation={{
                      required: _('Contact email is required'),
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: _('Enter a valid email address')
                      }
                    }}
                  />
                </div>
              </section>

              {/* Access Details */}
              <section className="mb-6">
                <h2 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">
                  {_('Access Details')}
                </h2>
                <TextareaField
                  name="purpose_of_access"
                  label={_('Purpose of Access')}
                  required
                  placeholder={_(
                    'Describe why your bot needs access to the storefront (e.g. automated price monitoring, AI shopping assistant).'
                  )}
                  validation={{ required: _('Purpose of access is required') }}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                  <UrlField
                    name="callback_url"
                    label={_('Callback URL')}
                    placeholder={_('https://yourbot.example.com/callback')}
                  />
                  <InputField
                    name="allowed_domain"
                    label={_('Allowed Domain')}
                    placeholder={_('yourbot.example.com')}
                  />
                </div>
                <div className="mt-4">
                  <TextareaField
                    name="expected_usage_pattern"
                    label={_('Expected Usage Pattern')}
                    placeholder={_(
                      'Describe request frequency, peak hours, data volumes, etc.'
                    )}
                  />
                </div>
              </section>

              {/* Permissions */}
              <section className="mb-6">
                <h2 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">
                  {_('Requested Permissions')}
                </h2>
                <p className="text-sm text-gray-500 mb-3">
                  {_('Select all permissions your bot requires:')}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PERMISSION_OPTIONS.map((opt) => (
                    <CheckboxField
                      key={opt.value}
                      name={`perm_${opt.value}`}
                      label={_(opt.label)}
                    />
                  ))}
                </div>
              </section>

              {/* Intended Actions */}
              <section className="mb-6">
                <h2 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">
                  {_('Intended Actions')}
                </h2>
                <p className="text-sm text-gray-500 mb-3">
                  {_('Select all actions your bot intends to perform:')}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ACTION_OPTIONS.map((opt) => (
                    <CheckboxField
                      key={opt.value}
                      name={`action_${opt.value}`}
                      label={_(opt.label)}
                    />
                  ))}
                </div>
              </section>

              <p className="text-xs text-gray-400 mt-2">
                {_(
                  'By submitting this form you agree that your bot will operate within the approved scope. Misuse may result in access revocation.'
                )}
              </p>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    registerBotApiUrl: url(routeId: "registerBot")
  }
`;

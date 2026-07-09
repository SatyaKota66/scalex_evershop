import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { Bot } from 'lucide-react';
import React from 'react';

interface Props {
  botRegistrationGrid: string;
}

export default function BotRegistrationMenuGroup({ botRegistrationGrid }: Props) {
  return (
    <NavigationItemGroup
      id="botRegistrationMenuGroup"
      name="Bots & Agents"
      items={[
        {
          Icon: Bot,
          url: botRegistrationGrid,
          title: 'Bot Registrations'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 45
};

export const query = `
  query Query {
    botRegistrationGrid: url(routeId: "botRegistrationGrid")
  }
`;

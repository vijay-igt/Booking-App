import type { Meta, StoryObj } from '@storybook/react';
import { Table, THead, TBody, TR, TH, TD } from './Table';

const meta: Meta<typeof Table> = {
  title: 'Components/Table',
  component: Table,
  args: {
    children: (
      <>
        <THead>
          <TR>
            <TH>User</TH>
            <TH>Role</TH>
            <TH className="text-right">Bookings</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>Alex Johnson</TD>
            <TD>Admin</TD>
            <TD className="text-right">142</TD>
          </TR>
          <TR>
            <TD>Riya Mehta</TD>
            <TD>User</TD>
            <TD className="text-right">18</TD>
          </TR>
        </TBody>
      </>
    )
  }
};

export default meta;

type Story = StoryObj<typeof Table>;

export const Default: Story = {};


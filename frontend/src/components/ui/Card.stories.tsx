import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  args: {
    children: (
      <div className="p-6 space-y-2">
        <h3 className="text-lg font-semibold">Premium Cinema Card</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Use cards to group related content such as movie details, pricing, or settings.
        </p>
      </div>
    )
  }
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {};


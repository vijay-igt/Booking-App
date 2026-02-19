import type { Meta, StoryObj } from '@storybook/react';
import { Mail } from 'lucide-react';
import { TextField } from './TextField';

const meta: Meta<typeof TextField> = {
  title: 'Components/TextField',
  component: TextField,
  args: {
    label: 'Email',
    placeholder: 'you@example.com'
  }
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Default: Story = {
  args: {
    icon: <Mail className="w-5 h-5" />
  }
};

export const WithHint: Story = {
  args: {
    icon: <Mail className="w-5 h-5" />,
    hint: 'We will send booking confirmations to this email.'
  }
};

export const ErrorState: Story = {
  args: {
    icon: <Mail className="w-5 h-5" />,
    error: 'Please enter a valid email address.'
  }
};


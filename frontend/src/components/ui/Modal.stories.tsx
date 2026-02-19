import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal
};

export default meta;

type Story = StoryObj<typeof Modal>;

const ModalPlayground = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-[320px] flex items-center justify-center">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sample modal">
        <p className="text-sm text-[var(--text-secondary)]">
          Use modals sparingly for focused tasks such as confirming actions or editing a small amount of data.
        </p>
      </Modal>
    </div>
  );
};

export const Default: Story = {
  render: () => <ModalPlayground />
};

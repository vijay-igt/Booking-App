import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    backgrounds: {
      default: 'cine-dark',
      values: [
        { name: 'cine-dark', value: '#0A0A0A' },
        { name: 'card', value: '#1A1A1A' },
        { name: 'light', value: '#F9FAFB' }
      ]
    },
    options: {
      storySort: {
        order: ['Foundations', 'Components', 'Screens']
      }
    }
  }
};

export default preview;


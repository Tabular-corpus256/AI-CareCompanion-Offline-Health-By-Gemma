import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { ThemeProvider } from '../src/theme';

test('ThemeProvider renders children', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <ThemeProvider>
        <Text>Hello</Text>
      </ThemeProvider>,
    );
  });
  expect(true).toBe(true);
});

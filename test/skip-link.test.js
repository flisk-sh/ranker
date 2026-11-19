import { expect, test } from 'bun:test';
import { shell } from '../src/page';

const skip = '<a class="skip-link" href="#main">Skip to content</a>';

test('the skip link is the first focusable element in the body', () => {
  const html = shell('Test', '<p>Content</p>');
  expect(html).toContain(`<body>${skip}`);
  expect(html.indexOf(skip)).toBeLessThan(html.indexOf('<main id="main">'));
});

test('the main content is the skip link target', () => {
  const html = shell('Test', '<p>Content</p>');
  expect(html).toContain('<main id="main"><p>Content</p></main>');
});

test('the skip link is hidden until focused', () => {
  const html = shell('Test', 'body');
  expect(html).toContain('.skip-link{position:absolute;left:-9999px');
  expect(html).toContain('.skip-link:focus{left:12px;top:12px');
});

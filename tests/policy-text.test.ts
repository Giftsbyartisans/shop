import test from 'node:test';
import assert from 'node:assert/strict';
import { policyBody } from '../src/lib/policy-text';
test('removes duplicated opening title including markdown headings', () => {
  assert.equal(policyBody('Privacy Policy', 'Privacy Policy\n\nWe protect your data.'), 'We protect your data.');
  assert.equal(policyBody('Privacy Policy', '## **Privacy Policy**\n\nWe protect your data.'), 'We protect your data.');
});
test('preserves body sentences and unrelated headings', () => {
  assert.equal(policyBody('Privacy Policy', 'Privacy Policy applies to this website.'), 'Privacy Policy applies to this website.');
  assert.equal(policyBody('Privacy Policy', 'Data we collect\nInformation.'), 'Data we collect\nInformation.');
});

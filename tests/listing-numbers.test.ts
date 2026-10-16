import assert from 'node:assert/strict';
import test from 'node:test';
import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { listingNumber } from '../amplify/functions/shop-api/listing-numbers';

test('assigned listing numbers are reused without generating replacements', async (t) => {
  const db = new DynamoDBClient({});
  t.mock.method(db, 'send', async () => ({ Item: { publicId: { S: '654321' } } }));
  assert.equal(await listingNumber('uuid', db, 'numbers', () => { throw new Error('must reuse saved number'); }), '654321');
});

test('allocation atomically reserves both directions and retries collisions', async (t) => {
  const db = new DynamoDBClient({});
  let attempts = 0;
  t.mock.method(db, 'send', async (command: unknown) => {
    if (command instanceof GetItemCommand) return {};
    assert.ok(command instanceof TransactWriteItemsCommand);
    assert.equal(command.input.TransactItems?.length, 2);
    for (const write of command.input.TransactItems!) assert.equal(write.Put?.ConditionExpression, 'attribute_not_exists(id)');
    if (++attempts === 1) throw Object.assign(new Error('Already reserved'), { name: 'TransactionCanceledException' });
    return {};
  });
  let number = 123455;
  assert.equal(await listingNumber('uuid', db, 'numbers', () => String(++number)), '123457');
  assert.equal(attempts, 2);
});

test('concurrent allocations return the winning stored number', async (t) => {
  const db = new DynamoDBClient({});
  let reads = 0;
  t.mock.method(db, 'send', async (command: unknown) => {
    if (command instanceof GetItemCommand) return ++reads === 1 ? {} : { Item: { publicId: { S: '222222' } } };
    throw Object.assign(new Error('Concurrent assignment'), { name: 'TransactionCanceledException' });
  });
  assert.equal(await listingNumber('uuid', db, 'numbers', () => '111111'), '222222');
});

import { randomInt } from 'node:crypto';
import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';

export async function listingNumber(listingId: string, db: DynamoDBClient, table: string | undefined, candidate = () => String(randomInt(100000, 1000000))): Promise<string> {
  const key = { id: { S: `listing:${listingId}` } };
  const existing = async () => {
    const result = await db.send(new GetItemCommand({ TableName: table, Key: key, ConsistentRead: true }));
    return result.Item?.publicId?.S;
  };
  const saved = await existing();
  if (saved) return saved;
  for (let attempt = 0; attempt < 30; attempt++) {
    const publicId = candidate();
    if (!/^[1-9]\d{5}$/.test(publicId)) throw new Error('Invalid listing number.');
    try {
      await db.send(new TransactWriteItemsCommand({ TransactItems: [
        { Put: { TableName: table, Item: { ...key, publicId: { S: publicId } }, ConditionExpression: 'attribute_not_exists(id)' } },
        { Put: { TableName: table, Item: { id: { S: `number:${publicId}` }, listingId: { S: listingId } }, ConditionExpression: 'attribute_not_exists(id)' } },
      ] }));
      return publicId;
    } catch (cause) {
      // A simultaneous request may have numbered this listing, or another
      // listing may already own the candidate. Never overwrite either mapping.
      if (!(cause instanceof Error) || cause.name !== 'TransactionCanceledException') throw cause;
      const assigned = await existing();
      if (assigned) return assigned;
    }
  }
  throw new Error('Could not assign a unique listing number. Please retry.');
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { csvToObjects, objectsToCsv } from '../src/csv.mjs';

test('CSV round trips quoted commas and quotes', () => {
  const rows = [
    {
      id: 'one',
      body_copy: 'A useful line, with a comma and "quoted" word'
    }
  ];

  const csv = objectsToCsv(rows, ['id', 'body_copy']);
  const parsed = csvToObjects(csv);

  assert.equal(parsed[0].id, 'one');
  assert.equal(parsed[0].body_copy, 'A useful line, with a comma and "quoted" word');
});

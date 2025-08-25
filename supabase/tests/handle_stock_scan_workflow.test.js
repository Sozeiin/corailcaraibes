import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Ensure that the latest handle_stock_scan_workflow migration does not insert into total_cost
// which is a generated column in component_purchase_history

test('component_purchase_history inserts omit total_cost', () => {
  const filePath = path.join('supabase', 'migrations', '20250915120000_update_handle_stock_scan_workflow.sql');
  const sql = fs.readFileSync(filePath, 'utf-8');
  const inserts = [...sql.matchAll(/INSERT INTO\s+public\.component_purchase_history\s*\(([^)]+)\)/gi)];
  assert.ok(inserts.length > 0, 'No insert into component_purchase_history found');
  for (const match of inserts) {
    const columns = match[1].toLowerCase();
    assert.ok(!columns.includes('total_cost'), 'total_cost column should be omitted from inserts');
  }
});

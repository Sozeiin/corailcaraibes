import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

// Web platform initialization
let isWebInitialized = false;

async function initializeWebSQLite(): Promise<void> {
  if (!Capacitor.isNativePlatform() && !isWebInitialized) {
    try {
      // Import jeep-sqlite web component for web platform
      const jeepSqlite = await import('jeep-sqlite/dist/components/jeep-sqlite');
      await customElements.whenDefined('jeep-sqlite');
      
      // Initialize web store
      const jeepSqliteEl = document.createElement('jeep-sqlite') as any;
      document.body.appendChild(jeepSqliteEl);
      
      await jeepSqliteEl.initWebStore();
      isWebInitialized = true;
      console.log('Web SQLite initialized successfully');
    } catch (error) {
      console.warn('Web SQLite initialization failed, falling back to memory storage:', error);
    }
  }
}

class SQLiteService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private readonly dbName = 'corail_caraibes_offline.db';
  private readonly dbVersion = 1;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initialize(): Promise<void> {
    try {
      // Initialize web platform if needed
      await initializeWebSQLite();
      
      if (Capacitor.isNativePlatform()) {
        // Check if platform is supported
        const platform = Capacitor.getPlatform();
        const isSupported = await this.sqlite.isSecretStored();
        
        if (!isSupported && platform === 'ios') {
          await this.sqlite.saveToStore(this.dbName);
        }
      }

      // Open database connection
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false, // encrypted
        'no-encryption',
        this.dbVersion,
        false // readonly
      );

      await this.db.open();
      await this.createTables();
      
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Sync metadata table
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
        pending_changes INTEGER DEFAULT 0
      );`,

      // Offline boats table
      `CREATE TABLE IF NOT EXISTS offline_boats (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        model TEXT NOT NULL,
        serial_number TEXT NOT NULL,
        year INTEGER NOT NULL,
        status TEXT DEFAULT 'available',
        base_id TEXT,
        next_maintenance DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Offline interventions table
      `CREATE TABLE IF NOT EXISTS offline_interventions (
        id TEXT PRIMARY KEY,
        boat_id TEXT,
        technician_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'scheduled',
        intervention_type TEXT DEFAULT 'maintenance',
        scheduled_date DATE,
        scheduled_time TIME DEFAULT '09:00:00',
        completed_date DATE,
        base_id TEXT,
        component_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Offline stock items table
      `CREATE TABLE IF NOT EXISTS offline_stock_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        reference TEXT,
        category TEXT,
        quantity INTEGER DEFAULT 0,
        min_threshold INTEGER DEFAULT 1,
        unit TEXT DEFAULT 'pièce',
        location TEXT,
        base_id TEXT,
        last_purchase_date DATE,
        last_purchase_cost DECIMAL(10,2),
        last_supplier_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Offline orders table
      `CREATE TABLE IF NOT EXISTS offline_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL,
        supplier_id TEXT,
        status TEXT DEFAULT 'draft',
        order_date DATE,
        expected_delivery DATE,
        delivery_date DATE,
        total_amount DECIMAL(10,2) DEFAULT 0,
        base_id TEXT,
        requested_by TEXT,
        is_purchase_request BOOLEAN DEFAULT false,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Offline order items table
      `CREATE TABLE IF NOT EXISTS offline_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        product_name TEXT NOT NULL,
        reference TEXT,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) DEFAULT 0,
        total_price DECIMAL(10,2),
        stock_item_id TEXT,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Offline bases table
      `CREATE TABLE IF NOT EXISTS offline_bases (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        phone TEXT,
        email TEXT,
        manager TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Offline suppliers table
      `CREATE TABLE IF NOT EXISTS offline_suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        base_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Offline boat components table
      `CREATE TABLE IF NOT EXISTS offline_boat_components (
        id TEXT PRIMARY KEY,
        boat_id TEXT,
        name TEXT NOT NULL,
        component_type TEXT,
        status TEXT DEFAULT 'operational',
        installation_date DATE,
        last_service_date DATE,
        base_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Offline maintenance tasks table
      `CREATE TABLE IF NOT EXISTS offline_maintenance_tasks (
        id TEXT PRIMARY KEY,
        component_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        frequency TEXT,
        last_performed DATE,
        next_due DATE,
        base_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Sync conflicts table
      `CREATE TABLE IF NOT EXISTS sync_conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        local_data TEXT,
        remote_data TEXT,
        conflict_type TEXT NOT NULL,
        resolution_strategy TEXT,
        resolved INTEGER DEFAULT 0,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // Pending changes queue
      `CREATE TABLE IF NOT EXISTS pending_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
        data TEXT, -- JSON string of the record data
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
      );`
    ];

    for (const tableSQL of tables) {
      await this.db.execute(tableSQL);
    }

    // Initialize sync metadata
    const syncTables = [
      'boats',
      'interventions',
      'stock_items',
      'orders',
      'order_items',
      'bases',
      'suppliers',
      'boat_components',
      'maintenance_tasks'
    ];
    for (const tableName of syncTables) {
      await this.db.run(
        `INSERT OR IGNORE INTO sync_metadata (table_name) VALUES (?)`,
        [tableName]
      );
    }
  }

  async getDatabase(): Promise<SQLiteDBConnection> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  // Generic CRUD operations with automatic sync status management
  async insert(table: string, data: any): Promise<string> {
    const db = await this.getDatabase();
    const id = data.id || this.generateUUID();
    const now = new Date().toISOString();
    const tableName = `offline_${table}`;

    const dataWithSync: any = {
      ...data,
      id,
      sync_status: 'pending',
      last_modified: now
    };

    if (await this.hasColumn(tableName, 'created_at') && !('created_at' in dataWithSync)) {
      dataWithSync.created_at = now;
    }
    if (await this.hasColumn(tableName, 'updated_at') && !('updated_at' in dataWithSync)) {
      dataWithSync.updated_at = now;
    }

    const columns = Object.keys(dataWithSync);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(dataWithSync);

    await db.run(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    // Add to pending changes queue
    await this.addPendingChange(table, id, 'INSERT', dataWithSync);

    return id;
  }

  async update(table: string, id: string, data: any): Promise<void> {
    const db = await this.getDatabase();
    const now = new Date().toISOString();
    const tableName = `offline_${table}`;

    const dataWithSync: any = {
      ...data,
      sync_status: 'pending',
      last_modified: now
    };

    if (await this.hasColumn(tableName, 'updated_at') && !('updated_at' in dataWithSync)) {
      dataWithSync.updated_at = now;
    }

    const setClause = Object.keys(dataWithSync)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(dataWithSync), id];

    await db.run(
      `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
      values
    );

    // Add to pending changes queue
    await this.addPendingChange(table, id, 'UPDATE', dataWithSync);
  }

  async delete(table: string, id: string): Promise<void> {
    const db = await this.getDatabase();

    await db.run(`DELETE FROM offline_${table} WHERE id = ?`, [id]);

    // Add to pending changes queue
    await this.addPendingChange(table, id, 'DELETE', { id });
  }

  async findAll(table: string, baseId?: string): Promise<any[]> {
    const db = await this.getDatabase();

    let query = `SELECT * FROM offline_${table}`;
    let params: any[] = [];

    if (baseId) {
      query += ' WHERE base_id = ?';
      params = [baseId];
    }

    if (await this.hasColumn(`offline_${table}`, 'created_at')) {
      query += ' ORDER BY created_at DESC';
    }

    const result = await db.query(query, params);
    return result.values || [];
  }

  async findById(table: string, id: string): Promise<any | null> {
    const db = await this.getDatabase();
    
    const result = await db.query(
      `SELECT * FROM offline_${table} WHERE id = ?`,
      [id]
    );
    
    return result.values?.[0] || null;
  }

  private async addPendingChange(table: string, recordId: string, operation: string, data: any): Promise<void> {
    const db = await this.getDatabase();
    
    await db.run(
      `INSERT INTO pending_changes (table_name, record_id, operation, data) VALUES (?, ?, ?, ?)`,
      [table, recordId, operation, JSON.stringify(data)]
    );
  }

  async getPendingChanges(): Promise<any[]> {
    const db = await this.getDatabase();
    
    const result = await db.query(
      `SELECT * FROM pending_changes ORDER BY timestamp ASC`
    );
    
    return result.values || [];
  }

  async clearPendingChange(changeId: number): Promise<void> {
    const db = await this.getDatabase();
    
    await db.run(`DELETE FROM pending_changes WHERE id = ?`, [changeId]);
  }

  async markSyncError(changeId: number, errorMessage: string): Promise<void> {
    const db = await this.getDatabase();

    await db.run(
      `UPDATE pending_changes SET retry_count = retry_count + 1, error_message = ? WHERE id = ?`,
      [errorMessage, changeId]
    );
  }

  private async hasColumn(table: string, column: string): Promise<boolean> {
    const db = await this.getDatabase();
    const result = await db.query(`PRAGMA table_info(${table})`);
    return result.values?.some((row: any) => row.name === column) ?? false;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async getLastSyncTime(table: string): Promise<Date | null> {
    const db = await this.getDatabase();
    
    const result = await db.query(
      `SELECT last_sync FROM sync_metadata WHERE table_name = ?`,
      [table]
    );
    
    const lastSync = result.values?.[0]?.last_sync;
    return lastSync ? new Date(lastSync) : null;
  }

  async updateLastSyncTime(table: string): Promise<void> {
    const db = await this.getDatabase();
    
    await db.run(
      `UPDATE sync_metadata SET last_sync = CURRENT_TIMESTAMP WHERE table_name = ?`,
      [table]
    );
  }

  // Conflict management methods
  async createConflict(table: string, recordId: string, localData: any, remoteData: any, conflictType: string): Promise<void> {
    const db = await this.getDatabase();
    await db.run(
      'INSERT INTO sync_conflicts (table_name, record_id, local_data, remote_data, conflict_type) VALUES (?, ?, ?, ?, ?)',
      [table, recordId, JSON.stringify(localData), JSON.stringify(remoteData), conflictType]
    );
  }

  async getConflicts(): Promise<any[]> {
    const db = await this.getDatabase();
    const result = await db.query('SELECT * FROM sync_conflicts WHERE resolved = 0');
    return result.values || [];
  }

  async resolveConflict(conflictId: number, resolutionStrategy: string, resolvedData?: any): Promise<void> {
    const db = await this.getDatabase();
    await db.run(
      'UPDATE sync_conflicts SET resolved = 1, resolution_strategy = ?, resolved_at = ? WHERE id = ?',
      [resolutionStrategy, Date.now(), conflictId]
    );
  }

  async optimizeDatabase(): Promise<void> {
    const db = await this.getDatabase();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    await db.run('DELETE FROM sync_conflicts WHERE resolved = 1 AND resolved_at < ?', [thirtyDaysAgo]);
    await db.run('DELETE FROM pending_changes WHERE retry_count > 5');
    await db.run('VACUUM');
  }
}

export const sqliteService = new SQLiteService();
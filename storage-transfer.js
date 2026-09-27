(function (root, factory) {
  const storageTransfer = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = storageTransfer;
  }

  if (root) {
    root.PayrollStorageTransfer = storageTransfer;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const APP_ID = "payroll-estimator";
  const SCHEMA_VERSION = 1;
  const APP_KEY_PREFIXES = ["payroll-", "settings-"];
  const APP_EXACT_KEYS = new Set([
    "payrollTheme",
    "payrollInputCollapsed",
    "payrollSummaryCollapsed",
    "lastViewedMonth",
    "lastViewedYear"
  ]);

  function isAppStorageKey(key) {
    return APP_EXACT_KEYS.has(key) || APP_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
  }

  function listAppStorageKeys(storage) {
    const keys = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key && isAppStorageKey(key)) keys.push(key);
    }
    return keys.sort();
  }

  function createBackup(storage, exportedAt = new Date()) {
    const data = {};
    listAppStorageKeys(storage).forEach(key => {
      const value = storage.getItem(key);
      if (value !== null) data[key] = value;
    });

    return {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: exportedAt.toISOString(),
      data
    };
  }

  function parseAndValidateBackup(input) {
    let backup;
    try {
      backup = typeof input === "string" ? JSON.parse(input) : input;
    } catch (error) {
      throw new Error("ไฟล์ไม่ใช่ JSON ที่ถูกต้อง");
    }

    if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
      throw new Error("รูปแบบไฟล์สำรองไม่ถูกต้อง");
    }
    if (backup.app !== APP_ID) {
      throw new Error("ไฟล์นี้ไม่ได้มาจากแอปคำนวณเงินเดือน");
    }
    if (backup.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`ยังไม่รองรับไฟล์สำรองเวอร์ชัน ${backup.schemaVersion}`);
    }
    if (!backup.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
      throw new Error("ไฟล์สำรองไม่มีข้อมูลที่ใช้งานได้");
    }

    const entries = Object.entries(backup.data);
    if (entries.length > 10000) {
      throw new Error("ไฟล์สำรองมีรายการมากเกินไป");
    }
    for (const [key, value] of entries) {
      if (!isAppStorageKey(key) || typeof value !== "string") {
        throw new Error("ไฟล์สำรองมีรายการที่ไม่ใช่ข้อมูลของแอป");
      }
    }

    return {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: typeof backup.exportedAt === "string" ? backup.exportedAt : null,
      data: Object.fromEntries(entries)
    };
  }

  function restoreBackup(storage, input, options = {}) {
    const backup = parseAndValidateBackup(input);
    const replace = options.replace !== false;
    const previousData = {};
    listAppStorageKeys(storage).forEach(key => {
      const value = storage.getItem(key);
      if (value !== null) previousData[key] = value;
    });

    try {
      if (replace) {
        listAppStorageKeys(storage).forEach(key => storage.removeItem(key));
      }
      Object.entries(backup.data).forEach(([key, value]) => storage.setItem(key, value));
    } catch (error) {
      // Roll back only this app's keys; never touch storage belonging to another app.
      listAppStorageKeys(storage).forEach(key => storage.removeItem(key));
      Object.entries(previousData).forEach(([key, value]) => storage.setItem(key, value));
      throw new Error("นำเข้าข้อมูลไม่สำเร็จ และคืนข้อมูลเดิมให้แล้ว");
    }

    return {
      restoredKeys: Object.keys(backup.data).length,
      exportedAt: backup.exportedAt
    };
  }

  return {
    APP_ID,
    SCHEMA_VERSION,
    isAppStorageKey,
    listAppStorageKeys,
    createBackup,
    parseAndValidateBackup,
    restoreBackup
  };
});

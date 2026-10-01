const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createBackup,
  parseAndValidateBackup,
  restoreBackup
} = require("../storage-transfer.js");

class MemoryStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("สำรองเฉพาะข้อมูลของแอป", () => {
  const storage = new MemoryStorage({
    "payroll-2026-8": "[]",
    "settings-2026-8": "{}",
    "actual-slip-2026-8": JSON.stringify({
      gross: 22000,
      deductions: 750,
      net: 21250,
      estimatedGross: 21980,
      estimatedDeductions: 750,
      estimatedNet: 21230,
      note: "รายการย้อนหลัง"
    }),
    payrollTheme: "forest",
    unrelatedApp: "keep-private"
  });
  const backup = createBackup(storage, new Date("2026-09-27T12:00:00.000Z"));

  assert.deepEqual(backup, {
    app: "payroll-estimator",
    schemaVersion: 1,
    exportedAt: "2026-09-27T12:00:00.000Z",
    data: {
      "actual-slip-2026-8": JSON.stringify({
        gross: 22000,
        deductions: 750,
        net: 21250,
        estimatedGross: 21980,
        estimatedDeductions: 750,
        estimatedNet: 21230,
        note: "รายการย้อนหลัง"
      }),
      "payroll-2026-8": "[]",
      payrollTheme: "forest",
      "settings-2026-8": "{}"
    }
  });
});

test("นำเข้าทดแทนเฉพาะข้อมูล Payrolls", () => {
  const storage = new MemoryStorage({
    "payroll-2026-8": "[]",
    unrelatedApp: "untouched"
  });
  const result = restoreBackup(storage, {
    app: "payroll-estimator",
    schemaVersion: 1,
    exportedAt: "2026-09-27T12:00:00.000Z",
    data: { "payroll-2026-9": "[]" }
  });

  assert.equal(result.restoredKeys, 1);
  assert.equal(storage.getItem("payroll-2026-8"), null);
  assert.equal(storage.getItem("payroll-2026-9"), "[]");
  assert.equal(storage.getItem("unrelatedApp"), "untouched");
});

test("ปฏิเสธ JSON ที่เสีย", () => {
  assert.throws(() => parseAndValidateBackup("{"), /JSON/);
});

test("ปฏิเสธไฟล์จากแอปอื่น", () => {
  assert.throws(() => parseAndValidateBackup({
    app: "other-app",
    schemaVersion: 1,
    data: {}
  }), /ไม่ได้มาจากแอป/);
});

test("ปฏิเสธ schema version ที่ไม่รองรับ", () => {
  assert.throws(() => parseAndValidateBackup({
    app: "payroll-estimator",
    schemaVersion: 2,
    data: {}
  }), /เวอร์ชัน 2/);
});

test("ปฏิเสธ key ที่ไม่ใช่ข้อมูล Payrolls", () => {
  assert.throws(() => parseAndValidateBackup({
    app: "payroll-estimator",
    schemaVersion: 1,
    data: { password: "do-not-import" }
  }), /ไม่ใช่ข้อมูลของแอป/);
});

test("คืนข้อมูลเดิมเมื่อนำเข้าไม่สำเร็จ", () => {
  class FailingStorage extends MemoryStorage {
    constructor(values) {
      super(values);
      this.failNextWrite = true;
    }
    setItem(key, value) {
      if (this.failNextWrite && key === "payroll-2026-9") {
        this.failNextWrite = false;
        throw new Error("Quota exceeded");
      }
      super.setItem(key, value);
    }
  }

  const storage = new FailingStorage({
    "payroll-2026-8": "original",
    unrelatedApp: "untouched"
  });

  assert.throws(() => restoreBackup(storage, {
    app: "payroll-estimator",
    schemaVersion: 1,
    data: { "payroll-2026-9": "[]" }
  }), /คืนข้อมูลเดิมให้แล้ว/);
  assert.equal(storage.getItem("payroll-2026-8"), "original");
  assert.equal(storage.getItem("payroll-2026-9"), null);
  assert.equal(storage.getItem("unrelatedApp"), "untouched");
});

test("ปฏิเสธข้อมูลวันทำงานที่ JSON เสีย", () => {
  assert.throws(() => parseAndValidateBackup({
    app: "payroll-estimator",
    schemaVersion: 1,
    data: { "payroll-2026-8": "not-json" }
  }), /วันทำงาน/);
});

test("ปฏิเสธข้อมูลวันทำงานที่ไม่มีวันที่ถูกต้อง", () => {
  assert.throws(() => parseAndValidateBackup({
    app: "payroll-estimator",
    schemaVersion: 1,
    data: { "payroll-2026-8": JSON.stringify([{ status: "วันทำงาน" }]) }
  }), /วันทำงาน/);
});

test("ปฏิเสธการตั้งค่าที่ไม่ใช่ออบเจ็กต์", () => {
  assert.throws(() => parseAndValidateBackup({
    app: "payroll-estimator",
    schemaVersion: 1,
    data: { "settings-2026-8": "[]" }
  }), /การตั้งค่า/);
});

test("สำรองและตรวจสอบข้อมูลสลิปจริงแยกตามงวด", () => {
  const slip = JSON.stringify({
    gross: 22000,
    deductions: 750,
    net: 21250,
    estimatedGross: 21980,
    estimatedDeductions: 750,
    estimatedNet: 21230,
    note: "โบนัส"
  });
  const backup = parseAndValidateBackup({
    app: "payroll-estimator",
    schemaVersion: 1,
    data: { "actual-slip-2026-8": slip }
  });

  assert.equal(backup.data["actual-slip-2026-8"], slip);
});

test("ปฏิเสธข้อมูลสลิปจริงที่ยอดสุทธิไม่ถูกต้อง", () => {
  assert.throws(() => parseAndValidateBackup({
    app: "payroll-estimator",
    schemaVersion: 1,
    data: { "actual-slip-2026-8": JSON.stringify({ net: -1 }) }
  }), /สลิปจริง/);
});

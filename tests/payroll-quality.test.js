const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePeriod, describeMoneyDifference } = require("../payroll-quality.js");

test("สรุปจำนวนวันที่ลงข้อมูลและวันที่ยังขาด", () => {
  const result = analyzePeriod([
    { date: "2026-10-01", status: "วันทำงาน", normalHours: 8, otHours: 0 },
    { date: "2026-10-02", status: "ขาดงาน", normalHours: 0, otHours: 0 },
    { date: "2026-10-03", status: "", normalHours: 0, otHours: 0 }
  ], { hasActualSlip: true });

  assert.equal(result.completedDays, 2);
  assert.equal(result.totalDays, 3);
  assert.deepEqual(result.missingDates, ["2026-10-03"]);
  assert.deepEqual(result.issues.map(issue => issue.code), ["missing-status"]);
});

test("ตรวจวันทำงานไม่มีชั่วโมงและ OT ที่ไม่มีสถานะ", () => {
  const result = analyzePeriod([
    { date: "2026-10-01", status: "วันทำงาน", normalHours: 0, otHours: 0 },
    { date: "2026-10-02", status: "", normalHours: 0, otHours: 2.51 }
  ], { hasActualSlip: false });

  assert.deepEqual(result.issues.map(issue => issue.code), [
    "missing-status",
    "work-without-hours",
    "ot-without-status",
    "missing-actual-slip"
  ]);
});

test("อธิบายผลต่างสลิปด้วยภาษาที่อ่านง่าย", () => {
  assert.equal(describeMoneyDifference(20125, 20000, "ยอดสุทธิ"), "ยอดสุทธิตามสลิปจริงมากกว่าที่คำนวณ 125.00 บาท");
  assert.equal(describeMoneyDifference(19900, 20000, "ยอดสุทธิ"), "ยอดสุทธิตามสลิปจริงน้อยกว่าที่คำนวณ 100.00 บาท");
  assert.equal(describeMoneyDifference(20000, 20000, "ยอดสุทธิ"), "ยอดสุทธิตามสลิปจริงตรงกับที่คำนวณ");
});

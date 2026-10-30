const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePayroll } = require("../payroll-engine.js");
const { buildYearSummary, resolveYearSelection } = require("../payroll-yearly.js");

const settings = {
  DAILY_WAGE: 400,
  HOURLY_WAGE: 50,
  OT_RATE_1: 1,
  OT_RATE_15: 1.5,
  OT_RATE_2: 2,
  OT_RATE_3: 3,
  NIGHT_SHIFT_FEE: 100,
  FOOD_NIGHT_FEE: 50,
  FOOD_OT_FEE: 40,
  SKILL_FEE: 20,
  MENTOR_FEE: 200,
  SOCIAL_SECURITY_PERCENT: 5,
  SOCIAL_SECURITY_RATE: 0.05,
  mentor: false,
  incentive1: 0,
  incentive2: 0
};

function workDay(date, otHours = 0) {
  return { date, status: "วันทำงาน", shift: "เช้า", normalHours: 8, normalHoursRaw: "8", otHours, skill: false };
}

function leaveDay(date, status, normalHours = 0) {
  return { date, status, shift: "เช้า", normalHours, normalHoursRaw: String(normalHours), otHours: 0, skill: false };
}

test("รวมยอดแต่ละงวดตามเดือนอ้างอิงของปี", () => {
  const summary = buildYearSummary({
    year: 2026,
    calculatePayroll,
    periods: [
      { year: 2026, month: 0, data: { settings, days: [workDay("2025-12-16")] }, slip: { net: 500 } },
      { year: 2026, month: 1, data: { settings, days: [workDay("2026-01-16", 2)] }, slip: { net: 600 } }
    ]
  });

  assert.equal(summary.counts.estimatedMonths, 2);
  assert.equal(summary.counts.actualMonths, 2);
  assert.equal(summary.months[0].workDays, 1);
  assert.equal(summary.months[1].otHours, 2);
  assert.equal(summary.totals.actualNet, 1100);
  assert.equal(summary.highest.month, 1);
  assert.equal(summary.lowest.month, 0);
});

test("ไม่รวมงวดว่างแต่ยังแสดงสลิปจริงได้", () => {
  const summary = buildYearSummary({
    year: 2026,
    calculatePayroll,
    periods: [
      { year: 2026, month: 4, data: { settings, days: [] }, slip: { net: 1234 } }
    ]
  });

  assert.equal(summary.counts.estimatedMonths, 0);
  assert.equal(summary.counts.actualMonths, 1);
  assert.equal(summary.months[4].estimatedNet, null);
  assert.equal(summary.months[4].actualNet, 1234);
  assert.equal(summary.totals.averageNet, 0);
});

test("แยกองค์ประกอบรายได้เพื่อใช้สร้างกราฟ", () => {
  const summary = buildYearSummary({
    year: 2026,
    calculatePayroll,
    periods: [{
      year: 2026,
      month: 6,
      data: { ...{ settings: { ...settings, mentor: true, incentive1: 100 } }, days: [workDay("2026-06-16", 2)] }
    }]
  });

  const month = summary.months[6];
  assert.equal(month.breakdown.baseIncome, 400);
  assert.equal(month.breakdown.overtimeIncome, 150);
  assert.equal(month.breakdown.extraIncome, 300);
});

test("รวมวันลาทุกประเภทและรองรับลาครึ่งวันในสรุปรายปี", () => {
  const summary = buildYearSummary({
    year: 2026,
    calculatePayroll,
    periods: [{
      year: 2026,
      month: 8,
      data: {
        settings,
        days: [
          leaveDay("2026-08-16", "ลาพักร้อน", 4),
          leaveDay("2026-08-17", "ลาป่วยแพทย์(เขียนใบสอบสวน)"),
          leaveDay("2026-08-18", "ลากิจพิเศษ"),
          leaveDay("2026-08-19", "ลาป่วย"),
          leaveDay("2026-08-20", "ลากิจ")
        ]
      }
    }]
  });

  assert.equal(summary.months[8].leaveDays, 4.5);
  assert.equal(summary.totals.leaveDays, 4.5);
});

test("ปีที่ยังไม่เคยบันทึกไม่ถูกแปลงเป็นปี 0", () => {
  assert.equal(resolveYearSelection({
    requestedYear: null,
    storedYear: null,
    currentYear: 2026,
    availableYears: [2026]
  }), 2026);
  assert.equal(resolveYearSelection({
    requestedYear: "",
    storedYear: "0000",
    currentYear: 2026,
    availableYears: [0, 2026]
  }), 2026);
});

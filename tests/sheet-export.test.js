const test = require("node:test");
const assert = require("node:assert/strict");
const fflate = require("../vendor/fflate.min.js");
const { calculatePayroll } = require("../payroll-engine.js");
const { buildExportModel, createWorkbook } = require("../sheet-export.js");

const settings = {
  DAILY_WAGE: 400,
  HOURLY_WAGE: 50,
  OT_RATE_1: 1,
  OT_RATE_15: 1.5,
  OT_RATE_2: 2,
  OT_RATE_3: 3,
  NIGHT_SHIFT_FEE: 150,
  FOOD_NIGHT_FEE: 60,
  FOOD_OT_FEE: 45,
  SKILL_FEE: 20,
  MENTOR_FEE: 500,
  SOCIAL_SECURITY_PERCENT: 5,
  SOCIAL_SECURITY_RATE: 0.05,
  mentor: true,
  incentive1: 100,
  incentive2: 200
};

const days = [
  { date: "2026-09-16", status: "วันทำงาน", shift: "ดึก", normalHours: 8, normalHoursRaw: "8", otHours: 2.51, skill: true },
  { date: "2026-09-17", status: "วันหยุด", shift: "เช้า", normalHours: 8, normalHoursRaw: "8", otHours: 4.51, skill: false },
  { date: "2026-09-18", status: "ขาดงาน", shift: "ดึก", normalHours: 0, normalHoursRaw: "0", otHours: 0, skill: true },
  { date: "2026-09-19", status: "", shift: "", normalHours: 0, normalHoursRaw: "0", otHours: 2.51, skill: false }
];

test("builds an auditable daily breakdown without period-only payments", () => {
  const model = buildExportModel({ settings, days }, calculatePayroll, {
    periodLabel: "16 ก.ย. - 15 ต.ค. 2569",
    generatedAt: "2026-09-27T12:00:00.000Z"
  });

  assert.equal(model.daily.length, 4);
  assert.equal(model.daily[0].otUnits, 2.51);
  assert.equal(model.daily[0].ot15Units, 2.51);
  assert.equal(model.daily[0].nightShiftPay, 150);
  assert.equal(model.daily[0].nightFoodPay, 60);
  assert.equal(model.daily[0].skillPay, 20);
  assert.equal(model.daily[2].totalIncome, 0);
  assert.equal(model.daily[3].otFoodPay, 0);
  assert.equal(model.daily.reduce((sum, day) => sum + day.totalIncome, 0), model.result.totals.totalIncome - 800);
});

test("creates an XLSX workbook with the three requested sheets", () => {
  const model = buildExportModel({ settings, days }, calculatePayroll, {
    periodLabel: "16 ก.ย. - 15 ต.ค. 2569",
    generatedAt: "2026-09-27T12:00:00.000Z"
  });
  const bytes = createWorkbook(model, fflate);
  const files = fflate.unzipSync(bytes);
  const decode = value => new TextDecoder().decode(value);

  assert.ok(bytes.byteLength > 1_000);
  assert.ok(files["xl/worksheets/sheet1.xml"]);
  assert.ok(files["xl/worksheets/sheet2.xml"]);
  assert.ok(files["xl/worksheets/sheet3.xml"]);

  const workbook = decode(files["xl/workbook.xml"]);
  const dailySheet = decode(files["xl/worksheets/sheet1.xml"]);
  const summarySheet = decode(files["xl/worksheets/sheet2.xml"]);
  const settingsSheet = decode(files["xl/worksheets/sheet3.xml"]);
  assert.match(workbook, /name="รายวัน"/);
  assert.match(workbook, /name="สรุปงวด"/);
  assert.match(workbook, /name="ตั้งค่าที่ใช้"/);
  assert.match(dailySheet, /2\.51/);
  assert.match(dailySheet, /หน่วย OT \(HR\)/);
  assert.match(summarySheet, /ยอดสุทธิ/);
  assert.match(summarySheet, /ค่าพี่เลี้ยง/);
  assert.match(settingsSheet, /ค่าพี่เลี้ยง/);
  assert.doesNotMatch(summarySheet, /ค่าครูฝึก/);
  assert.doesNotMatch(settingsSheet, /ค่าครูฝึก/);
});

test("sorts exported daily rows by date even when opened calendar cards moved in the DOM", () => {
  const shuffledDays = [days[2], days[3], days[0], days[1]];
  const model = buildExportModel({ settings, days: shuffledDays }, calculatePayroll);

  assert.deepEqual(
    model.daily.map(day => day.date),
    ["2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19"]
  );
  assert.equal(model.periodLabel, "2026-09-16 ถึง 2026-09-19");
});

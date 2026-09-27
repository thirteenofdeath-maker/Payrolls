const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePayroll } = require("../payroll-engine.js");

const baseSettings = {
  DAILY_WAGE: 447,
  HOURLY_WAGE: 55.875,
  OT_RATE_1: 1,
  OT_RATE_15: 1.5,
  OT_RATE_2: 2,
  OT_RATE_3: 3,
  NIGHT_SHIFT_FEE: 140,
  FOOD_NIGHT_FEE: 70,
  FOOD_OT_FEE: 45,
  SKILL_FEE: 20,
  MENTOR_FEE: 200,
  SOCIAL_SECURITY_PERCENT: 5,
  SOCIAL_SECURITY_RATE: 0.05,
  mentor: false,
  incentive1: 0,
  incentive2: 0
};

function day(status, normalHours = 0, otHours = 0, shift = "เช้า", skill = false) {
  return {
    date: "2026-08-01",
    status,
    shift,
    normalHours,
    normalHoursRaw: String(normalHours),
    otHours,
    skill
  };
}

function calculate(days, settings = {}) {
  return calculatePayroll({ settings: { ...baseSettings, ...settings }, days });
}

function read(object, path) {
  return path.split(".").reduce((value, key) => value[key], object);
}

function assertResult(result, expected) {
  for (const [path, expectedValue] of Object.entries(expected)) {
    const actualValue = read(result, path);
    if (typeof expectedValue === "number") {
      assert.ok(
        Math.abs(actualValue - expectedValue) < 1e-9,
        `${path}: expected ${expectedValue}, received ${actualValue}`
      );
    } else {
      assert.equal(actualValue, expectedValue, path);
    }
  }
}

test("วันทำงาน 4 ชั่วโมงได้ค่าแรงครึ่งวัน", () => {
  const result = calculate([day("วันทำงาน", 4)]);
  assert.equal(result.counts.cNormalday, 0.5);
  assert.equal(result.income.salaryPay, 223.5);
});

test("ขาดงานไม่ได้ค่าทักษะ", () => {
  const result = calculate([day("ขาดงาน", 0, 0, "เช้า", true)]);
  assert.equal(result.counts.skillDays, 0);
  assert.equal(result.income.skillPay, 0);
});

test("ขาดงานกะดึกไม่ได้ค่ากะและค่าอาหาร", () => {
  const result = calculate([day("ขาดงาน", 0, 0, "ดึก")]);
  assert.equal(result.counts.nightShiftDays, 0);
  assert.equal(result.income.nightShiftPay, 0);
  assert.equal(result.income.nightFoodPay, 0);
});

test("ไม่เลือกสถานะไม่ได้ค่าอาหาร OT", () => {
  const result = calculate([day("", 0, 2.51)]);
  assert.equal(result.counts.otFoodDays, 0);
  assert.equal(result.income.otFoodPay, 0);
});

test("ขาดงานไม่ได้เงินแม้มีข้อมูลชั่วโมงค้างอยู่", () => {
  const result = calculate([day("ขาดงาน", 4, 2.51, "ดึก", true)]);
  assert.equal(result.totals.totalIncome, 0);
  assert.equal(result.totals.netPay, 0);
});

test("ใช้หน่วย OT 0.17, 2.51 และ 4.51 ตามไฟล์ HR", () => {
  const forced = calculate([day("วันทำงาน", 8, 0.17)]);
  const twoThirty = calculate([day("วันทำงาน", 8, 2.51)]);
  const fourThirty = calculate([day("วันทำงาน", 8, 4.51)]);

  assert.equal(forced.hours.ot15Hours, 0.17);
  assert.equal(twoThirty.hours.ot15Hours, 2.51);
  assert.equal(fourThirty.hours.ot15Hours, 4.51);
  assert.equal(twoThirty.income.ot15Pay, 210.369375);
  assert.equal(fourThirty.income.ot15Pay, 377.994375);
});

test("กรณีเดิมที่รองรับยังคำนวณเหมือนเดิม", () => {
  const result = calculate([
    day("วันทำงาน", 8, 2.51, "ดึก", true),
    day("วันหยุด", 8, 4.51),
    day("วันหยุดพิเศษ", 8, 0.17, "ดึก"),
    day("ลาพักร้อน", 4),
    day("ลาป่วยแพทย์(เขียนใบสอบสวน)", 0),
    day("ลากิจพิเศษ", 0),
    day("ขาดงาน", 0)
  ], { mentor: true, incentive1: 100, incentive2: 200 });

  assertResult(result, {
    "counts.nightShiftDays": 2,
    "counts.otFoodDays": 2,
    "hours.totalOtHours": 23.19,
    "income.forcedOtPay": 14,
    "deductions.socialSecurity": 114,
    "totals.netPay": 5535.854375
  });
});

const legacyRegressionCases = [
  ["วันทำงาน 8 ชั่วโมง ไม่มี OT", [day("วันทำงาน", 8)], {}, {
    "counts.cNormalday": 1,
    "income.salaryPay": 447,
    "deductions.socialSecurity": 22,
    "totals.netPay": 425
  }],
  ["วันทำงาน + OT 0.17", [day("วันทำงาน", 8, 0.17)], {}, {
    "hours.ot15Hours": 0.17,
    "counts.otFoodDays": 0,
    "income.ot15Pay": 14.248125,
    "totals.netPay": 439.248125
  }],
  ["วันทำงาน + OT 2.51", [day("วันทำงาน", 8, 2.51)], {}, {
    "hours.ot15Hours": 2.51,
    "counts.otFoodDays": 1,
    "income.ot15Pay": 210.369375,
    "totals.netPay": 680.369375
  }],
  ["วันทำงาน + OT 4.51", [day("วันทำงาน", 8, 4.51)], {}, {
    "hours.ot15Hours": 4.51,
    "counts.otFoodDays": 1,
    "income.ot15Pay": 377.994375,
    "totals.netPay": 847.994375
  }],
  ["วันทำงานกะดึก", [day("วันทำงาน", 8, 0, "ดึก")], {}, {
    "counts.nightShiftDays": 1,
    "income.nightShiftPay": 140,
    "income.nightFoodPay": 70,
    "totals.netPay": 635
  }],
  ["วันหยุด Normal + OT", [day("วันหยุด", 8, 2.51)], {}, {
    "hours.ot2Hours": 8,
    "hours.ot3Hours": 2.51,
    "income.ot2Pay": 894,
    "income.ot3Pay": 420.73875,
    "totals.netPay": 1359.73875
  }],
  ["วันหยุดพิเศษ", [day("วันหยุดพิเศษ", 8)], {}, {
    "counts.cHolidaySpecial": 1,
    "hours.ot1Hour": 8,
    "income.holidayspecialPay": 461,
    "deductions.socialSecurity": 23,
    "totals.netPay": 885
  }],
  ["ลาพักร้อนเต็มวัน", [day("ลาพักร้อน", 0)], {}, {
    "counts.cVacation": 1,
    "income.vacationPay": 461,
    "deductions.socialSecurity": 23,
    "totals.netPay": 438
  }],
  ["ลาพักร้อนครึ่งวัน", [day("ลาพักร้อน", 4)], {}, {
    "counts.cNormalday": 0.5,
    "counts.cVacation": 0.5,
    "income.salaryPay": 223.5,
    "income.vacationPay": 230.5,
    "totals.netPay": 431
  }],
  ["ลาป่วย", [day("ลาป่วย", 0)], {}, {
    "counts.cSick": 1,
    "totals.totalIncome": 0,
    "totals.netPay": 0
  }],
  ["ลาป่วยแพทย์", [day("ลาป่วยแพทย์(เขียนใบสอบสวน)", 0)], {}, {
    "counts.cSickDoctor": 1,
    "income.sickdocterPay": 461,
    "deductions.socialSecurity": 23,
    "totals.netPay": 438
  }],
  ["ลากิจ", [day("ลากิจ", 0)], {}, {
    "counts.cBusiness": 1,
    "totals.totalIncome": 0,
    "totals.netPay": 0
  }],
  ["ลากิจพิเศษ", [day("ลากิจพิเศษ", 0)], {}, {
    "counts.cBusinessExtra": 1,
    "income.businessextraPay": 461,
    "deductions.socialSecurity": 23,
    "totals.netPay": 438
  }],
  ["ขาดงาน", [day("ขาดงาน", 0)], {}, {
    "counts.cAbsent": 1,
    "totals.totalIncome": 0,
    "totals.netPay": 0
  }],
  ["Skill", [day("วันทำงาน", 8, 0, "เช้า", true)], {}, {
    "counts.skillDays": 1,
    "income.skillPay": 20,
    "totals.netPay": 445
  }],
  ["Mentor", [], { mentor: true }, {
    "income.mentorPay": 200,
    "totals.totalIncome": 200,
    "totals.netPay": 200
  }],
  ["Incentive 1", [], { incentive1: 123.45 }, {
    "income.incentive1Pay": 123.45,
    "totals.totalIncome": 123.45,
    "totals.netPay": 123.45
  }],
  ["Incentive 2", [], { incentive2: 67.89 }, {
    "income.incentive2Pay": 67.89,
    "totals.totalIncome": 67.89,
    "totals.netPay": 67.89
  }],
  ["Social Security", [day("วันทำงาน", 8)], {
    SOCIAL_SECURITY_PERCENT: 7.25,
    SOCIAL_SECURITY_RATE: 0.0725
  }, {
    "deductions.socialSecurity": 32,
    "totals.totalIncome": 447,
    "totals.netPay": 415
  }]
];

for (const [name, days, settings, expected] of legacyRegressionCases) {
  test(`regression: ${name}`, () => {
    assertResult(calculate(days, settings), expected);
  });
}

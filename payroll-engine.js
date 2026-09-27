(function (root, factory) {
  const engine = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  }

  if (root) {
    root.PayrollEngine = engine;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function round(value, digits = 0) {
    const multiplier = Math.pow(10, digits);
    return Math.round(value * multiplier) / multiplier;
  }

  function countIncludeStatusNormal(days, statusList, normalHour = null) {
    return days.filter(day => {
      if (!statusList.includes(day.status)) return false;
      if (normalHour === null) return true;
      return day.normalHoursRaw === String(normalHour);
    }).length;
  }

  // Pure calculation layer: receives data and never reads or writes the DOM.
  function calculatePayroll(data) {
    const settings = data.settings;
    const days = data.days;
    let workDays = 0;
    let workHours = 0;
    let ot1Hour = 0;
    let ot15Hours = 0;
    let ot2Hours = 0;
    let ot3Hours = 0;
    let nightShiftDays = 0;
    let otFoodDays = 0;

    days.forEach(day => {
      const status = day.status;
      const shift = day.shift;
      const normal = day.normalHours;
      const ot = day.otHours;

      // These are HR payroll units, not decimal-hour conversions.
      const hasNormalOT = ot > 0.17;

      if (status === "วันทำงาน") {
        workHours += normal;
        workDays += normal / 8;
        if (ot > 0) ot15Hours += ot;
        if (shift === "ดึก") nightShiftDays++;
      } else if (status === "วันหยุด") {
        ot2Hours += normal;
        ot3Hours += ot;
        if (shift === "ดึก") nightShiftDays++;
      } else if (status === "วันหยุดพิเศษ") {
        ot1Hour += normal;
        ot3Hours += ot;
        if (shift === "ดึก") nightShiftDays++;
      } else if ([
        "ลาพักร้อน",
        "ลาป่วย",
        "ลาป่วยแพทย์(เขียนใบสอบสวน)",
        "ลากิจ",
        "ลากิจพิเศษ"
      ].includes(status)) {
        if (shift === "ดึก") nightShiftDays++;
      }

      // OT food is payable only for a selected status that supports OT.
      if (["วันทำงาน", "วันหยุด", "วันหยุดพิเศษ"].includes(status) && hasNormalOT) {
        otFoodDays++;
      }
    });

    const count = (statuses, normalHour = null) =>
      countIncludeStatusNormal(days, statuses, normalHour);
    const halfDayStatuses = [
      "ลาพักร้อน",
      "ลาป่วย",
      "ลาป่วยแพทย์(เขียนใบสอบสวน)",
      "ลากิจ",
      "ลากิจพิเศษ"
    ];
    const cNormalday =
      count(halfDayStatuses, "4") * 0.5 +
      count(["วันทำงาน"], "8") +
      count(["วันทำงาน"], "6") * 0.75 +
      count(["วันทำงาน"], "4") * 0.5;
    const cHolidaySpecial = count(["วันหยุดพิเศษ"]);
    const cVacation = count(["ลาพักร้อน"], "4") * 0.5 + count(["ลาพักร้อน"], "0");
    const cSickDoctor = count(["ลาป่วยแพทย์(เขียนใบสอบสวน)"], "4") * 0.5 + count(["ลาป่วยแพทย์(เขียนใบสอบสวน)"], "0");
    const cBusinessExtra = count(["ลากิจพิเศษ"], "4") * 0.5 + count(["ลากิจพิเศษ"], "0");
    const cSick = count(["ลาป่วย"], "4") * 0.5 + count(["ลาป่วย"], "0");
    const cBusiness = count(["ลากิจ"], "4") * 0.5 + count(["ลากิจ"], "0");
    const cAbsent = count(["ขาดงาน"]);
    const cHoliday = count(["วันหยุด"]);

    const salaryPay = cNormalday * settings.DAILY_WAGE;
    const ot1Pay = settings.HOURLY_WAGE * settings.OT_RATE_1 * ot1Hour;
    const ot15Pay = settings.HOURLY_WAGE * settings.OT_RATE_15 * ot15Hours;
    const ot2Pay = settings.HOURLY_WAGE * settings.OT_RATE_2 * ot2Hours;
    const ot3Pay = settings.HOURLY_WAGE * settings.OT_RATE_3 * ot3Hours;
    const totalOtHours = ot1Hour + ot15Hours + ot2Hours + ot3Hours;
    const nightShiftPay = nightShiftDays * settings.NIGHT_SHIFT_FEE;
    const nightFoodPay = nightShiftDays * settings.FOOD_NIGHT_FEE;
    const otFoodPay = otFoodDays * settings.FOOD_OT_FEE;
    const forcedOtPay = Math.floor((settings.HOURLY_WAGE * settings.OT_RATE_15) * 0.17);
    const skillDays = days.filter(day => day.skill && day.status && day.status !== "ขาดงาน").length;
    const skillPay = skillDays * settings.SKILL_FEE;
    const mentorPay = settings.mentor ? settings.MENTOR_FEE : 0;
    const holidayspecialPay = cHolidaySpecial * (settings.DAILY_WAGE + forcedOtPay);
    const vacationPay = cVacation * (settings.DAILY_WAGE + forcedOtPay);
    const sickdocterPay = cSickDoctor * (settings.DAILY_WAGE + forcedOtPay);
    const businessextraPay = cBusinessExtra * (settings.DAILY_WAGE + forcedOtPay);
    const incentive1Pay = settings.incentive1;
    const incentive2Pay = settings.incentive2;
    const totalIncome = salaryPay + ot1Pay + ot15Pay + ot2Pay + ot3Pay +
      nightShiftPay + nightFoodPay + otFoodPay + skillPay + mentorPay +
      holidayspecialPay + vacationPay + sickdocterPay + businessextraPay +
      incentive1Pay + incentive2Pay;
    const socialSecurity = round((salaryPay + holidayspecialPay + vacationPay + sickdocterPay + businessextraPay) * settings.SOCIAL_SECURITY_RATE, 0);
    const netPay = totalIncome - socialSecurity;

    return {
      settings,
      counts: { workDays, cNormalday, cHolidaySpecial, cVacation, cSickDoctor, cBusinessExtra, cSick, cBusiness, cAbsent, cHoliday, nightShiftDays, otFoodDays, skillDays },
      hours: { workHours, ot1Hour, ot15Hours, ot2Hours, ot3Hours, totalOtHours },
      income: { salaryPay, ot1Pay, ot15Pay, ot2Pay, ot3Pay, nightShiftPay, nightFoodPay, otFoodPay, forcedOtPay, skillPay, mentorPay, holidayspecialPay, vacationPay, sickdocterPay, businessextraPay, incentive1Pay, incentive2Pay },
      deductions: { socialSecurity },
      totals: { totalIncome, netPay }
    };
  }

  return { calculatePayroll };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PayrollQuality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function validNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function analyzePeriod(days, options = {}) {
    const normalizedDays = Array.isArray(days) ? days.filter(Boolean) : [];
    const missingDates = [];
    const workWithoutHours = [];
    const otWithoutStatus = [];

    normalizedDays.forEach(day => {
      const date = String(day.date || "");
      const status = String(day.status || "").trim();
      if (!status) missingDates.push(date);
      if (status === "วันทำงาน" && validNumber(day.normalHours) <= 0) workWithoutHours.push(date);
      if (!status && validNumber(day.otHours) > 0) otWithoutStatus.push(date);
    });

    const issues = [];
    if (missingDates.length) {
      issues.push({
        code: "missing-status",
        count: missingDates.length,
        dates: missingDates,
        message: `ยังไม่ได้เลือกสถานะ ${missingDates.length} วัน`
      });
    }
    if (workWithoutHours.length) {
      issues.push({
        code: "work-without-hours",
        count: workWithoutHours.length,
        dates: workWithoutHours,
        message: `วันทำงานไม่มีชั่วโมงปกติ ${workWithoutHours.length} วัน`
      });
    }
    if (otWithoutStatus.length) {
      issues.push({
        code: "ot-without-status",
        count: otWithoutStatus.length,
        dates: otWithoutStatus,
        message: `มี OT แต่ยังไม่ได้เลือกสถานะ ${otWithoutStatus.length} วัน`
      });
    }
    if (!options.hasActualSlip) {
      issues.push({
        code: "missing-actual-slip",
        count: 1,
        dates: [],
        message: "ยังไม่ได้กรอกสลิปจริงของงวดนี้"
      });
    }

    return {
      totalDays: normalizedDays.length,
      completedDays: normalizedDays.length - missingDates.length,
      missingDates,
      issues
    };
  }

  function describeMoneyDifference(actual, estimated, label = "ยอด") {
    if (actual === null || actual === undefined || estimated === null || estimated === undefined) {
      return `ยังไม่มีข้อมูล${label}จากสลิปจริง`;
    }
    const actualNumber = Number(actual);
    const estimatedNumber = Number(estimated);
    if (!Number.isFinite(actualNumber) || !Number.isFinite(estimatedNumber)) {
      return `ยังไม่มีข้อมูล${label}สำหรับเปรียบเทียบ`;
    }
    const difference = actualNumber - estimatedNumber;
    if (Math.abs(difference) < 0.005) return `${label}ตามสลิปจริงตรงกับที่คำนวณ`;
    return `${label}ตามสลิปจริง${difference > 0 ? "มากกว่า" : "น้อยกว่า"}ที่คำนวณ ${Math.abs(difference).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} บาท`;
  }

  return { analyzePeriod, describeMoneyDifference };
});

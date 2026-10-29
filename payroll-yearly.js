(function (root, factory) {
  const yearly = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = yearly;
  }

  if (root) {
    root.PayrollYearly = yearly;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
  }

  function sum(values) {
    return values.reduce((total, value) => total + (Number(value) || 0), 0);
  }

  function validYear(value) {
    if (value === null || value === undefined || value === "") return null;
    const year = Number(value);
    return Number.isInteger(year) && year >= 1900 && year <= 2199 ? year : null;
  }

  function resolveYearSelection({ requestedYear, storedYear, currentYear, availableYears = [] }) {
    const requested = validYear(requestedYear);
    if (requested !== null) return requested;
    const stored = validYear(storedYear);
    if (stored !== null && availableYears.includes(stored)) return stored;
    const current = validYear(currentYear);
    if (current !== null) return current;
    return new Date().getFullYear();
  }

  function buildYearSummary({ year, periods = [], calculatePayroll }) {
    if (!Number.isInteger(Number(year))) throw new Error("ปีสรุปไม่ถูกต้อง");
    if (typeof calculatePayroll !== "function") throw new Error("ไม่พบฟังก์ชันคำนวณเงินเดือน");

    const periodByMonth = new Map(
      periods
        .filter(period => period && Number(period.year) === Number(year) && Number.isInteger(Number(period.month)))
        .map(period => [Number(period.month), period])
    );

    const months = Array.from({ length: 12 }, (_, month) => {
      const period = periodByMonth.get(month) || null;
      const days = Array.isArray(period?.data?.days) ? period.data.days : [];
      const hasData = Boolean(period?.hasData ?? days.some(day => String(day?.status || "").trim()));
      const result = hasData ? calculatePayroll(period.data) : null;
      const slip = period?.slip || null;
      const actualNet = numberOrNull(slip?.net);

      const baseIncome = result ? sum([
        result.income.salaryPay,
        result.income.holidayspecialPay,
        result.income.vacationPay,
        result.income.sickdocterPay,
        result.income.businessextraPay
      ]) : 0;
      const overtimeIncome = result ? sum([
        result.income.ot1Pay,
        result.income.ot15Pay,
        result.income.ot2Pay,
        result.income.ot3Pay
      ]) : 0;
      const shiftFoodIncome = result ? sum([
        result.income.nightShiftPay,
        result.income.nightFoodPay,
        result.income.otFoodPay
      ]) : 0;
      const extraIncome = result ? sum([
        result.income.skillPay,
        result.income.mentorPay,
        result.income.incentive1Pay,
        result.income.incentive2Pay
      ]) : 0;

      return {
        year: Number(year),
        month,
        hasData,
        hasSlip: actualNet !== null,
        estimatedGross: result?.totals.totalIncome ?? null,
        estimatedDeductions: result?.deductions.socialSecurity ?? null,
        estimatedNet: result?.totals.netPay ?? null,
        actualGross: numberOrNull(slip?.gross),
        actualDeductions: numberOrNull(slip?.deductions),
        actualNet,
        difference: result && actualNet !== null ? actualNet - result.totals.netPay : null,
        workDays: result?.counts.workDays ?? 0,
        absentDays: result?.counts.cAbsent ?? 0,
        otHours: result?.hours.totalOtHours ?? 0,
        breakdown: { baseIncome, overtimeIncome, shiftFoodIncome, extraIncome }
      };
    });

    const estimatedMonths = months.filter(month => month.hasData);
    const actualMonths = months.filter(month => month.hasSlip);
    const ranked = estimatedMonths.slice().sort((left, right) => right.estimatedNet - left.estimatedNet);
    const estimatedNet = sum(estimatedMonths.map(month => month.estimatedNet));

    return {
      year: Number(year),
      months,
      totals: {
        estimatedGross: sum(estimatedMonths.map(month => month.estimatedGross)),
        estimatedDeductions: sum(estimatedMonths.map(month => month.estimatedDeductions)),
        estimatedNet,
        actualNet: sum(actualMonths.map(month => month.actualNet)),
        difference: sum(actualMonths.map(month => month.difference)),
        workDays: sum(estimatedMonths.map(month => month.workDays)),
        absentDays: sum(estimatedMonths.map(month => month.absentDays)),
        otHours: sum(estimatedMonths.map(month => month.otHours)),
        averageNet: estimatedMonths.length ? estimatedNet / estimatedMonths.length : 0
      },
      counts: {
        estimatedMonths: estimatedMonths.length,
        actualMonths: actualMonths.length
      },
      highest: ranked[0] || null,
      lowest: ranked.length ? ranked[ranked.length - 1] : null
    };
  }

  return { buildYearSummary, resolveYearSelection };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PayrollSheetExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function thaiDayName(dateText) {
    const date = new Date(`${dateText}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "" : THAI_DAYS[date.getDay()];
  }

  function buildExportModel(data, calculatePayroll, metadata = {}) {
    if (!data || !Array.isArray(data.days) || typeof calculatePayroll !== "function") {
      throw new Error("ข้อมูลสำหรับส่งออกไม่ถูกต้อง");
    }

    const sortedDays = [...data.days].sort((left, right) =>
      String(left?.date || "").localeCompare(String(right?.date || ""))
    );
    const result = calculatePayroll({ ...data, days: sortedDays });
    const daily = sortedDays.map(day => {
      const dailySettings = { ...data.settings, mentor: false, incentive1: 0, incentive2: 0 };
      const dailyResult = calculatePayroll({ settings: dailySettings, days: [day] });
      return {
        date: day.date || "",
        dayName: thaiDayName(day.date),
        status: day.status || "ยังไม่เลือก",
        shift: day.shift || "ไม่ระบุ",
        normalHours: number(day.normalHours),
        otUnits: number(day.otHours),
        ot1Units: dailyResult.hours.ot1Hour,
        ot15Units: dailyResult.hours.ot15Hours,
        ot2Units: dailyResult.hours.ot2Hours,
        ot3Units: dailyResult.hours.ot3Hours,
        salaryPay: dailyResult.income.salaryPay,
        holidaySpecialPay: dailyResult.income.holidayspecialPay,
        vacationPay: dailyResult.income.vacationPay,
        sickDoctorPay: dailyResult.income.sickdocterPay,
        businessExtraPay: dailyResult.income.businessextraPay,
        nightShiftPay: dailyResult.income.nightShiftPay,
        nightFoodPay: dailyResult.income.nightFoodPay,
        otFoodPay: dailyResult.income.otFoodPay,
        skillPay: dailyResult.income.skillPay,
        ot1Pay: dailyResult.income.ot1Pay,
        ot15Pay: dailyResult.income.ot15Pay,
        ot2Pay: dailyResult.income.ot2Pay,
        ot3Pay: dailyResult.income.ot3Pay,
        totalIncome: dailyResult.totals.totalIncome
      };
    });

    return {
      title: "รายละเอียดการคำนวณเงินเดือน",
      periodLabel: metadata.periodLabel || `${daily[0]?.date || ""} ถึง ${daily[daily.length - 1]?.date || ""}`,
      generatedAt: metadata.generatedAt || new Date().toISOString(),
      daily,
      result,
      settings: data.settings,
      actualSlip: metadata.actualSlip || null
    };
  }

  function xmlEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function columnName(index) {
    let name = "";
    for (let current = index; current > 0; current = Math.floor((current - 1) / 26)) {
      name = String.fromCharCode(65 + ((current - 1) % 26)) + name;
    }
    return name;
  }

  function cellXml(value, row, column, style = 0) {
    const reference = `${columnName(column)}${row}`;
    if (typeof value === "number" && Number.isFinite(value)) {
      return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
    }
    return `<c r="${reference}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  }

  function worksheetXml(rows, options = {}) {
    const maxColumns = Math.max(1, ...rows.map(row => row.cells.length));
    const rowXml = rows.map((row, rowIndex) => {
      const cells = row.cells.map((value, columnIndex) =>
        cellXml(value, rowIndex + 1, columnIndex + 1, row.styles?.[columnIndex] ?? row.style ?? 0)
      ).join("");
      const height = row.height ? ` ht="${row.height}" customHeight="1"` : "";
      return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
    }).join("");
    const widths = (options.widths || []).map((width, index) =>
      `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    ).join("");
    const freeze = options.freezeRow
      ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${options.freezeRow}" topLeftCell="A${options.freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      : "<sheetViews><sheetView workbookViewId=\"0\"/></sheetViews>";
    const merges = (options.merges || []).length
      ? `<mergeCells count="${options.merges.length}">${options.merges.map(ref => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
      : "";
    const filter = options.autoFilter ? `<autoFilter ref="${options.autoFilter}"/>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${columnName(maxColumns)}${rows.length}"/>${freeze}<sheetFormatPr defaultRowHeight="20"/>
<cols>${widths}</cols><sheetData>${rowXml}</sheetData>${filter}${merges}
</worksheet>`;
  }

  function detailRows(model) {
    const headers = [
      "วันที่", "วัน", "สถานะ", "กะ", "ชม.ปกติ", "หน่วย OT (HR)",
      "OT 1x", "OT 1.5x", "OT 2x", "OT 3x", "ค่าแรงหลัก", "วันหยุดพิเศษ",
      "ลาพักร้อน", "ลาป่วยแพทย์", "ลากิจพิเศษ", "ค่า OT 1x", "ค่า OT 1.5x",
      "ค่า OT 2x", "ค่า OT 3x", "ค่ากะดึก", "อาหารกะดึก", "อาหาร OT", "ค่าทักษะ", "รวมรายวัน"
    ];
    const rows = [
      { cells: [model.title], style: 1, height: 28 },
      { cells: [`งวด: ${model.periodLabel}`], style: 6 },
      { cells: ["หมายเหตุ: หน่วย OT เป็นค่าตามไฟล์ HR (เช่น 2.51 / 4.51) ไม่ใช่ชั่วโมงทศนิยม"], style: 6 },
      { cells: headers, style: 2, height: 32 }
    ];
    model.daily.forEach(day => rows.push({
      cells: [
        day.date, day.dayName, day.status, day.shift, day.normalHours, day.otUnits,
        day.ot1Units, day.ot15Units, day.ot2Units, day.ot3Units, day.salaryPay,
        day.holidaySpecialPay, day.vacationPay, day.sickDoctorPay, day.businessExtraPay,
        day.ot1Pay, day.ot15Pay, day.ot2Pay, day.ot3Pay, day.nightShiftPay,
        day.nightFoodPay, day.otFoodPay, day.skillPay, day.totalIncome
      ],
      styles: [0, 0, 0, 0, ...Array(20).fill(3)]
    }));
    return rows;
  }

  function summaryRows(model) {
    const { counts, hours, income, deductions, totals } = model.result;
    const settings = model.settings;
    const rows = [
      { cells: [model.title], style: 1, height: 28 },
      { cells: [`งวด: ${model.periodLabel}`], style: 6 },
      { cells: ["หมวด", "รายการ", "จำนวน", "หน่วย", "อัตรา (บาท)", "จำนวนเงิน (บาท)"], style: 2, height: 30 }
    ];
    const add = (category, label, quantity, unit, rate, amount) => rows.push({
      cells: [category, label, quantity, unit, rate, amount],
      styles: [0, 0, 3, 0, 3, 3]
    });
    add("รายได้หลัก", "วันทำงาน", counts.cNormalday, "วัน", settings.DAILY_WAGE, income.salaryPay);
    add("รายได้หลัก", "วันหยุดพิเศษ", counts.cHolidaySpecial, "วัน", settings.DAILY_WAGE + income.forcedOtPay, income.holidayspecialPay);
    add("รายได้หลัก", "ลาพักร้อน", counts.cVacation, "วัน", settings.DAILY_WAGE + income.forcedOtPay, income.vacationPay);
    add("รายได้หลัก", "ลาป่วยแพทย์", counts.cSickDoctor, "วัน", settings.DAILY_WAGE + income.forcedOtPay, income.sickdocterPay);
    add("รายได้หลัก", "ลากิจพิเศษ", counts.cBusinessExtra, "วัน", settings.DAILY_WAGE + income.forcedOtPay, income.businessextraPay);
    add("OT", "OT 1x", hours.ot1Hour, "หน่วย HR", settings.HOURLY_WAGE * settings.OT_RATE_1, income.ot1Pay);
    add("OT", "OT 1.5x", hours.ot15Hours, "หน่วย HR", settings.HOURLY_WAGE * settings.OT_RATE_15, income.ot15Pay);
    add("OT", "OT 2x", hours.ot2Hours, "หน่วย HR", settings.HOURLY_WAGE * settings.OT_RATE_2, income.ot2Pay);
    add("OT", "OT 3x", hours.ot3Hours, "หน่วย HR", settings.HOURLY_WAGE * settings.OT_RATE_3, income.ot3Pay);
    add("กะและอาหาร", "ค่ากะดึก", counts.nightShiftDays, "วัน", settings.NIGHT_SHIFT_FEE, income.nightShiftPay);
    add("กะและอาหาร", "ค่าอาหารกะดึก", counts.nightShiftDays, "วัน", settings.FOOD_NIGHT_FEE, income.nightFoodPay);
    add("กะและอาหาร", "ค่าอาหาร OT", counts.otFoodDays, "วัน", settings.FOOD_OT_FEE, income.otFoodPay);
    add("รายได้เพิ่มเติม", "ค่าทักษะ", counts.skillDays, "วัน", settings.SKILL_FEE, income.skillPay);
    add("รายได้เพิ่มเติม", "ค่าพี่เลี้ยง", settings.mentor ? 1 : 0, "รายการ", settings.MENTOR_FEE, income.mentorPay);
    add("รายได้เพิ่มเติม", "Incentive 1", income.incentive1Pay ? 1 : 0, "รายการ", income.incentive1Pay, income.incentive1Pay);
    add("รายได้เพิ่มเติม", "Incentive 2", income.incentive2Pay ? 1 : 0, "รายการ", income.incentive2Pay, income.incentive2Pay);
    rows.push({ cells: ["", "รวมรายได้", "", "", "", totals.totalIncome], styles: [4, 4, 4, 4, 4, 4] });
    rows.push({ cells: ["หัก", "ประกันสังคม", "", "", `${settings.SOCIAL_SECURITY_PERCENT}%`, deductions.socialSecurity], styles: [0, 0, 0, 0, 0, 3] });
    rows.push({ cells: ["", "ยอดสุทธิ", "", "", "", totals.netPay], styles: [5, 5, 5, 5, 5, 5], height: 28 });
    if (model.actualSlip && Number.isFinite(Number(model.actualSlip.net))) {
      const slipGross = model.actualSlip.gross === null ? "ยังไม่กรอก" : number(model.actualSlip.gross);
      const slipDeductions = model.actualSlip.deductions === null ? "ยังไม่กรอก" : number(model.actualSlip.deductions);
      const slipNet = number(model.actualSlip.net);
      rows.push({ cells: ["สลิปจริง", "รายได้รวมตามสลิป", "", "", "", slipGross], styles: [0, 0, 0, 0, 0, typeof slipGross === "number" ? 3 : 0] });
      rows.push({ cells: ["สลิปจริง", "รายการหักตามสลิป", "", "", "", slipDeductions], styles: [0, 0, 0, 0, 0, typeof slipDeductions === "number" ? 3 : 0] });
      rows.push({ cells: ["สลิปจริง", "ยอดสุทธิตามสลิป", "", "", "", slipNet], styles: [0, 0, 0, 0, 0, 3] });
      rows.push({ cells: ["เทียบสลิป", "ผลต่างสุทธิ (สลิป - คำนวณ)", "", "", "", slipNet - totals.netPay], styles: [4, 4, 4, 4, 4, 4] });
    }
    return rows;
  }

  function settingsRows(model) {
    const s = model.settings;
    const entries = [
      ["ข้อมูลไฟล์", "งวด", model.periodLabel, ""],
      ["ข้อมูลไฟล์", "สร้างเมื่อ", model.generatedAt, ""],
      ["ฐานค่าจ้าง", "ค่าแรงรายวัน", s.DAILY_WAGE, "บาท/วัน"],
      ["ฐานค่าจ้าง", "ค่าแรงรายชั่วโมง", s.HOURLY_WAGE, "บาท/ชั่วโมง"],
      ["อัตรา OT", "OT 1x", s.OT_RATE_1, "เท่า"],
      ["อัตรา OT", "OT 1.5x", s.OT_RATE_15, "เท่า"],
      ["อัตรา OT", "OT 2x", s.OT_RATE_2, "เท่า"],
      ["อัตรา OT", "OT 3x", s.OT_RATE_3, "เท่า"],
      ["กะและอาหาร", "ค่ากะดึก", s.NIGHT_SHIFT_FEE, "บาท/วัน"],
      ["กะและอาหาร", "ค่าอาหารกะดึก", s.FOOD_NIGHT_FEE, "บาท/วัน"],
      ["กะและอาหาร", "ค่าอาหาร OT", s.FOOD_OT_FEE, "บาท/วัน"],
      ["รายได้เพิ่มเติม", "ค่าทักษะ", s.SKILL_FEE, "บาท/วัน"],
      ["รายได้เพิ่มเติม", "ค่าพี่เลี้ยง", s.MENTOR_FEE, "บาท/งวด"],
      ["รายการหัก", "ประกันสังคม", s.SOCIAL_SECURITY_PERCENT, "%"]
    ];
    return [
      { cells: ["ค่าตั้งต้นที่ใช้คำนวณ"], style: 1, height: 28 },
      { cells: ["หมวด", "รายการ", "ค่า", "หน่วย"], style: 2, height: 30 },
      ...entries.map(entry => ({ cells: entry, styles: [0, 0, typeof entry[2] === "number" ? 3 : 0, 0] }))
    ];
  }

  function stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FF173F35"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><i/><sz val="10"/><color rgb="FF52655F"/><name val="Arial"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF28705A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7F3EE"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4B942"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD5E1DC"/></left><right style="thin"><color rgb="FFD5E1DC"/></right><top style="thin"><color rgb="FFD5E1DC"/></top><bottom style="thin"><color rgb="FFD5E1DC"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="2" fillId="2" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="2" fillId="4" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  }

  function createWorkbook(model, zipLibrary) {
    if (!zipLibrary?.zipSync || !zipLibrary?.strToU8) throw new Error("ไม่พบตัวสร้างไฟล์สเปรดชีต");
    const enc = zipLibrary.strToU8;
    const files = {
      "[Content_Types].xml": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`),
      "_rels/.rels": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
      "docProps/core.xml": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(model.title)}</dc:title><dc:creator>Payrolls</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(model.generatedAt)}</dcterms:created></cp:coreProperties>`),
      "docProps/app.xml": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Payrolls</Application></Properties>`),
      "xl/workbook.xml": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="รายวัน" sheetId="1" r:id="rId1"/><sheet name="สรุปงวด" sheetId="2" r:id="rId2"/><sheet name="ตั้งค่าที่ใช้" sheetId="3" r:id="rId3"/></sheets></workbook>`),
      "xl/_rels/workbook.xml.rels": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
      "xl/styles.xml": enc(stylesXml()),
      "xl/worksheets/sheet1.xml": enc(worksheetXml(detailRows(model), { widths: [13, 11, 22, 10, 11, 14, 11, 11, 11, 11, ...Array(14).fill(15)], freezeRow: 4, autoFilter: `A4:X${model.daily.length + 4}`, merges: ["A1:X1", "A2:X2", "A3:X3"] })),
      "xl/worksheets/sheet2.xml": enc(worksheetXml(summaryRows(model), { widths: [20, 24, 14, 14, 18, 20], freezeRow: 3, autoFilter: `A3:F${summaryRows(model).length}`, merges: ["A1:F1", "A2:F2"] })),
      "xl/worksheets/sheet3.xml": enc(worksheetXml(settingsRows(model), { widths: [22, 28, 28, 18], freezeRow: 2, autoFilter: `A2:D${settingsRows(model).length}`, merges: ["A1:D1"] }))
    };
    return zipLibrary.zipSync(files, { level: 6 });
  }

  let libraryPromise;
  function loadZipLibrary() {
    if (typeof fflate !== "undefined") return Promise.resolve(fflate);
    if (typeof document === "undefined") return Promise.reject(new Error("ไม่สามารถโหลดตัวสร้างไฟล์ได้"));
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "./vendor/fflate.min.js";
      script.onload = () => typeof fflate !== "undefined" ? resolve(fflate) : reject(new Error("โหลดตัวสร้างไฟล์ไม่สำเร็จ"));
      script.onerror = () => reject(new Error("โหลดตัวสร้างไฟล์ไม่สำเร็จ"));
      document.head.appendChild(script);
    });
    return libraryPromise;
  }

  async function download(model, filename) {
    const library = await loadZipLibrary();
    const bytes = createWorkbook(model, library);
    const url = URL.createObjectURL(new Blob([bytes], { type: MIME_XLSX }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { buildExportModel, createWorkbook, download, MIME_XLSX };
});

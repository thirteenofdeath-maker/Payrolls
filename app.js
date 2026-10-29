
function num(v){
  return Number(v) || 0;
}

/* ===== SETUP ===== */
const daysTH=["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const container=document.getElementById("cardContainer");
const calendarEl=document.getElementById("calendarDays");
const monthSelect=document.getElementById("monthSelect");
const yearSelect=document.getElementById("yearSelect");
const periodMonthPicker=document.getElementById("periodMonthPicker");
const periodPickerLabel=document.getElementById("periodPickerLabel");
const periodPickerRange=document.getElementById("periodPickerRange");
const periodPickerMonth=document.getElementById("periodPickerMonth");
const prevPeriodBtn=document.getElementById("prevPeriodBtn");
const nextPeriodBtn=document.getElementById("nextPeriodBtn");
const periodProgressText=document.getElementById("periodProgressText");
const periodProgressHint=document.getElementById("periodProgressHint");
const showMissingDaysBtn=document.getElementById("showMissingDaysBtn");
const missingDaysPanel=document.getElementById("missingDaysPanel");
const missingDaysList=document.getElementById("missingDaysList");

const monthNames=[
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
];

monthNames.forEach((m,i)=>{
  const o=document.createElement("option");
  o.value=i;o.textContent=m;
  monthSelect.appendChild(o);
});

const dailyInput  = document.getElementById("dailyWage");
const hourlyInput = document.getElementById("hourlyWage");
const nightShiftFeeInput = document.getElementById("nightShiftFee");
const nightFoodFeeInput = document.getElementById("nightFoodFee");
const otFoodFeeInput = document.getElementById("otFoodFee");
const socialSecurityPercentInput = document.getElementById("socialSecurityPercent");
const headerClock = document.getElementById("headerClock");
const headerDateRange = document.getElementById("headerDateRange");
const periodSummaryQuick = document.getElementById("periodSummaryQuick");
const periodQuickNet = document.getElementById("periodQuickNet");
const periodQuickDetail = document.getElementById("periodQuickDetail");
const inputToggle = document.getElementById("inputToggle");
const inputDetails = document.getElementById("inputDetails");
const summaryToggle = document.getElementById("summaryToggle");
const summaryShell = document.querySelector(".summary-shell");
const slipToggle = document.getElementById("slipToggle");
const slipDetails = document.getElementById("slipDetails");
const dashboardToggle = document.getElementById("dashboardToggle");
const slipDashboard = document.getElementById("slipDashboard");
const yearlyToggle = document.getElementById("yearlyToggle");
const yearlyDashboard = document.getElementById("yearlyDashboard");
const actualSlipGrossInput = document.getElementById("actualSlipGross");
const actualSlipDeductionsInput = document.getElementById("actualSlipDeductions");
const actualSlipNetInput = document.getElementById("actualSlipNet");
const actualSlipNoteInput = document.getElementById("actualSlipNote");
const saveActualSlipBtn = document.getElementById("saveActualSlipBtn");
const deleteActualSlipBtn = document.getElementById("deleteActualSlipBtn");
const actualSlipStatus = document.getElementById("actualSlipStatus");
const { calculatePayroll } = PayrollEngine;
const { analyzePeriod, describeMoneyDifference } = PayrollQuality;
const { buildYearSummary } = PayrollYearly;
const {
  createBackup,
  parseAndValidateBackup,
  restoreBackup,
  clearPeriodData,
  clearAllAppData
} = PayrollStorageTransfer;
let lastPayrollResult = null;
let missingDaysVisible = false;

function applyDaypartTone(now = new Date()) {
  let hour = now.getHours();
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Bangkok"
    }).format(now));
  } catch {
    // Use the device hour when the requested time zone is unavailable.
  }
  const daypart = hour >= 5 && hour < 8 ? "morning"
    : hour >= 8 && hour < 11 ? "late-morning"
    : hour >= 11 && hour < 14 ? "noon"
    : hour >= 14 && hour < 17 ? "afternoon"
    : hour >= 17 && hour < 20 ? "evening"
    : hour >= 20 && hour < 23 ? "night"
    : "late-night";
  const themeColors = {
    morning: "#607a65",
    "late-morning": "#6f7653",
    noon: "#7c6c4f",
    afternoon: "#7e6b4c",
    evening: "#715348",
    night: "#eef2f4",
    "late-night": "#e8eef2"
  };

  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-palette");
  document.documentElement.dataset.daypart = daypart;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColors[daypart]);
}

function toBuddhistYear(year) {
  return Number(year) + 543;
}

function normalizeYearValue(year) {
  const n = Number(year);
  if (!Number.isFinite(n)) return new Date().getFullYear();
  return n > 2400 ? n - 543 : n;
}

function syncPeriodPicker() {
  if (!periodMonthPicker || !periodPickerLabel || !periodPickerRange || !periodPickerMonth || monthSelect.value === "" || !yearSelect.value) return;

  const year = Number(yearSelect.value);
  const month = Number(monthSelect.value);
  periodMonthPicker.value = `${year}-${String(month + 1).padStart(2, "0")}`;
  periodPickerRange.textContent = getPeriodRangeCompactText();
  periodPickerMonth.textContent = `${monthNames[month]} ${toBuddhistYear(year)}`;
  periodMonthPicker.setAttribute("aria-label", `เลือกงวด ${getPeriodRangeText()} เดือนอ้างอิง ${monthNames[month]} ${toBuddhistYear(year)}`);
}

function formatThaiShortDate(d) {
  return d.toLocaleDateString("th-TH-u-ca-buddhist", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatThaiFullDate(d) {
  return d.toLocaleDateString("th-TH-u-ca-buddhist", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getPeriodRangeText() {
  if (!yearSelect.value || monthSelect.value === "") return "--";
  const y = Number(yearSelect.value);
  const m = Number(monthSelect.value);
  const start = new Date(y, m - 1, 16);
  const end = new Date(y, m, 15);
  return `${formatThaiShortDate(start)} - ${formatThaiShortDate(end)}`;
}

function getPeriodRangeCompactText() {
  if (!yearSelect.value || monthSelect.value === "") return "เลือกงวดจ่าย";
  const y = Number(yearSelect.value);
  const m = Number(monthSelect.value);
  const format = date => date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return `งวด ${format(new Date(y, m - 1, 16))} – ${format(new Date(y, m, 15))}`;
}

function updateHeaderInfo() {
  const now = new Date();
  if (headerClock) {
    const timeText = now.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    headerClock.innerHTML = `<span class="clock-date">${formatThaiFullDate(now)}</span><span class="clock-time">${timeText}</span>`;
  }
  if (headerDateRange) {
    headerDateRange.textContent = getPeriodRangeText();
  }
}

function getSummaryCollapseTarget() {
  return document.querySelector("#result .summary-panel");
}

function setPanelCollapsed(panel, collapsed, immediate = false) {
  if (!panel) return Promise.resolve();

  panel.style.overflow = "hidden";
  panel.style.willChange = "max-height, opacity, transform";

  if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    panel.hidden = collapsed;
    panel.style.maxHeight = collapsed ? "0px" : "none";
    panel.style.opacity = collapsed ? "0" : "1";
    panel.style.transform = collapsed ? "translateY(-8px)" : "translateY(0)";
    return Promise.resolve();
  }

  const duration = collapsed ? 260 : 340;
  const easing = collapsed ? "ease-in" : "ease-out";

  if (collapsed) {
    panel.hidden = false;
    const startHeight = panel.scrollHeight;
    panel.style.maxHeight = startHeight + "px";
    panel.style.opacity = "1";
    panel.style.transform = "translateY(0)";

    const anim = panel.animate([
      { maxHeight: startHeight + "px", opacity: 1, transform: "translateY(0)" },
      { maxHeight: "0px", opacity: 0, transform: "translateY(-8px)" }
    ], { duration, easing, fill: "forwards" });

    return anim.finished.then(() => {
      panel.hidden = true;
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
      panel.style.transform = "translateY(-8px)";
    });
  }

  panel.hidden = false;
  panel.style.maxHeight = "0px";
  panel.style.opacity = "0";
  panel.style.transform = "translateY(-8px)";
  const endHeight = panel.scrollHeight;

  const anim = panel.animate([
    { maxHeight: "0px", opacity: 0, transform: "translateY(-8px)" },
    { maxHeight: endHeight + "px", opacity: 1, transform: "translateY(0)" }
  ], { duration, easing, fill: "forwards" });

  return anim.finished.then(() => {
    panel.hidden = false;
    panel.style.maxHeight = "none";
    panel.style.opacity = "1";
    panel.style.transform = "translateY(0)";
  });
}

function updateCollapseButton(button, collapsed, text, expandedLabel, collapsedLabel) {
  if (!button) return;
  button.setAttribute("aria-expanded", String(!collapsed));
  const stateEl = button.querySelector(".collapse-state");
  const iconEl = button.querySelector(".collapse-icon");
  if (stateEl) stateEl.textContent = collapsed ? "แสดง" : "ซ่อน";
  if (iconEl) iconEl.textContent = collapsed ? "แสดง" : "ซ่อน";
  button.querySelector(".collapse-text").textContent = text;
  button.setAttribute("aria-label", collapsed ? collapsedLabel : expandedLabel);
}

function setInputCollapsed(collapsed, immediate = false) {
  if (!inputDetails || !inputToggle) return;
  updateCollapseButton(inputToggle, collapsed, "ช่องกรอกข้อมูล", "ซ่อนช่องกรอกข้อมูล", "แสดงช่องกรอกข้อมูล");
  localStorage.setItem("payrollInputCollapsed", collapsed ? "1" : "0");
  setPanelCollapsed(inputDetails, collapsed, immediate);
}

function setSummaryCollapsed(collapsed, immediate = false) {
  if (!summaryShell || !summaryToggle) return;
  summaryShell.classList.toggle("summary-collapsed", collapsed);
  updateCollapseButton(summaryToggle, collapsed, "รายการสรุป", "ซ่อนรายการสรุปเงินเดือน", "แสดงรายการสรุปเงินเดือน");
  localStorage.setItem("payrollSummaryCollapsed", collapsed ? "1" : "0");
  setPanelCollapsed(getSummaryCollapseTarget(), collapsed, immediate);
}

function setSlipCollapsed(collapsed, immediate = false) {
  if (!slipDetails || !slipToggle) return;
  updateCollapseButton(slipToggle, collapsed, "สลิปเงินจริง", "ซ่อนช่องกรอกสลิปจริง", "แสดงช่องกรอกสลิปจริง");
  localStorage.setItem("payrollSlipCollapsed", collapsed ? "1" : "0");
  setPanelCollapsed(slipDetails, collapsed, immediate);
}

function setDashboardCollapsed(collapsed, immediate = false) {
  if (!slipDashboard || !dashboardToggle) return;
  updateCollapseButton(dashboardToggle, collapsed, "Dashboard เปรียบเทียบสลิป", "ซ่อน Dashboard เปรียบเทียบสลิป", "แสดง Dashboard เปรียบเทียบสลิป");
  localStorage.setItem("payrollDashboardCollapsed", collapsed ? "1" : "0");
  setPanelCollapsed(slipDashboard, collapsed, immediate);
}

function setYearlyCollapsed(collapsed, immediate = false) {
  if (!yearlyDashboard || !yearlyToggle) return;
  updateCollapseButton(yearlyToggle, collapsed, "สรุปรายปี", "ซ่อนสรุปรายปี", "แสดงสรุปรายปี");
  localStorage.setItem("payrollYearlyCollapsed", collapsed ? "1" : "0");
  setPanelCollapsed(yearlyDashboard, collapsed, immediate);
}

if (inputToggle) {
  inputToggle.onclick = () => setInputCollapsed(!inputToggle.matches('[aria-expanded="false"]'));
}
if (summaryToggle) {
  summaryToggle.onclick = () => setSummaryCollapsed(!summaryShell.classList.contains("summary-collapsed"));
}
if (slipToggle) {
  slipToggle.onclick = () => setSlipCollapsed(slipToggle.getAttribute("aria-expanded") === "true");
}
if (dashboardToggle) {
  dashboardToggle.onclick = () => setDashboardCollapsed(dashboardToggle.getAttribute("aria-expanded") === "true");
}
if (yearlyToggle) {
  yearlyToggle.onclick = () => setYearlyCollapsed(yearlyToggle.getAttribute("aria-expanded") === "true");
}

function syncHourly(){
  const daily = num(dailyInput.value);
  hourlyInput.value = (daily / 8).toFixed(2);
}

// initial
syncHourly();

// change
// Events for these inputs are registered once in the settings section below
// to avoid duplicate renderSummary() calls.

let selectedDate=null;
let expandRow=null;
let activeCell = null; // cell ที่เปิดอยู่จริง
let lastTapTime = 0;

/* ===== UTIL ===== */
function formatLocalDate(d){
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function getMonthKey(){
  return `payroll-${yearSelect.value}-${monthSelect.value}`;
}

/* ===== STORAGE ===== */
function saveCards(){
  const data = [...document.querySelectorAll(".card")].map(c => ({
    date: c.dataset.date,
    status: c.querySelector(".status").value,
    shift: c.querySelector(".shift").value,    // เพิ่ม
    normal: c.querySelector(".normal").value,  // เพิ่ม
    ot: c.querySelector(".ot").value,          // เพิ่ม
    skill: c.querySelector(".skillDaily").value // บันทึกค่าทักษะรายวัน
  }));
  localStorage.setItem(getMonthKey(), JSON.stringify(data));
}
function loadCards() {
  const raw = localStorage.getItem(getMonthKey());
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(item =>
      item &&
      typeof item === "object" &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || ""))
    );
  } catch (error) {
    console.warn("Ignoring invalid saved payroll data:", error);
    return [];
  }
}

function updateBadge(card) {
    const b = card.querySelector(".badge");
    const statusEl = card.querySelector(".status");
    if (!b || !statusEl) return;

    const s = statusEl.value.trim();

    // 1. ล้างคลาสสีเดิมออกให้หมดก่อน
    b.classList.remove("badge-normal","badge-work", "badge-holiday", "badge-leave", "badge-absent");

    if (!s) {
        b.classList.add("badge-normal");
        b.textContent = "--เลือกวัน--";
        return;
    }

    // 2. ตรวจสอบเงื่อนไขและใส่สีตามที่กำหนดไว้ใน CSS
    if (s === "ขาดงาน") {
        b.classList.add("badge-absent"); // สีแดง
    }
    else if (s.includes("หยุด")) {
        b.classList.add("badge-holiday"); // สีเทา
    }
    else if (s.includes("ลา") || s.includes("ป่วย")) {
        b.classList.add("badge-leave"); // สีส้ม
    }
    else if (s === "วันทำงาน") {
        b.classList.add("badge-work"); // สีเขียวสำหรับ "วันทำงาน"
    }
    else {
        b.classList.add("badge-normal");
    }
    b.textContent = s; // อัปเดตข้อความในป้าย
}

function createCard(date, saved) {
  const dateStr = formatLocalDate(date);
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.date = dateStr;
  card.innerHTML = `
    <div class="card-header">
      <div class="card-date"><svg class="oh-icon" aria-hidden="true"><use href="#icon-calendar"></use></svg>${dateStr} (${daysTH[date.getDay()]})</div>
      <div class="card-actions">
        <span class="badge"></span>
      </div>
    </div>
    <div class="card-body">
      <div class="row"><label><svg class="oh-icon" aria-hidden="true"><use href="#icon-pin"></use></svg>สถานะ</label>
        <select class="status">
          <option value="">--เลือกวัน--</option>
          <option>วันทำงาน</option>
          <option>วันหยุด</option>
          <option>วันหยุดพิเศษ</option>
          <option>ลาพักร้อน</option>
          <option>ลาป่วยแพทย์(เขียนใบสอบสวน)</option>
          <option>ลากิจพิเศษ</option>
          <option>ลาป่วย</option>
          <option>ลากิจ</option>
          <option>ขาดงาน</option>
        </select>
      </div>
      <div class="row"><label><svg class="oh-icon" aria-hidden="true"><use href="#icon-clock"></use></svg>กะ</label>
        <select class="shift">
          <option value="">--เลือกกะ--</option>
          <option value="เช้า">กะเช้า</option>
          <option value="ดึก">กะดึก</option>
        </select>
      </div>
      <div class="row"><label><svg class="oh-icon" aria-hidden="true"><use href="#icon-gauge"></use></svg>ช่วงเวลาปกติ</label>
        <select class="normal">
          <option value="0">-</option>
          <option value="4">4 ชม.(ครึ่งวัน)</option>
          <option value="6">6 ชม.(มาสาย)</option>
          <option value="8">8 ชม.(เต็มวัน)</option>
        </select>
      </div>
      <div class="row"><label><svg class="oh-icon" aria-hidden="true"><use href="#icon-timer"></use></svg>ช่วงเวลาโอที</label>
        <select class="ot">
          <option value="0">-</option>
          <!-- ค่า value เป็นหน่วยคำนวณจากไฟล์ HR โดยตรง ไม่ใช่ decimal hours -->
          <option value="0.17">10 น.(โอทีบังคับ)</option>
          <option value="2.51">2 ชม. 30 น.</option>
          <option value="4.51">4 ชม. 30 น.</option>
        </select>
      </div>
      <div class="row"><label><svg class="oh-icon" aria-hidden="true"><use href="#icon-sparkles"></use></svg>ทักษะ</label>
        <select class="skillDaily">
          <option value="0">ไม่ได้รับ</option>
          <option value="1">ได้รับ</option>
        </select>
      </div>
    </div>


  `;

  container.appendChild(card);

  // --- กำหนดค่าเริ่มต้น (Load Saved Data) ---
  const statusSelect = card.querySelector(".status");
  const shiftSelect = card.querySelector(".shift");
  const normalSelect = card.querySelector(".normal");
  const otSelect = card.querySelector(".ot");
  const skillDailySelect = card.querySelector(".skillDaily");

  statusSelect.value = saved?.status || "";
  shiftSelect.value = saved?.shift || "";
  normalSelect.value = saved?.normal || "0";
  otSelect.value = saved?.ot || "0";
  skillDailySelect.value = saved?.skill || "0";

  syncCardControls(card, true);
  updateBadge(card);

  // ค้นหาส่วนนี้ในฟังก์ชัน createCard
  [statusSelect, shiftSelect, normalSelect, otSelect, skillDailySelect].forEach(el => {
      el.onchange = () => {
          if (el === statusSelect) syncCardControls(card, true);
          updateBadge(card);
          saveCards();

          // อัปเดตสีบนปฏิทินทันที
          const cell = document.querySelector(`.day-cell[data-date="${card.dataset.date}"]`);
          if (cell) {
              const currentDate = new Date(`${card.dataset.date}T00:00:00`);
              cell.setAttribute("aria-label", getCalendarDayLabel(currentDate, {
                  status: statusSelect.value,
                  shift: shiftSelect.value
              }));
              // ล้างคลาสทั้งหมดก่อน
              cell.classList.remove("day-normal","day-work", "day-holiday", "day-leave", "day-absent", "shift-morning", "shift-night");

              //  ใส่คลาสสถานะ (จุดซ้าย)
              const sClass = getStatusClass(statusSelect.value);
              if (sClass) cell.classList.add(sClass);

              // ใส่คลาสประจำกะ (จุดขวา)
              const shClass = getShiftClass(shiftSelect.value);
              if (shClass) cell.classList.add(shClass);
          }

          renderSummary();
      };
  });
}

function syncCardControls(card, resetInvalid = false) {
  const statusSelect = card.querySelector(".status");
  const controlledFields = [
    card.querySelector(".shift"),
    card.querySelector(".normal"),
    card.querySelector(".ot"),
    card.querySelector(".skillDaily")
  ];
  const hasNoPayableWork = !statusSelect.value || statusSelect.value === "ขาดงาน";

  if (hasNoPayableWork && resetInvalid) {
    controlledFields[0].value = "";
    controlledFields[1].value = "0";
    controlledFields[2].value = "0";
    controlledFields[3].value = "0";
  }

  controlledFields.forEach(field => {
    field.disabled = hasNoPayableWork;
  });
}
/* ===== CALENDAR ===== */
function getStatusClass(status) {
    if (!status || status === "--เลือกวัน--") return "";
    if (status.includes("หยุด")) return "day-holiday";
    if (status.includes("ลา")) return "day-leave";
    if (status === "ขาดงาน") return "day-absent";
    if (status === "วันทำงาน") return "day-work";
    return "";
}

// เพิ่มฟังก์ชันใหม่สำหรับกะ
function getShiftClass(shift) {
    if (shift === "เช้า") return "shift-morning";
    if (shift === "ดึก") return "shift-night";
    return "";
}

function getCalendarDayLabel(date, dayData) {
    const details = [];
    if (dayData?.status) details.push(dayData.status);
    if (dayData?.shift) details.push(`กะ${dayData.shift}`);
    const suffix = details.length ? `, ${details.join(", ")}` : ", ยังไม่ได้เลือกสถานะ";
    return `${formatThaiFullDate(date)}${suffix}`;
}

function setActiveCalendarCell(cell = null) {
    document.querySelectorAll(".day-cell").forEach(dayCell => {
        const isActive = dayCell === cell;
        dayCell.classList.toggle("active", isActive);
        dayCell.setAttribute("aria-expanded", isActive ? "true" : "false");
        if (isActive) {
            dayCell.setAttribute("aria-controls", "calendarDayDetails");
        } else {
            dayCell.removeAttribute("aria-controls");
        }
    });
}

function renderCalendar() {
    calendarEl.innerHTML = "";
    selectedDate = null;
    activeCell = null;
    removeExpand(true);

    const y = +yearSelect.value;
    const m = +monthSelect.value;

    // ขอบเขตวันที่: 16 เดือนที่แล้ว ถึง 15 เดือนนี้
    const start = new Date(y, m - 1, 16);
    const end = new Date(y, m, 15);

    // 1. สร้างช่องว่าง (Blank) ของแถวแรก
    // หาว่าวันที่ 16 (วันเริ่มวิก) ตรงกับวันอะไร (0=อาทิตย์, 6=เสาร์)
    const firstDayType = start.getDay();
    for (let i = 0; i < firstDayType; i++) {
        const blank = document.createElement("div");
        blank.className = "day-cell-blank";
        calendarEl.appendChild(blank);
    }

    // 2. ดึงข้อมูลที่บันทึกไว้
    const savedDataList = loadCards();

    // 3. วนลูปสร้างวันที่ตั้งแต่วันที่ 16 ถึง 15
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = formatLocalDate(d);
        const dayOfWeek = d.getDay();

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "day-cell";
        cell.textContent = d.getDate();
        cell.dataset.date = key;
        cell.setAttribute("aria-expanded", "false");
        if (key === formatLocalDate(new Date())) cell.setAttribute("aria-current", "date");

        // แสดงสถานะทั้งทางภาพและข้อความสำหรับ screen reader
        const dayData = savedDataList.find(x => x.date === key);
        cell.setAttribute("aria-label", getCalendarDayLabel(d, dayData));
        if (dayData) {
            const sClass = getStatusClass(dayData.status);
            if (sClass) cell.classList.add(sClass);

            const shClass = getShiftClass(dayData.shift);
            if (shClass) cell.classList.add(shClass);
        }

        cell.addEventListener("click", () => toggleInline(cell));
        calendarEl.appendChild(cell);
    }
}

function slideOpen(element) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.style.maxHeight = "none";
    element.style.opacity = "1";
    element.style.transform = "none";
    return Promise.resolve();
  }

  return element.animate([
    {
      maxHeight: "0px",
      opacity: 0,
      transform: "translateY(-10px)" // เริ่มจากขยับขึ้นไปนิดนึง
    },
    {
      maxHeight: "500px", // ค่าที่พอดีกับความสูงการ์ด
      opacity: 1,
      transform: "translateY(0)"
    }
  ], {
    duration: 350, // ปรับความช้า-เร็วที่ตรงนี้ (350ms กำลังนุ่ม)
    easing: "ease-out", // ค่อยๆ ผ่อนตอนจบ
    fill: "forwards"
  });
}

function slideClose(element) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.style.maxHeight = "0";
    element.style.opacity = "0";
    return Promise.resolve();
  }

  return element.animate([
    {
      maxHeight: "500px",
      opacity: 1,
      transform: "translateY(0)"
    },
    {
      maxHeight: "0px",
      opacity: 0,
      transform: "translateY(-10px)"
    }
  ], {
    duration: 250,
    easing: "ease-in",
    fill: "forwards"
  }).finished; // คืนค่า promise เมื่อจบ animation
}

function toggleInline(cell) {
    const dateKey = cell.dataset.date;
    // ใช้เฉพาะ cell ของปฏิทินจริง ๆ ไม่รวมแถวการ์ดที่ถูกแทรกเข้ามา
    const cells = [...calendarEl.children].filter(el =>
        el.classList.contains("day-cell") || el.classList.contains("day-cell-blank")
    );
    const index = cells.indexOf(cell);
    if (index === -1) return;
    const rowIndex = Math.floor(index / 7);
    const rowEnd = rowIndex * 7 + 6;

    /* 1. กรณีเลือกซ้ำวันเดิม -> ปิดการ์ด */
    if (selectedDate === dateKey && activeCell === cell && expandRow) {
        slideClose(expandRow).then(() => {
            removeExpand(true);
            setActiveCalendarCell(null);
            selectedDate = null;
            activeCell = null;
        });
        return;
    }

    /* 2. กรณีเลือกวันใหม่ (ไม่ว่าจะแถวเดิมหรือคนละแถว) */

    // เก็บสถานะว่าเป็นการเปลี่ยนในแถวเดิมหรือไม่ก่อนจะลบอะไร
    const isSameRow = expandRow && expandRow.dataset.rowIndex == rowIndex;

    setActiveCalendarCell(cell);

    selectedDate = dateKey;
    activeCell = cell;

    if (isSameRow) {
        /* --- กรณีแถวเดิม: สลับเนื้อหาการ์ดทันที --- */
        const card = document.querySelector(`.card[data-date="${dateKey}"]`);
        if (card) {
            const oldCard = expandRow.querySelector(".card");
            if (oldCard) {
                document.getElementById("cardContainer").appendChild(oldCard);
                oldCard.style.display = "none";
            }
            expandRow.appendChild(card);
            card.style.display = "block";
            updateBadge(card);
        }
    } else {
        /* --- กรณีคนละแถว: ปิดของเก่า (ทันที) แล้วเปิดของใหม่ (สไลด์ลง) --- */
        removeExpand(true);

        expandRow = document.createElement("div");
        expandRow.className = "calendar-expand";
        expandRow.id = "calendarDayDetails";
        expandRow.setAttribute("role", "region");
        expandRow.setAttribute("aria-label", `รายละเอียดวันที่ ${dateKey}`);
        expandRow.dataset.rowIndex = rowIndex;

        const card = document.querySelector(`.card[data-date="${dateKey}"]`);
        if (card) {
            expandRow.appendChild(card);
            card.style.display = "block";
            updateBadge(card);
        }

        // แทรก expandRow เข้าไปหลังจบแถวนั้นๆ
        if (cells[rowEnd + 1]) {
            calendarEl.insertBefore(expandRow, cells[rowEnd + 1]);
        } else {
            calendarEl.appendChild(expandRow);
        }

        slideOpen(expandRow);
    }
}

function removeExpand(immediate = false) {
    if (!expandRow) return;

    const cleanupLogic = () => {
        const cardInExpand = expandRow.querySelector(".card");
        if (cardInExpand) {
            document.getElementById("cardContainer").appendChild(cardInExpand);
            cardInExpand.style.display = "none";
        }
        expandRow.remove();
        expandRow = null;
    };

    if (immediate) {
        cleanupLogic();
    } else {
        // หากต้องการสไลด์ปิดให้ใช้ slideClose ที่ส่งให้ก่อนหน้า
        slideClose(expandRow).then(cleanupLogic);
    }

    // ลบบรรทัดที่สั่งลบ .active ทิ้งไป (เราจะไปลบใน toggleInline แทน)
}
// Settings
function getSettings(){
  const DAILY_WAGE = num(dailyInput.value);
  return {
    DAILY_WAGE, HOURLY_WAGE: DAILY_WAGE/8,
    OT_RATE_1:1,OT_RATE_15:1.5, OT_RATE_2:2, OT_RATE_3:3,
    NIGHT_SHIFT_FEE:num(nightShiftFeeInput.value), FOOD_NIGHT_FEE:num(nightFoodFeeInput.value), FOOD_OT_FEE:num(otFoodFeeInput.value), SKILL_FEE:20,MENTOR_FEE:200,
    SOCIAL_SECURITY_PERCENT:num(socialSecurityPercentInput.value),
    SOCIAL_SECURITY_RATE:num(socialSecurityPercentInput.value)/100
  };
}

/* ===== RENDER MONTH ===== */
function renderMonth(){
  container.innerHTML="";
  const y=+yearSelect.value;
  const m=+monthSelect.value;
  const start=new Date(y,m-1,16);
  const end=new Date(y,m,15);

  const saved=loadCards();
  const map={};
  saved.forEach(d=>map[d.date]=d);

  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
    createCard(d,map[formatLocalDate(d)]);
  }

  document.querySelectorAll(".card").forEach(card=>{
  updateBadge(card);
  });

  renderCalendar();

  renderSummary();
}

function getPayrollData(){
  const S = getSettings();
  return {
    settings: {
      ...S,
      mentor: document.getElementById("mentorCheck").checked,
      incentive1: num(document.getElementById("incentive1").value),
      incentive2: num(document.getElementById("incentive2").value)
    },
    days: [...document.querySelectorAll(".card")].map(card => ({
      date: card.dataset.date,
      status: card.querySelector(".status").value,
      shift: card.querySelector(".shift").value,
      normalHours: num(card.querySelector(".normal").value),
      normalHoursRaw: card.querySelector(".normal").value,
      otHours: num(card.querySelector(".ot").value),
      skill: num(card.querySelector(".skillDaily").value) === 1
    }))
  };
}

function formatPeriodDay(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function renderMissingDays(quality) {
  if (!missingDaysList) return;
  missingDaysList.innerHTML = quality.missingDates.map(date =>
    `<button type="button" class="missing-day-chip" data-missing-date="${date}">${formatPeriodDay(date)}</button>`
  ).join("");

  missingDaysList.querySelectorAll(".missing-day-chip").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      const cell = document.querySelector(`.day-cell[data-date="${button.dataset.missingDate}"]`);
      if (!cell) return;
      cell.scrollIntoView({ behavior: "smooth", block: "center" });
      cell.click();
      window.setTimeout(() => cell.focus(), 250);
    });
  });
}

function updatePeriodCompleteness(data = getPayrollData()) {
  const quality = analyzePeriod(data.days, { hasActualSlip: Boolean(readActualSlip()) });
  if (!periodProgressText || !periodProgressHint || !showMissingDaysBtn || !missingDaysPanel) return quality;

  periodProgressText.textContent = `ลงข้อมูลแล้ว ${quality.completedDays}/${quality.totalDays} วัน`;
  if (quality.completedDays === 0) {
    periodProgressHint.textContent = "เลือกวันที่ในปฏิทินเพื่อเริ่มลงข้อมูล";
  } else if (quality.missingDates.length) {
    periodProgressHint.textContent = `เหลืออีก ${quality.missingDates.length} วันที่ยังไม่ได้เลือกสถานะ`;
  } else {
    periodProgressHint.textContent = "เลือกสถานะครบทุกวันในงวดแล้ว";
  }

  const hasMissing = quality.missingDates.length > 0;
  if (!hasMissing) missingDaysVisible = false;
  showMissingDaysBtn.disabled = !hasMissing;
  showMissingDaysBtn.textContent = hasMissing
    ? (missingDaysVisible ? "ซ่อนวันที่ยังไม่ได้กรอก" : "ดูวันที่ยังไม่ได้กรอก")
    : "ข้อมูลครบแล้ว";
  showMissingDaysBtn.setAttribute("aria-expanded", missingDaysVisible ? "true" : "false");
  missingDaysPanel.hidden = !missingDaysVisible;
  renderMissingDays(quality);

  const missingSet = new Set(quality.missingDates);
  document.querySelectorAll(".day-cell").forEach(cell => {
    cell.classList.toggle("day-missing", missingDaysVisible && missingSet.has(cell.dataset.date));
  });
  return quality;
}

function renderSummary(){
  const data = getPayrollData();
  updatePeriodCompleteness(data);
  calculate(data);
}
function format2(v){
  return Number(v || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getActualSlipKey(year = yearSelect.value, month = monthSelect.value) {
  return `actual-slip-${year}-${month}`;
}

function optionalMoney(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readActualSlip(year = yearSelect.value, month = monthSelect.value) {
  try {
    const parsed = JSON.parse(localStorage.getItem(getActualSlipKey(year, month)));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const net = optionalMoney(parsed.net);
    if (net === null) return null;
    return {
      gross: optionalMoney(parsed.gross),
      deductions: optionalMoney(parsed.deductions),
      net,
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 500) : "",
      estimatedGross: optionalMoney(parsed.estimatedGross),
      estimatedDeductions: optionalMoney(parsed.estimatedDeductions),
      estimatedNet: optionalMoney(parsed.estimatedNet),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : ""
    };
  } catch {
    return null;
  }
}

function setActualSlipStatus(message, state = "") {
  if (!actualSlipStatus) return;
  actualSlipStatus.textContent = message;
  actualSlipStatus.dataset.state = state;
}

function loadActualSlip() {
  const slip = readActualSlip();
  actualSlipGrossInput.value = slip?.gross ?? "";
  actualSlipDeductionsInput.value = slip?.deductions ?? "";
  actualSlipNetInput.value = slip?.net ?? "";
  actualSlipNoteInput.value = slip?.note ?? "";
  deleteActualSlipBtn.hidden = !slip;
  setActualSlipStatus(slip ? "โหลดข้อมูลสลิปของงวดนี้แล้ว" : "ยังไม่มีข้อมูลสลิปจริงของงวดนี้");
}

function periodLabelFromStorage(year, month) {
  const monthIndex = Number(month);
  return `${monthNames[monthIndex] || ""} ${toBuddhistYear(year)}`.trim();
}

function listActualSlipHistory() {
  const items = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    const match = /^actual-slip-(\d{4})-(?:([0-9])|(1[01]))$/.exec(key || "");
    if (!match) continue;
    const year = match[1];
    const month = match[2] ?? match[3];
    const slip = readActualSlip(year, month);
    if (!slip || slip.estimatedNet === null) continue;
    items.push({
      key,
      year: Number(year),
      month: Number(month),
      label: periodLabelFromStorage(year, month),
      estimatedNet: slip.estimatedNet,
      actualNet: slip.net
    });
  }
  return items
    .sort((left, right) => left.year - right.year || left.month - right.month)
    .slice(-6);
}

function moneyOrWaiting(value) {
  return value === null ? "ยังไม่กรอก" : `${format2(value)} บาท`;
}

function differenceText(actual, estimated) {
  if (actual === null || estimated === null) return "—";
  const difference = actual - estimated;
  return `${difference > 0 ? "+" : ""}${format2(difference)} บาท`;
}

function renderSlipDashboard(result = lastPayrollResult) {
  if (!slipDashboard || !result) return;
  const slip = readActualSlip();
  if (!slip) {
    slipDashboard.innerHTML = `
      <div class="dashboard-card dashboard-empty">
        <strong>ยังไม่มีสลิปจริงสำหรับเปรียบเทียบ</strong>
        <span>เปิด “สลิปเงินจริง” แล้วกรอกยอดสุทธิจากสลิปของงวดนี้</span>
      </div>`;
    setDashboardCollapsed(dashboardToggle?.getAttribute("aria-expanded") === "false", true);
    return;
  }

  const estimatedGross = result.totals.totalIncome;
  const estimatedDeductions = result.deductions.socialSecurity;
  const estimatedNet = result.totals.netPay;
  const netDifference = slip.net - estimatedNet;
  const variancePercent = estimatedNet !== 0 ? (netDifference / estimatedNet) * 100 : null;
  const absolutePercent = variancePercent === null ? null : Math.abs(variancePercent);
  const status = absolutePercent === null ? "ไม่มีฐานคำนวณ"
    : absolutePercent < 0.01 ? "ตรงกัน"
    : absolutePercent <= 1 ? "ใกล้เคียง"
    : "ควรตรวจสอบรายการต่าง";
  const varianceClass = netDifference > 0 ? "variance-positive" : netDifference < 0 ? "variance-negative" : "";
  const rows = [
    ["รายได้รวม", estimatedGross, slip.gross],
    ["รายการหัก", estimatedDeductions, slip.deductions],
    ["ยอดสุทธิ", estimatedNet, slip.net]
  ];
  const explanations = rows.map(([label, estimated, actual]) =>
    describeMoneyDifference(actual, estimated, label)
  );

  const currentKey = getActualSlipKey();
  const history = listActualSlipHistory().map(item =>
    item.key === currentKey ? { ...item, estimatedNet } : item
  );
  const maxHistoryValue = Math.max(1, ...history.flatMap(item => [item.estimatedNet, item.actualNet]));
  const historyMarkup = history.length ? `
    <div class="history-block">
      <h3 class="history-heading">แนวโน้ม 6 งวดล่าสุด</h3>
      <div class="history-list">
        ${history.map(item => {
          const difference = item.actualNet - item.estimatedNet;
          return `
            <div class="history-item">
              <span class="history-period">${item.label}</span>
              <div class="history-bars" aria-label="${item.label}: คำนวณ ${format2(item.estimatedNet)} บาท สลิปจริง ${format2(item.actualNet)} บาท">
                <span class="history-bar-track"><i class="history-bar history-bar-estimated" style="width:${Math.max(2, item.estimatedNet / maxHistoryValue * 100)}%"></i></span>
                <span class="history-bar-track"><i class="history-bar history-bar-actual" style="width:${Math.max(2, item.actualNet / maxHistoryValue * 100)}%"></i></span>
              </div>
              <span class="history-variance">ต่าง ${difference > 0 ? "+" : ""}${format2(difference)}</span>
            </div>`;
        }).join("")}
      </div>
      <div class="history-legend">
        <span><i class="history-bar-estimated"></i>ยอดคำนวณ</span>
        <span><i class="history-bar-actual"></i>ยอดตามสลิปจริง</span>
      </div>
    </div>` : "";

  slipDashboard.innerHTML = `
    <div class="dashboard-card">
      <div class="comparison-hero">
        <div class="comparison-metric"><span>คำนวณสุทธิ</span><strong>${format2(estimatedNet)}</strong></div>
        <div class="comparison-metric metric-net"><span>ตามสลิปจริง</span><strong>${format2(slip.net)}</strong></div>
        <div class="comparison-metric ${varianceClass}"><span>ผลต่าง</span><strong>${netDifference > 0 ? "+" : ""}${format2(netDifference)}</strong></div>
        <div class="comparison-metric"><span>คลาดเคลื่อน</span><strong>${variancePercent === null ? "—" : `${variancePercent > 0 ? "+" : ""}${format2(variancePercent)}%`}</strong></div>
      </div>
      <div class="comparison-table">
        <div class="comparison-row comparison-row-head"><span>รายการ</span><span>คำนวณ</span><span>สลิปจริง</span><span>ผลต่าง</span></div>
        ${rows.map(([label, estimated, actual]) => `
          <div class="comparison-row">
            <b>${label}</b><span>${moneyOrWaiting(estimated)}</span><span>${moneyOrWaiting(actual)}</span><span>${differenceText(actual, estimated)}</span>
          </div>`).join("")}
      </div>
      <div class="comparison-explanations" aria-label="คำอธิบายผลต่าง">
        ${explanations.map(text => `<p class="comparison-explanation">${text}</p>`).join("")}
      </div>
      <p class="comparison-status">สถานะ: <b>${status}</b>${slip.note ? ` · มีหมายเหตุจากสลิป` : ""}</p>
      ${historyMarkup}
    </div>`;
  setDashboardCollapsed(dashboardToggle?.getAttribute("aria-expanded") === "false", true);
}

const monthShortNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function safeParseStorage(key, fallback = null) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function storedPeriodSettings(year, month) {
  const saved = safeParseStorage(`settings-${year}-${month}`, {});
  const dailyWage = num(saved?.dailyWage || 447);
  const socialPercent = num(saved?.socialSecurityPercent ?? 5);
  return {
    DAILY_WAGE: dailyWage,
    HOURLY_WAGE: dailyWage / 8,
    OT_RATE_1: 1,
    OT_RATE_15: 1.5,
    OT_RATE_2: 2,
    OT_RATE_3: 3,
    NIGHT_SHIFT_FEE: num(saved?.nightShiftFee || 140),
    FOOD_NIGHT_FEE: num(saved?.nightFoodFee || 70),
    FOOD_OT_FEE: num(saved?.otFoodFee || 45),
    SKILL_FEE: 20,
    MENTOR_FEE: 200,
    SOCIAL_SECURITY_PERCENT: socialPercent,
    SOCIAL_SECURITY_RATE: socialPercent / 100,
    mentor: Boolean(saved?.mentor),
    incentive1: num(saved?.incentive1),
    incentive2: num(saved?.incentive2)
  };
}

function storedPeriodData(year, month) {
  if (Number(yearSelect.value) === Number(year) && Number(monthSelect.value) === Number(month)) {
    const data = getPayrollData();
    return {
      year: Number(year),
      month: Number(month),
      data,
      hasData: data.days.some(day => String(day.status || "").trim()),
      slip: readActualSlip(year, month)
    };
  }

  const cards = safeParseStorage(`payroll-${year}-${month}`, []);
  const days = Array.isArray(cards) ? cards.map(card => ({
    date: String(card?.date || ""),
    status: String(card?.status || ""),
    shift: String(card?.shift || ""),
    normalHours: num(card?.normal),
    normalHoursRaw: String(card?.normal ?? ""),
    otHours: num(card?.ot),
    skill: num(card?.skill) === 1
  })) : [];

  return {
    year: Number(year),
    month: Number(month),
    data: { settings: storedPeriodSettings(year, month), days },
    hasData: days.some(day => day.status.trim()),
    slip: readActualSlip(year, month)
  };
}

function listYearlyYears() {
  const years = new Set([Number(yearSelect.value) || new Date().getFullYear()]);
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index) || "";
    const match = /^(?:payroll|settings|actual-slip)-(\d{4})-(?:[0-9]|1[01])$/.exec(key);
    if (match) years.add(Number(match[1]));
  }
  const storedYear = Number(localStorage.getItem("payrollYearlyYear"));
  if (Number.isInteger(storedYear)) years.add(storedYear);
  return [...years].sort((left, right) => right - left);
}

function compactMoney(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1
  });
}

function yearlyLineChart(months) {
  const width = 720;
  const height = 250;
  const plot = { left: 54, right: 18, top: 20, bottom: 42 };
  const values = months.flatMap(month => [month.estimatedNet, month.actualNet]).filter(value => value !== null);
  if (!values.length) return "";
  const maxValue = Math.max(1, ...values) * 1.08;
  const chartWidth = width - plot.left - plot.right;
  const chartHeight = height - plot.top - plot.bottom;
  const x = index => plot.left + (chartWidth * index / 11);
  const y = value => plot.top + chartHeight - (Number(value) / maxValue * chartHeight);
  const points = field => months
    .map((month, index) => month[field] === null ? null : `${x(index).toFixed(1)},${y(month[field]).toFixed(1)}`)
    .filter(Boolean)
    .join(" ");
  const grid = Array.from({ length: 5 }, (_, index) => {
    const amount = maxValue * (4 - index) / 4;
    const gridY = plot.top + chartHeight * index / 4;
    return `<line class="year-chart-grid" x1="${plot.left}" y1="${gridY}" x2="${width - plot.right}" y2="${gridY}"></line><text class="year-chart-axis" x="${plot.left - 8}" y="${gridY + 4}" text-anchor="end">${compactMoney(amount)}</text>`;
  }).join("");
  const dots = (field, className, label) => months.map((month, index) => month[field] === null ? "" : `
    <circle class="${className}" cx="${x(index)}" cy="${y(month[field])}" r="4">
      <title>${monthNames[index]}: ${label} ${format2(month[field])} บาท</title>
    </circle>`).join("");

  return `
    <div class="year-chart-scroll">
      <svg class="year-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟแนวโน้มยอดสุทธิรายเดือน">
        ${grid}
        ${months.map((month, index) => `<text class="year-chart-axis" x="${x(index)}" y="${height - 14}" text-anchor="middle">${monthShortNames[index]}</text>`).join("")}
        ${points("estimatedNet") ? `<polyline class="year-line year-line-estimated" points="${points("estimatedNet")}"></polyline>` : ""}
        ${points("actualNet") ? `<polyline class="year-line year-line-actual" points="${points("actualNet")}"></polyline>` : ""}
        ${dots("estimatedNet", "year-dot year-dot-estimated", "ยอดคำนวณ")}
        ${dots("actualNet", "year-dot year-dot-actual", "สลิปจริง")}
      </svg>
    </div>`;
}

function yearlyBreakdownChart(months) {
  const width = 720;
  const height = 230;
  const plot = { left: 46, right: 18, top: 16, bottom: 40 };
  const totals = months.map(month => month.estimatedGross || 0);
  const maxValue = Math.max(1, ...totals) * 1.08;
  const chartWidth = width - plot.left - plot.right;
  const chartHeight = height - plot.top - plot.bottom;
  const columnWidth = chartWidth / 12;
  const barWidth = Math.min(30, columnWidth * .58);
  const categories = [
    ["baseIncome", "year-bar-base"],
    ["overtimeIncome", "year-bar-ot"],
    ["shiftFoodIncome", "year-bar-shift"],
    ["extraIncome", "year-bar-extra"]
  ];
  const bars = months.map((month, index) => {
    const x = plot.left + columnWidth * index + (columnWidth - barWidth) / 2;
    let bottom = plot.top + chartHeight;
    const segments = categories.map(([field, className]) => {
      const amount = month.breakdown[field];
      const segmentHeight = amount / maxValue * chartHeight;
      bottom -= segmentHeight;
      return amount > 0 ? `<rect class="${className}" x="${x}" y="${bottom}" width="${barWidth}" height="${segmentHeight}"><title>${monthNames[index]} ${format2(amount)} บาท</title></rect>` : "";
    }).join("");
    return `${segments}<text class="year-chart-axis" x="${x + barWidth / 2}" y="${height - 13}" text-anchor="middle">${monthShortNames[index]}</text>`;
  }).join("");

  return `
    <div class="year-chart-scroll">
      <svg class="year-breakdown-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟองค์ประกอบรายได้แต่ละเดือน">
        <line class="year-chart-grid" x1="${plot.left}" y1="${plot.top + chartHeight}" x2="${width - plot.right}" y2="${plot.top + chartHeight}"></line>
        ${bars}
      </svg>
    </div>`;
}

function yearlyMoney(value) {
  return value === null ? "ยังไม่มีข้อมูล" : `${format2(value)} บาท`;
}

function yearlyMonthDetails(month) {
  const hasAnything = month.hasData || month.hasSlip;
  const differenceClass = month.difference > 0 ? "positive" : month.difference < 0 ? "negative" : "";
  return `
    <details class="year-month-detail${hasAnything ? "" : " is-empty"}">
      <summary>
        <span class="year-month-name">${monthNames[month.month]}</span>
        <span class="year-month-status">${hasAnything ? (month.hasData ? "มีข้อมูลคำนวณ" : "มีเฉพาะสลิป") : "ยังไม่มีข้อมูล"}</span>
        <span><small>คำนวณสุทธิ</small>${yearlyMoney(month.estimatedNet)}</span>
        <span><small>สลิปจริง</small>${yearlyMoney(month.actualNet)}</span>
        <span class="year-month-difference ${differenceClass}"><small>ผลต่าง</small>${month.difference === null ? "—" : `${month.difference > 0 ? "+" : ""}${format2(month.difference)} บาท`}</span>
      </summary>
      <div class="year-month-breakdown">
        <span><small>รายได้รวม</small>${yearlyMoney(month.estimatedGross)}</span>
        <span><small>รายการหัก</small>${yearlyMoney(month.estimatedDeductions)}</span>
        <span><small>ค่าแรงหลัก</small>${format2(month.breakdown.baseIncome)} บาท</span>
        <span><small>โอที</small>${format2(month.breakdown.overtimeIncome)} บาท</span>
        <span><small>ค่ากะ/อาหาร</small>${format2(month.breakdown.shiftFoodIncome)} บาท</span>
        <span><small>ค่าพิเศษ</small>${format2(month.breakdown.extraIncome)} บาท</span>
        <span><small>วันทำงาน</small>${format2(month.workDays)} วัน</span>
        <span><small>ขาดงาน</small>${format2(month.absentDays)} วัน</span>
        <span><small>ชั่วโมง OT</small>${format2(month.otHours)} ชม.</span>
      </div>
    </details>`;
}

function renderYearlyDashboard(requestedYear = null) {
  if (!yearlyDashboard) return;
  const availableYears = listYearlyYears();
  const storedYear = Number(localStorage.getItem("payrollYearlyYear"));
  const selectedYear = Number(requestedYear) || (availableYears.includes(storedYear) ? storedYear : Number(yearSelect.value));
  if (!availableYears.includes(selectedYear)) availableYears.push(selectedYear);
  availableYears.sort((left, right) => right - left);
  localStorage.setItem("payrollYearlyYear", String(selectedYear));

  const periods = Array.from({ length: 12 }, (_, month) => storedPeriodData(selectedYear, month));
  const summary = buildYearSummary({ year: selectedYear, periods, calculatePayroll });
  const hasAnything = summary.counts.estimatedMonths || summary.counts.actualMonths;
  const highestText = summary.highest ? `${monthNames[summary.highest.month]} ${format2(summary.highest.estimatedNet)} บาท` : "—";
  const lowestText = summary.lowest ? `${monthNames[summary.lowest.month]} ${format2(summary.lowest.estimatedNet)} บาท` : "—";

  yearlyDashboard.innerHTML = `
    <div class="dashboard-card yearly-card">
      <div class="yearly-header">
        <div>
          <h2><svg class="oh-icon" aria-hidden="true"><use href="#icon-chart"></use></svg>ภาพรวมรายปี</h2>
          <p>รวมตามเดือนอ้างอิงของงวด 16–15 · ข้อมูลอยู่เฉพาะในเครื่องนี้</p>
        </div>
        <label class="year-selector-label">ปี
          <select id="yearlyYearSelect" aria-label="เลือกปีสำหรับสรุปรายปี">
            ${availableYears.map(year => `<option value="${year}"${year === selectedYear ? " selected" : ""}>${toBuddhistYear(year)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${hasAnything ? `
        <div class="yearly-metrics">
          <div class="yearly-metric metric-primary"><span>สุทธิคำนวณทั้งปี</span><strong>${format2(summary.totals.estimatedNet)}</strong><small>${summary.counts.estimatedMonths} งวด</small></div>
          <div class="yearly-metric"><span>สุทธิจากสลิปจริง</span><strong>${format2(summary.totals.actualNet)}</strong><small>${summary.counts.actualMonths} งวด</small></div>
          <div class="yearly-metric"><span>รายได้รวม</span><strong>${format2(summary.totals.estimatedGross)}</strong><small>บาท</small></div>
          <div class="yearly-metric"><span>รายการหักรวม</span><strong>${format2(summary.totals.estimatedDeductions)}</strong><small>บาท</small></div>
          <div class="yearly-metric"><span>สุทธิเฉลี่ย/งวด</span><strong>${format2(summary.totals.averageNet)}</strong><small>บาท</small></div>
          <div class="yearly-metric"><span>OT รวม</span><strong>${format2(summary.totals.otHours)}</strong><small>ชั่วโมง</small></div>
        </div>
        <div class="yearly-highlights">
          <span><small>สูงสุด</small><b>${highestText}</b></span>
          <span><small>ต่ำสุด</small><b>${lowestText}</b></span>
          <span><small>วันทำงาน / ขาด</small><b>${format2(summary.totals.workDays)} / ${format2(summary.totals.absentDays)} วัน</b></span>
        </div>
        <section class="year-chart-section">
          <div class="year-chart-heading"><div><h3>แนวโน้มยอดสุทธิ</h3><p>ยอดที่คำนวณเทียบกับสลิปจริง</p></div><div class="year-chart-legend"><span class="estimated">คำนวณ</span><span class="actual">สลิปจริง</span></div></div>
          ${yearlyLineChart(summary.months)}
        </section>
        <section class="year-chart-section">
          <div class="year-chart-heading"><div><h3>องค์ประกอบรายได้</h3><p>ดูว่าแต่ละเดือนรายได้มาจากส่วนใด</p></div></div>
          ${yearlyBreakdownChart(summary.months)}
          <div class="year-breakdown-legend"><span class="base">ค่าแรงหลัก</span><span class="ot">โอที</span><span class="shift">ค่ากะ/อาหาร</span><span class="extra">ค่าพิเศษ</span></div>
        </section>
        <section class="year-month-list">
          <div class="year-chart-heading"><div><h3>รายละเอียดรายเดือน</h3><p>แตะเดือนเพื่อดูองค์ประกอบทั้งหมด</p></div></div>
          ${summary.months.map(yearlyMonthDetails).join("")}
        </section>` : `
        <div class="yearly-empty">
          <strong>ยังไม่มีข้อมูลสำหรับปี ${toBuddhistYear(selectedYear)}</strong>
          <span>เมื่อเริ่มลงข้อมูลรายงวด กราฟและสรุปรายปีจะแสดงที่นี่อัตโนมัติ</span>
        </div>`}
    </div>`;

  document.getElementById("yearlyYearSelect")?.addEventListener("change", event => {
    renderYearlyDashboard(Number(event.target.value));
  });
  setYearlyCollapsed(yearlyToggle?.getAttribute("aria-expanded") === "false", true);
}

// UI adapter: renders only the result returned by the payroll engine.
function calculate(data=getPayrollData()){
  const result=calculatePayroll(data);
  lastPayrollResult = result;
  const S=result.settings;
  const { cNormalday, cHolidaySpecial, cVacation, cSickDoctor, cBusinessExtra, nightShiftDays, otFoodDays, skillDays }=result.counts;
  const { ot1Hour, ot15Hours, ot2Hours, ot3Hours, totalOtHours }=result.hours;
  const { salaryPay, ot1Pay, ot15Pay, ot2Pay, ot3Pay, nightShiftPay, nightFoodPay, otFoodPay, skillPay, mentorPay, holidayspecialPay, vacationPay, sickdocterPay, businessextraPay, incentive1Pay, incentive2Pay }=result.income;
  const { socialSecurity }=result.deductions;
  const { totalIncome, netPay }=result.totals;


  if (periodSummaryQuick) {
    const quickPeriod = periodSummaryQuick.querySelector(".quick-period");
    if (quickPeriod) quickPeriod.textContent = getPeriodRangeText();
    periodQuickNet.textContent = `${format2(netPay)} บาท`;
    periodQuickDetail.textContent = `รวมรายได้ ${format2(totalIncome)} บาท · หักประกันสังคม ${format2(socialSecurity)} บาท (${format2(S.SOCIAL_SECURITY_PERCENT)}%)`;
  }
  updateHeaderInfo();
  renderSlipDashboard(result);
  renderYearlyDashboard();

  const quality = analyzePeriod(data.days, { hasActualSlip: Boolean(readActualSlip()) });
  if (quality.completedDays === 0) {
    document.getElementById("result").innerHTML = `
      <div class="summary-panel">
        <div class="summary-empty-state">
          <strong>ยังไม่มีรายการสำหรับสรุป</strong>
          <span>เลือกวันที่ในปฏิทินแล้วระบุสถานะ เพื่อเริ่มคำนวณเงินเดือนงวดนี้</span>
        </div>
      </div>`;
    setPanelCollapsed(getSummaryCollapseTarget(), summaryShell?.classList.contains("summary-collapsed"), true);
    return;
  }

  document.getElementById("result").innerHTML = `
  <div class="summary-panel">
    <div id="summaryCategoryList" class="summary-grid">
      <section class="summary-card">
        <h3 class="summary-heading"><svg class="oh-icon" aria-hidden="true"><use href="#icon-briefcase"></use></svg>รายได้หลัก</h3>
        <div class="summary-item">
          <span class="summary-label">วันทำงาน</span>
          <span class="summary-qty">${format2(cNormalday)} วัน</span>
          <span class="summary-money">${format2(salaryPay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">วันหยุดพิเศษ</span>
          <span class="summary-qty">${format2(cHolidaySpecial)} วัน</span>
          <span class="summary-money">${format2(holidayspecialPay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">ลาพักร้อน</span>
          <span class="summary-qty">${format2(cVacation)} วัน</span>
          <span class="summary-money">${format2(vacationPay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">ลาป่วยแพทย์</span>
          <span class="summary-qty">${format2(cSickDoctor)} วัน</span>
          <span class="summary-money">${format2(sickdocterPay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">ลากิจพิเศษ</span>
          <span class="summary-qty">${format2(cBusinessExtra)} วัน</span>
          <span class="summary-money">${format2(businessextraPay)} บาท</span>
        </div>
      </section>

      <section class="summary-card">
        <h3 class="summary-heading"><svg class="oh-icon" aria-hidden="true"><use href="#icon-timer"></use></svg>โอที</h3>
        <div class="summary-item summary-emphasis">
          <span class="summary-label"><b>รวมชั่วโมงโอที</b></span>
          <span class="summary-qty"><b>${format2(totalOtHours)} ชม.</b></span>
          <span class="summary-money" aria-hidden="true"></span>
        </div>
        <div class="summary-item">
          <span class="summary-label">โอที 1 แรง</span>
          <span class="summary-qty">${format2(ot1Hour)} ชม.</span>
          <span class="summary-money">${format2(ot1Pay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">โอที 1.5 แรง</span>
          <span class="summary-qty">${format2(ot15Hours)} ชม.</span>
          <span class="summary-money">${format2(ot15Pay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">โอที 2 แรง</span>
          <span class="summary-qty">${format2(ot2Hours)} ชม.</span>
          <span class="summary-money">${format2(ot2Pay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">โอที 3 แรง</span>
          <span class="summary-qty">${format2(ot3Hours)} ชม.</span>
          <span class="summary-money">${format2(ot3Pay)} บาท</span>
        </div>
      </section>

      <section class="summary-card">
        <h3 class="summary-heading"><svg class="oh-icon" aria-hidden="true"><use href="#icon-moon"></use></svg>ค่ากะ / ค่าอาหาร</h3>
        <div class="summary-item">
          <span class="summary-label">ค่ากะดึก</span>
          <span class="summary-qty">${format2(nightShiftDays)} วัน</span>
          <span class="summary-money">${format2(nightShiftPay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">ค่าอาหารกะดึก</span>
          <span class="summary-qty">${format2(nightShiftDays)} วัน</span>
          <span class="summary-money">${format2(nightFoodPay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">ค่าอาหารโอที</span>
          <span class="summary-qty">${format2(otFoodDays)} วัน</span>
          <span class="summary-money">${format2(otFoodPay)} บาท</span>
        </div>
      </section>

      <section class="summary-card">
        <h3 class="summary-heading"><svg class="oh-icon" aria-hidden="true"><use href="#icon-sparkles"></use></svg>ค่าพิเศษ</h3>
        <div class="summary-item">
          <span class="summary-label">ค่าทักษะ</span>
          <span class="summary-qty">${format2(skillDays)} วัน</span>
          <span class="summary-money">${format2(skillPay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">ค่าพี่เลี้ยง</span>
          <span class="summary-qty">-</span>
          <span class="summary-money">${format2(mentorPay)} บาท</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">เบี้ยขยัน</span>
          <span class="summary-qty">ช่วง 1 + 2</span>
          <span class="summary-money">${format2(incentive1Pay + incentive2Pay)} บาท</span>
        </div>
      </section>

      <section class="summary-card full">
        <h3 class="summary-heading"><svg class="oh-icon" aria-hidden="true"><use href="#icon-receipt"></use></svg>รวมและรายการหัก</h3>
        <div class="summary-item summary-emphasis">
          <span class="summary-label"><b>รวมรายได้</b></span>
          <span class="summary-qty" aria-hidden="true"></span>
          <span class="summary-money">${format2(totalIncome)} บาท</span>
        </div>
        <div class="summary-item summary-deduct">
          <span class="summary-label">ประกันสังคม</span>
          <span class="summary-qty">${format2(S.SOCIAL_SECURITY_PERCENT)}%</span>
          <span class="summary-money">${socialSecurity > 0 ? "-" : ""}${format2(socialSecurity)} บาท</span>
        </div>
        <div class="summary-item summary-net">
          <span class="summary-label"><b>สุทธิ</b></span>
          <span class="summary-qty" aria-hidden="true"></span>
          <span class="summary-money">${format2(netPay)} บาท</span>
        </div>
      </section>
    </div>
  </div>
`;
  setPanelCollapsed(getSummaryCollapseTarget(), summaryShell?.classList.contains("summary-collapsed"), true);
}
/* ===== 1. ปรับปรุงฟังก์ชันบันทึก ให้จำทั้งการตั้งค่าและหน้าล่าสุด ===== */
function saveSettings() {
    const y = yearSelect.value;
    const m = monthSelect.value;

    const settings = {
        mentor: document.getElementById("mentorCheck").checked,
        dailyWage: dailyInput.value,
        nightShiftFee: nightShiftFeeInput.value,
        nightFoodFee: nightFoodFeeInput.value,
        otFoodFee: otFoodFeeInput.value,
        socialSecurityPercent: socialSecurityPercentInput.value,
        incentive1: document.getElementById("incentive1").value,
        incentive2: document.getElementById("incentive2").value
    };

    // บันทึกแยกรายเดือน
    localStorage.setItem(`settings-${y}-${m}`, JSON.stringify(settings));
    // บันทึกว่าเปิดหน้าไหนล่าสุด
    localStorage.setItem('lastViewedMonth', m);
    localStorage.setItem('lastViewedYear', y);
}

/* ===== 2. ฟังก์ชันโหลด ต้องทำงานหลังจากระบุเดือน/ปีแล้วเท่านั้น ===== */
function loadSettings() {
    const y = yearSelect.value;
    const m = monthSelect.value;
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(`settings-${y}-${m}`));
    } catch (e) {
        saved = null;
    }

    document.getElementById("mentorCheck").checked = saved?.mentor || false;
    dailyInput.value = saved?.dailyWage || 447;
    nightShiftFeeInput.value = saved?.nightShiftFee || 140;
    nightFoodFeeInput.value = saved?.nightFoodFee || 70;
    otFoodFeeInput.value = saved?.otFoodFee || 45;
    socialSecurityPercentInput.value = saved?.socialSecurityPercent ?? 5;
    document.getElementById("incentive1").value = saved?.incentive1 || "0";
    document.getElementById("incentive2").value = saved?.incentive2 || "0";
    syncHourly();
}

function rebuildYearOptions(centerYear) {
    const normalizedCenter = normalizeYearValue(centerYear);
    const selectedYear = yearSelect.value ? normalizeYearValue(yearSelect.value) : normalizedCenter;
    const minYear = normalizedCenter - 2;
    const maxYear = normalizedCenter + 2;

    yearSelect.innerHTML = "";
    for (let y = minYear; y <= maxYear; y++) {
        const option = document.createElement("option");
        option.value = String(y);
        option.textContent = toBuddhistYear(y);
        yearSelect.appendChild(option);
    }

    const yearToSelect = selectedYear >= minYear && selectedYear <= maxYear ? selectedYear : normalizedCenter;
    yearSelect.value = String(yearToSelect);
}

function ensureYearOption(year) {
    // คงชื่อฟังก์ชันเดิมไว้เพื่อความเข้ากันได้ แต่ปรับให้ dropdown ขยับแบบ ±2 ปีจากปีที่ต้องการ
    rebuildYearOptions(year);
}

function applyPeriodChange() {
    const selectedYear = normalizeYearValue(yearSelect.value);
    rebuildYearOptions(selectedYear);
    yearSelect.value = String(selectedYear);
    missingDaysVisible = false;
    syncPeriodPicker();
    loadSettings();
    loadActualSlip();
    renderMonth();
    updateHeaderInfo();
    localStorage.setItem('lastViewedMonth', monthSelect.value);
    localStorage.setItem('lastViewedYear', yearSelect.value);
}

function movePeriod(offset) {
    const currentYear = Number(yearSelect.value);
    const currentMonth = Number(monthSelect.value);
    const target = new Date(currentYear, currentMonth + offset, 1);
    const nextYear = target.getFullYear();
    const nextMonth = target.getMonth();

    rebuildYearOptions(nextYear);
    yearSelect.value = String(nextYear);
    monthSelect.value = String(nextMonth);
    applyPeriodChange();
}

/* ===== 3. จัดระเบียบเหตุการณ์ (Events) ให้มีการบันทึกที่ถูกต้อง ===== */
monthSelect.onchange = applyPeriodChange;
yearSelect.onchange = applyPeriodChange;
periodMonthPicker.addEventListener("change", () => {
    const match = /^(\d{4})-(\d{2})$/.exec(periodMonthPicker.value);
    if (!match) return;

    const pickedYear = Number(match[1]);
    const pickedMonth = Number(match[2]) - 1;
    if (!Number.isInteger(pickedMonth) || pickedMonth < 0 || pickedMonth > 11) return;

    rebuildYearOptions(pickedYear);
    yearSelect.value = String(pickedYear);
    monthSelect.value = String(pickedMonth);
    applyPeriodChange();
});
prevPeriodBtn.onclick = () => movePeriod(-1);
nextPeriodBtn.onclick = () => movePeriod(1);
showMissingDaysBtn.addEventListener("click", () => {
    if (showMissingDaysBtn.disabled) return;
    missingDaysVisible = !missingDaysVisible;
    updatePeriodCompleteness();
});

// ส่วน Input อื่นๆ ให้บันทึกทันทีเมื่อเปลี่ยนค่า
dailyInput.oninput = () => { syncHourly(); saveSettings(); renderSummary(); };
[nightShiftFeeInput, nightFoodFeeInput, otFoodFeeInput, socialSecurityPercentInput].forEach(input => {
    input.oninput = () => { saveSettings(); renderSummary(); };
});
document.getElementById("mentorCheck").onchange = () => { saveSettings(); renderSummary(); };
["incentive1", "incentive2"].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.oninput = () => { saveSettings(); renderSummary(); };
    input.onchange = () => { saveSettings(); renderSummary(); };
});

[actualSlipGrossInput, actualSlipDeductionsInput, actualSlipNetInput, actualSlipNoteInput].forEach(input => {
    if (!input) return;
    input.addEventListener("input", () => setActualSlipStatus("มีการแก้ไขที่ยังไม่ได้บันทึก"));
});

saveActualSlipBtn.addEventListener("click", () => {
    const gross = optionalMoney(actualSlipGrossInput.value);
    const deductions = optionalMoney(actualSlipDeductionsInput.value);
    const net = optionalMoney(actualSlipNetInput.value);
    if ((actualSlipGrossInput.value.trim() !== "" && gross === null) ||
        (actualSlipDeductionsInput.value.trim() !== "" && deductions === null)) {
      setActualSlipStatus("รายได้รวมและรายการหักต้องเป็นจำนวนตั้งแต่ 0 ขึ้นไป", "error");
      return;
    }
    if (actualSlipNetInput.value.trim() === "" || net === null) {
      setActualSlipStatus("กรุณากรอกยอดสุทธิตามสลิปเป็นจำนวนตั้งแต่ 0 ขึ้นไป", "error");
      actualSlipNetInput.focus();
      return;
    }

    const result = lastPayrollResult || calculatePayroll(getPayrollData());
    const slip = {
      gross,
      deductions,
      net,
      note: actualSlipNoteInput.value.trim().slice(0, 500),
      estimatedGross: result.totals.totalIncome,
      estimatedDeductions: result.deductions.socialSecurity,
      estimatedNet: result.totals.netPay,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(getActualSlipKey(), JSON.stringify(slip));
    deleteActualSlipBtn.hidden = false;
    setActualSlipStatus("บันทึกสลิปจริงของงวดนี้แล้ว", "success");
    renderSlipDashboard(result);
});

deleteActualSlipBtn.addEventListener("click", () => {
    if (!window.confirm("ลบข้อมูลสลิปจริงของงวดนี้หรือไม่?")) return;
    localStorage.removeItem(getActualSlipKey());
    loadActualSlip();
    renderSlipDashboard(lastPayrollResult);
    setActualSlipStatus("ลบข้อมูลสลิปจริงของงวดนี้แล้ว", "success");
});
/* ===== ปรับปรุงระบบหุบการ์ดเมื่อคลิกด้านนอก ===== */
document.addEventListener("click", function(event) {
    if (!expandRow) return; // ถ้าไม่มีการ์ดเปิดอยู่ ไม่ต้องทำอะไร

    // ตรวจสอบว่าจุดที่คลิก อยู่นอกปฏิทิน และ อยู่นอกการ์ดที่กำลังกางอยู่หรือไม่
    const isClickInsideCalendar = calendarEl.contains(event.target);
    const isClickInsideCard = expandRow.contains(event.target);

    if (!isClickInsideCalendar && !isClickInsideCard) {
        slideClose(expandRow).then(() => {
            removeExpand(true);
            setActiveCalendarCell(null);
            selectedDate = null;
            activeCell = null;
        });
    }
});

const exportDataBtn = document.getElementById("exportDataBtn");
const exportSheetBtn = document.getElementById("exportSheetBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importDataFile = document.getElementById("importDataFile");
const backupStatus = document.getElementById("backupStatus");
const lastBackupStatus = document.getElementById("lastBackupStatus");
const exportCheckDialog = document.getElementById("exportCheckDialog");
const exportIssueList = document.getElementById("exportIssueList");
const closeExportCheckBtn = document.getElementById("closeExportCheckBtn");
const cancelExportBtn = document.getElementById("cancelExportBtn");
const continueExportBtn = document.getElementById("continueExportBtn");
const openClearDataBtn = document.getElementById("openClearDataBtn");
const clearDataDialog = document.getElementById("clearDataDialog");
const closeClearDataBtn = document.getElementById("closeClearDataBtn");
const cancelClearDataBtn = document.getElementById("cancelClearDataBtn");
const confirmClearDataBtn = document.getElementById("confirmClearDataBtn");
const backupBeforeClearBtn = document.getElementById("backupBeforeClearBtn");
const clearPeriodLabel = document.getElementById("clearPeriodLabel");
const clearAllConfirmWrap = document.getElementById("clearAllConfirmWrap");
const clearAllConfirmInput = document.getElementById("clearAllConfirmInput");
const clearScopeInputs = [...document.querySelectorAll('input[name="clearScope"]')];

function setBackupStatus(message, state = "") {
  backupStatus.textContent = message;
  backupStatus.dataset.state = state;
}

function renderLastBackupStatus() {
  const raw = localStorage.getItem("payrollLastBackupAt");
  const date = raw ? new Date(raw) : null;
  if (!lastBackupStatus) return;
  if (!date || Number.isNaN(date.getTime())) {
    lastBackupStatus.textContent = "ยังไม่เคยสำรอง JSON บนเครื่องนี้";
    return;
  }
  lastBackupStatus.textContent = `สำรอง JSON ล่าสุด ${date.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok"
  })} น.`;
}

function issueDatesText(issue) {
  if (!issue.dates?.length) return "";
  const visible = issue.dates.slice(0, 6).map(formatPeriodDay).join(", ");
  const remaining = issue.dates.length - 6;
  return `${visible}${remaining > 0 ? ` และอีก ${remaining} วัน` : ""}`;
}

async function performSheetExport() {
  const originalLabel = exportSheetBtn.textContent;
  exportSheetBtn.disabled = true;
  exportSheetBtn.textContent = "กำลังสร้างไฟล์…";
  setBackupStatus("กำลังจัดทำรายการรายวันและสรุปทั้งงวด…");

  try {
    const data = getPayrollData();
    const model = PayrollSheetExport.buildExportModel(data, calculatePayroll, {
      periodLabel: getPeriodRangeText(),
      generatedAt: new Date().toISOString(),
      actualSlip: readActualSlip()
    });
    const month = String(Number(monthSelect.value) + 1).padStart(2, "0");
    const filename = `payroll-detail-${yearSelect.value}-${month}.xlsx`;
    await PayrollSheetExport.download(model, filename);
    setBackupStatus("ส่งออกแล้ว: รายวัน · สรุปงวด · ตั้งค่าที่ใช้", "success");
  } catch (error) {
    setBackupStatus(`ส่งออกไม่สำเร็จ: ${error.message}`, "error");
  } finally {
    exportSheetBtn.disabled = false;
    exportSheetBtn.textContent = originalLabel;
  }
}

exportSheetBtn.addEventListener("click", () => {
  const data = getPayrollData();
  const quality = analyzePeriod(data.days, { hasActualSlip: Boolean(readActualSlip()) });
  if (!quality.issues.length) {
    performSheetExport();
    return;
  }

  exportIssueList.innerHTML = quality.issues.map(issue => `
    <li>${issue.message}${issueDatesText(issue) ? `<small>${issueDatesText(issue)}</small>` : ""}</li>
  `).join("");
  exportCheckDialog.showModal();
});

[closeExportCheckBtn, cancelExportBtn].forEach(button => {
  button.addEventListener("click", () => exportCheckDialog.close());
});

continueExportBtn.addEventListener("click", () => {
  exportCheckDialog.close();
  performSheetExport();
});

exportDataBtn.addEventListener("click", () => {
  try {
    const backup = createBackup(localStorage);
    const content = JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = formatLocalDate(new Date());
    link.href = url;
    link.download = `payroll-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    localStorage.setItem("payrollLastBackupAt", new Date().toISOString());
    renderLastBackupStatus();
    setBackupStatus(`ดาวน์โหลดไฟล์สำรองแล้ว (${Object.keys(backup.data).length} รายการ)`, "success");
  } catch (error) {
    setBackupStatus(`สำรองข้อมูลไม่สำเร็จ: ${error.message}`, "error");
  }
});

importDataBtn.addEventListener("click", () => {
  importDataFile.value = "";
  importDataFile.click();
});

importDataFile.addEventListener("change", async () => {
  const file = importDataFile.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    setBackupStatus("ไฟล์สำรองใหญ่เกิน 5 MB", "error");
    return;
  }

  try {
    const backup = parseAndValidateBackup(await file.text());
    const itemCount = Object.keys(backup.data).length;
    const confirmed = window.confirm(
      `นำเข้า ${itemCount} รายการและแทนที่ข้อมูล Payrolls ในเครื่องนี้หรือไม่?`
    );
    if (!confirmed) {
      setBackupStatus("ยกเลิกการนำเข้าข้อมูล");
      return;
    }

    restoreBackup(localStorage, backup, { replace: true });
    setBackupStatus(`นำเข้าสำเร็จ ${itemCount} รายการ กำลังโหลดข้อมูลใหม่…`, "success");
    window.setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    setBackupStatus(`นำเข้าข้อมูลไม่สำเร็จ: ${error.message}`, "error");
  }
});

function getSelectedClearScope() {
  return clearScopeInputs.find(input => input.checked)?.value || "period";
}

function updateClearDialogState() {
  const scope = getSelectedClearScope();
  const isAll = scope === "all";
  clearAllConfirmWrap.hidden = !isAll;

  if (scope === "slip") {
    confirmClearDataBtn.textContent = "ล้างเฉพาะสลิปจริง";
  } else if (isAll) {
    confirmClearDataBtn.textContent = "ล้างข้อมูลทั้งหมด";
  } else {
    confirmClearDataBtn.textContent = "ล้างข้อมูลงวดนี้";
  }

  confirmClearDataBtn.disabled = isAll && clearAllConfirmInput.value.trim() !== "ล้างข้อมูล";
}

function refreshCurrentPeriodAfterClear() {
  if (expandRow) removeExpand(true);
  selectedDate = null;
  activeCell = null;
  loadSettings();
  loadActualSlip();
  renderMonth();
  updateHeaderInfo();
}

openClearDataBtn.addEventListener("click", () => {
  clearScopeInputs.forEach(input => { input.checked = input.value === "period"; });
  clearAllConfirmInput.value = "";
  clearPeriodLabel.textContent = getPeriodRangeText();
  updateClearDialogState();
  clearDataDialog.showModal();
});

[closeClearDataBtn, cancelClearDataBtn].forEach(button => {
  button.addEventListener("click", () => clearDataDialog.close());
});

clearScopeInputs.forEach(input => input.addEventListener("change", () => {
  clearAllConfirmInput.value = "";
  updateClearDialogState();
  if (getSelectedClearScope() === "all") clearAllConfirmInput.focus();
}));
clearAllConfirmInput.addEventListener("input", updateClearDialogState);

backupBeforeClearBtn.addEventListener("click", () => exportDataBtn.click());

confirmClearDataBtn.addEventListener("click", () => {
  const scope = getSelectedClearScope();
  const year = Number(yearSelect.value);
  const month = Number(monthSelect.value);

  try {
    if (scope === "all") {
      if (clearAllConfirmInput.value.trim() !== "ล้างข้อมูล") return;
      const { removedKeys } = clearAllAppData(localStorage);
      clearDataDialog.close();
      sessionStorage.setItem(
        "payrollClearNotice",
        removedKeys.length
          ? `ล้างข้อมูล Payrolls ทั้งหมดแล้ว (${removedKeys.length} รายการ)`
          : "ไม่มีข้อมูล Payrolls ให้ล้าง"
      );
      window.location.reload();
      return;
    }

    const slipOnly = scope === "slip";
    const { removedKeys } = clearPeriodData(localStorage, year, month, { slipOnly });
    refreshCurrentPeriodAfterClear();
    clearDataDialog.close();

    if (!removedKeys.length) {
      setBackupStatus(slipOnly ? "งวดนี้ยังไม่มีข้อมูลสลิปจริง" : "งวดนี้ยังไม่มีข้อมูลให้ล้าง");
    } else {
      setBackupStatus(
        slipOnly
          ? "ล้างสลิปจริงของงวดนี้แล้ว ข้อมูลวันทำงานยังอยู่ครบ"
          : `ล้างข้อมูลของงวด ${getPeriodRangeText()} แล้ว`,
        "success"
      );
    }
  } catch (error) {
    setBackupStatus(`ล้างข้อมูลไม่สำเร็จ: ${error.message}`, "error");
    clearDataDialog.close();
  }
});

/* ===== ปรับปรุงฟังก์ชันเริ่มต้น (initApp) ให้เสถียรกว่าเดิม ===== */
function initApp() {
    localStorage.removeItem("payrollTheme");
    applyDaypartTone();
    setInterval(applyDaypartTone, 60 * 1000);
    setInputCollapsed(localStorage.getItem("payrollInputCollapsed") === "1", true);
    setSummaryCollapsed(localStorage.getItem("payrollSummaryCollapsed") === "1", true);
    setSlipCollapsed(localStorage.getItem("payrollSlipCollapsed") !== "0", true);
    setDashboardCollapsed(localStorage.getItem("payrollDashboardCollapsed") === "1", true);
    setYearlyCollapsed(localStorage.getItem("payrollYearlyCollapsed") !== "0", true);
    updateHeaderInfo();
    setInterval(updateHeaderInfo, 1000);
    const now = new Date();

    // 1. ดึงค่าหน้าล่าสุด แล้วสร้างตัวเลือก "ปี" แบบปีที่เลือก ±2 ปี
    const savedMonth = localStorage.getItem('lastViewedMonth');
    const savedYear = localStorage.getItem('lastViewedYear');
    const initialYear = savedYear !== null ? normalizeYearValue(savedYear) : now.getFullYear();

    rebuildYearOptions(initialYear);

    // 2. กำหนดค่าให้ Dropdown (ป้องกันค่าว่าง)
    if (savedMonth !== null) {
        monthSelect.value = savedMonth;
    } else {
        monthSelect.value = now.getMonth();
    }
    yearSelect.value = String(initialYear);
    syncPeriodPicker();

    // 4. โหลดข้อมูลและแสดงผล
    loadSettings();
    loadActualSlip();
    renderMonth();
}

// เรียกใช้เพียงครั้งเดียวที่บรรทัดสุดท้าย
initApp();
renderLastBackupStatus();

const clearNotice = sessionStorage.getItem("payrollClearNotice");
if (clearNotice) {
  sessionStorage.removeItem("payrollClearNotice");
  setBackupStatus(clearNotice, "success");
}

/* ===== PWA: register service worker for GitHub Pages ===== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}

// collegeapartments.js

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const LBS_PER_KWH = 920.1 / 1000; // 0.9201 lbs CO2 per kWh
const LBS_PER_THERM = 11.68;      // lbs CO2 per therm

const lbsFromKwh = (kwh) => Math.round(kwh * LBS_PER_KWH);
const lbsFromTherms = (t) => Math.round(t * LBS_PER_THERM);
const DATA = {
  electricity: {
    2024: {
      House: [179,189,150,140,147,80,31,23,40,58,125,166],
      "101": [69,98,103,99,111,135,200,265,337,369,330,134],
      "102": [78,122,61,59,68,76,66,91,76,65,259,226],
      "104": [97,255,182,169,178,144,63,74,410,451,460,307],
      Total: [423,664,496,467,504,435,360,453,863,943,1174,833],
    },
    2025: {
      House: [205,192,173,153,148,88,28,120,141,50,139,166],
      "101": [113,157,147,139,248,242,180,154,204,226,262,93],
      "102": [264,105,246,152,129,68,75,138,248,194,64,130],
      "104": [222,539,674,394,394,438,435,252,161,145,126,135],
      Total: [804,993,1240,838,919,836,718,664,754,615,591,524],
    }
  },
  electricityAnnual: {
    2024: { House: 3352, "101": 2351, "102": 1349, "104": 2894, Total: 7615 },
    2025: { House: 3628, "101": 2266, "102": 1915, "104": 4019, Total: 9496 },
  },
  gas: {
    2024: [195,251,183,147,135,70,23,19,38,71,124,186],
    2025: [279,288,264,180,159,85,17,6,1,44,119,163],
  },
  gasAnnual: { 2024: 1442, 2025: 1605 }
};

// ---- state ----
let selectedDoor = "104";
let compareMode = "month"; // "month" | "year"
let selectedMonthIndex = 0;
let compareDoors = new Set(["House","101","102","104","Total"]);

// ---- charts ----
let electricityDoorChart;
let monthlyCompareChart;
let yearCompareChart;
let ngChart;

// ---- helpers ----
const fmt = (n) => new Intl.NumberFormat().format(n);

function doorLabel(door){
  if (door === "House") return "House";
  if (door === "Total") return "Total";
  return `Unit ${door}`;
}

function getSelectedDoorsArray(){
  const order = ["House","101","102","104","Total"];
  return order.filter(d => compareDoors.has(d));
}

function setActivePill(groupEl, key, val){
  groupEl.querySelectorAll("[data-"+key+"]").forEach(b => {
    b.classList.toggle("isActive", b.dataset[key] === val);
  });
}

function initMonthButtons(){
  const wrap = document.getElementById("monthButtons");
  wrap.innerHTML = "";
  MONTHS.forEach((m, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "aptMonthBtn" + (i === selectedMonthIndex ? " isActive" : "");
    btn.textContent = m;
    btn.dataset.month = String(i);
    btn.addEventListener("click", () => {
      selectedMonthIndex = i;
      wrap.querySelectorAll(".aptMonthBtn").forEach(x => x.classList.remove("isActive"));
      btn.classList.add("isActive");
      document.getElementById("monthTitleHint").textContent = `Month: ${MONTHS[i]}`;
      document.getElementById("ngHint").textContent = `Selected Month: ${MONTHS[i]}`;
      updateMonthlyCompareChart();
      updateNgChart();
    });
    wrap.appendChild(btn);
  });
}

function buildElecCO2Table(year, tableId){
  const tbl = document.getElementById(tableId);
  const e = DATA.electricity[year];

  const head = `
    <thead>
      <tr>
        <th>Month</th>
        <th>House</th>
        <th>101</th>
        <th>102</th>
        <th>104</th>
        <th>Total</th>
      </tr>
    </thead>
  `;

  const bodyRows = MONTHS.map((m, i) => {
    const house = lbsFromKwh(e.House[i]);
    const u101  = lbsFromKwh(e["101"][i]);
    const u102  = lbsFromKwh(e["102"][i]);
    const u104  = lbsFromKwh(e["104"][i]);
    const tot   = lbsFromKwh(e.Total[i]);

    return `
      <tr>
        <td>${m}</td>
        <td style="text-align:right;">${fmt(house)}</td>
        <td style="text-align:right;">${fmt(u101)}</td>
        <td style="text-align:right;">${fmt(u102)}</td>
        <td style="text-align:right;">${fmt(u104)}</td>
        <td style="text-align:right;">${fmt(tot)}</td>
      </tr>
    `;
  }).join("");

  const annual = DATA.electricityAnnual[year];
  const annualRow = `
    <tr class="annual">
      <td>Annual</td>
      <td style="text-align:right;">${fmt(lbsFromKwh(annual.House))}</td>
      <td style="text-align:right;">${fmt(lbsFromKwh(annual["101"]))}</td>
      <td style="text-align:right;">${fmt(lbsFromKwh(annual["102"]))}</td>
      <td style="text-align:right;">${fmt(lbsFromKwh(annual["104"]))}</td>
      <td style="text-align:right;">${fmt(lbsFromKwh(annual.Total))}</td>
    </tr>
  `;

  tbl.innerHTML = head + `<tbody>${bodyRows}${annualRow}</tbody>`;
}

function buildGasCO2Table(year, tableId){
  const tbl = document.getElementById(tableId);
  const g = DATA.gas[year];

  const head = `
    <thead>
      <tr>
        <th>Month</th>
        <th>CO₂ (lbs)</th>
      </tr>
    </thead>
  `;

  const bodyRows = MONTHS.map((m, i) => `
    <tr>
      <td>${m}</td>
      <td style="text-align:right;">${fmt(lbsFromTherms(g[i]))}</td>
    </tr>
  `).join("");

  const annualRow = `
    <tr class="annual">
      <td>Annual</td>
      <td style="text-align:right;">${fmt(lbsFromTherms(DATA.gasAnnual[year]))}</td>
    </tr>
  `;

  tbl.innerHTML = head + `<tbody>${bodyRows}${annualRow}</tbody>`;
}


// ---- charts creation ----
function makeLineChart(ctx, labels, data2024, data2025){
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "2024",
          data: data2024,
          borderColor: "rgba(16,185,129,.95)",
          backgroundColor: "rgba(16,185,129,.15)",
          tension: 0.28,
          fill: true,
          pointRadius: 3
        },
        {
          label: "2025",
          data: data2025,
          borderColor: "rgba(59,130,246,.95)",
          backgroundColor: "rgba(59,130,246,.15)",
          tension: 0.28,
          fill: true,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function makeBarCompareChart(ctx, labels, data2024, data2025, yTitle){
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "2024",
          data: data2024,
          backgroundColor: "rgba(16,185,129,.45)",
          borderColor: "rgba(16,185,129,.95)",
          borderWidth: 1
        },
        {
          label: "2025",
          data: data2025,
          backgroundColor: "rgba(59,130,246,.45)",
          borderColor: "rgba(59,130,246,.95)",
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: {
        y: { beginAtZero: true, title: { display: !!yTitle, text: yTitle } }
      }
    }
  });
}

// ---- chart updates ----
function updateDoorHint(){
  const hint = document.getElementById("selectedDoorHint");
  hint.textContent = `Selected: ${doorLabel(selectedDoor)}`;
}

function updateElectricityDoorChart(){
  const e2024 = DATA.electricity[2024][selectedDoor];
  const e2025 = DATA.electricity[2025][selectedDoor];

  electricityDoorChart.data.labels = MONTHS;
  electricityDoorChart.data.datasets[0].data = e2024;
  electricityDoorChart.data.datasets[1].data = e2025;
  electricityDoorChart.update();
}

function updateMonthlyCompareChart(){
  const doors = getSelectedDoorsArray();
  const m = selectedMonthIndex;

  const d2024 = doors.map(d => DATA.electricity[2024][d][m]);
  const d2025 = doors.map(d => DATA.electricity[2025][d][m]);

  monthlyCompareChart.data.labels = doors.map(doorLabel);
  monthlyCompareChart.data.datasets[0].data = d2024;
  monthlyCompareChart.data.datasets[1].data = d2025;
  monthlyCompareChart.update();
}

function updateYearCompareChart(){
  const doors = getSelectedDoorsArray();
  const d2024 = doors.map(d => DATA.electricityAnnual[2024][d]);
  const d2025 = doors.map(d => DATA.electricityAnnual[2025][d]);

  yearCompareChart.data.labels = doors.map(doorLabel);
  yearCompareChart.data.datasets[0].data = d2024;
  yearCompareChart.data.datasets[1].data = d2025;
  yearCompareChart.update();
}

function updateNgChart(){
  // month mode: show selected month therms
  const m = selectedMonthIndex;
  const v2024 = DATA.gas[2024][m];
  const v2025 = DATA.gas[2025][m];

  ngChart.data.labels = ["Natural Gas (therms)"];
  ngChart.data.datasets[0].data = [v2024];
  ngChart.data.datasets[1].data = [v2025];
  ngChart.update();
}

function updateNgYearMetrics(){
  const wrap = document.getElementById("ngYearMetrics");
  wrap.innerHTML = `
    <div class="aptMetric"><div class="k">2024</div><div class="v">${fmt(DATA.gasAnnual[2024])} therms</div></div>
    <div class="aptMetric"><div class="k">2025</div><div class="v">${fmt(DATA.gasAnnual[2025])} therms</div></div>
    <div class="aptMetric"><div class="k">Change</div><div class="v">${fmt(DATA.gasAnnual[2025] - DATA.gasAnnual[2024])} therms</div></div>
  `;
}

function applyCompareMode(){
  const monthCol = document.getElementById("monthCol");
  const yearCol  = document.getElementById("yearCol");

  if (compareMode === "month") {
    // show month only
    monthCol.style.display = "block";
    yearCol.style.display  = "none";

    // IMPORTANT: make month span full grid width (fills empty space)
    monthCol.style.gridColumn = "1 / -1";
    yearCol.style.gridColumn  = "auto";

    document.getElementById("monthTitleHint").textContent = `Month: ${MONTHS[selectedMonthIndex]}`;
    document.getElementById("ngHint").textContent = `Selected Month: ${MONTHS[selectedMonthIndex]}`;

    updateMonthlyCompareChart();
    updateNgChart();

    requestAnimationFrame(() => {
      monthlyCompareChart?.resize();
      ngChart?.resize();
    });

  } else {
    // show year only
    monthCol.style.display = "none";
    yearCol.style.display  = "block";

    // IMPORTANT: make year span full grid width (fills empty space)
    yearCol.style.gridColumn  = "1 / -1";
    monthCol.style.gridColumn = "auto";

    updateYearCompareChart();
    updateNgYearMetrics();

    requestAnimationFrame(() => {
      yearCompareChart?.resize();
    });
  }
}



// ---- UI wiring ----
function initDoorPills(){
  const pills = document.getElementById("doorPills");
  pills.querySelectorAll(".aptPill").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedDoor = btn.dataset.door;
      pills.querySelectorAll(".aptPill").forEach(b => b.classList.remove("isActive"));
      btn.classList.add("isActive");
      updateDoorHint();
      updateElectricityDoorChart();
    });
  });
}

function initCompareDoorPills(){
  const pills = document.getElementById("compareDoorPills");
  pills.querySelectorAll(".aptPill").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.door;

      // toggle
      if (compareDoors.has(d)) compareDoors.delete(d);
      else compareDoors.add(d);

      // ensure at least one selected
      if (compareDoors.size === 0){
        compareDoors.add(d);
      }

      btn.classList.toggle("isActive", compareDoors.has(d));

      updateMonthlyCompareChart();
      updateYearCompareChart();
    });
  });
}

function initModeSeg(){
  const seg = document.getElementById("modeSeg");
  seg.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      compareMode = btn.dataset.mode;
      seg.querySelectorAll("button").forEach(b => b.classList.remove("isActive"));
      btn.classList.add("isActive");
      applyCompareMode();

      // when switching to year, no need month updates; when month, refresh
      if (compareMode === "month"){
        updateMonthlyCompareChart();
        updateNgChart();
      } else {
        updateNgYearMetrics();
      }
    });
  });
}

function initFloorplanClicks(){
  document.querySelectorAll(".zone").forEach(zone => {
    zone.addEventListener("click", () => {
      const unit = zone.dataset.unit;
      selectedDoor = unit;

      // sync pills
      const pills = document.getElementById("doorPills");
      pills.querySelectorAll(".aptPill").forEach(b => {
        b.classList.toggle("isActive", b.dataset.door === unit);
      });

      updateDoorHint();
      updateElectricityDoorChart();
    });
  });
}

// ---- boot ----
document.addEventListener("DOMContentLoaded", () => {
  if (typeof Chart === "undefined"){
    alert("Chart.js did not load. Make sure you are connected to the internet or include Chart.js locally.");
    return;
  }

  // tables in Carbon section
buildElecCO2Table(2024, "tblElec2024");
buildElecCO2Table(2025, "tblElec2025");
buildGasCO2Table(2024, "tblGas2024");
buildGasCO2Table(2025, "tblGas2025");

  initMonthButtons();
  updateNgYearMetrics();

  initDoorPills();
  initCompareDoorPills();
  initModeSeg();
  initFloorplanClicks();
  updateDoorHint();

  // charts
  electricityDoorChart = makeLineChart(
    document.getElementById("electricityDoorChart"),
    MONTHS,
    DATA.electricity[2024][selectedDoor],
    DATA.electricity[2025][selectedDoor]
  );

  monthlyCompareChart = makeBarCompareChart(
    document.getElementById("monthlyCompareChart"),
    getSelectedDoorsArray().map(doorLabel),
    getSelectedDoorsArray().map(d => DATA.electricity[2024][d][selectedMonthIndex]),
    getSelectedDoorsArray().map(d => DATA.electricity[2025][d][selectedMonthIndex]),
    "kWh"
  );

  yearCompareChart = makeBarCompareChart(
    document.getElementById("yearCompareChart"),
    getSelectedDoorsArray().map(doorLabel),
    getSelectedDoorsArray().map(d => DATA.electricityAnnual[2024][d]),
    getSelectedDoorsArray().map(d => DATA.electricityAnnual[2025][d]),
    "kWh"
  );

  ngChart = makeBarCompareChart(
    document.getElementById("ngChart"),
    ["Natural Gas (therms)"],
    [DATA.gas[2024][selectedMonthIndex]],
    [DATA.gas[2025][selectedMonthIndex]],
    "therms"
  );

  const d2024 = document.getElementById("details2024");
  const d2025 = document.getElementById("details2025");

  if (d2024 && d2025) {
    d2024.addEventListener("toggle", () => {
      if (d2024.open) d2025.open = false;
    });
    d2025.addEventListener("toggle", () => {
      if (d2025.open) d2024.open = false;
    });
  }

  document.getElementById("monthTitleHint").textContent = `Month: ${MONTHS[selectedMonthIndex]}`;
  document.getElementById("ngHint").textContent = `Selected Month: ${MONTHS[selectedMonthIndex]}`;

  applyCompareMode();

  // ===== Screenshot lightbox (zoom + pan) =====
const lightbox = document.getElementById("imgLightbox");
const sheetThumb = document.getElementById("sheetThumb");
const openShot = document.getElementById("openShot");
const img = document.getElementById("sheetFull");
const stage = document.getElementById("imgStage");

const btnIn = document.getElementById("zoomIn");
const btnOut = document.getElementById("zoomOut");
const btnReset = document.getElementById("zoomReset");
const btnClose = document.getElementById("imgClose");

let scale = 0.9;
let tx = 0;   // translate X
let ty = 0;   // translate Y
let isPanning = false;
let startX = 0;
let startY = 0;

function applyTransform(){
  img.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`;
}

function openLightbox(){
  lightbox.classList.add("isOpen");
  lightbox.setAttribute("aria-hidden", "false");
  const stageRect = stage.getBoundingClientRect();
  const imgW = img.naturalWidth || 1600;
  const imgH = img.naturalHeight || 900;

  const fit = Math.min(stageRect.width / imgW, stageRect.height / imgH);
  scale = Math.max(0.6, Math.min(1.1, fit * 0.95)); 
  tx = 0;
  ty = 0;

  applyTransform();
}

function closeLightbox(){
  lightbox.classList.remove("isOpen");
  lightbox.setAttribute("aria-hidden", "true");
}

function zoom(delta){
  const next = Math.min(2.5, Math.max(0.5, scale + delta));
  scale = next;
  applyTransform();
}

sheetThumb?.addEventListener("click", openLightbox);
openShot?.addEventListener("click", openLightbox);
btnClose?.addEventListener("click", closeLightbox);

lightbox?.addEventListener("click", (e) => {
  // click outside stage closes
  if (e.target === lightbox) closeLightbox();
});

btnIn?.addEventListener("click", () => zoom(0.12));
btnOut?.addEventListener("click", () => zoom(-0.12));
btnReset?.addEventListener("click", () => { scale = 1; tx = 0; ty = 0; applyTransform(); });

// wheel zoom
stage?.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoom(e.deltaY < 0 ? 0.06 : -0.06);
}, { passive: false });

// drag to pan
stage?.addEventListener("mousedown", (e) => {
  isPanning = true;
  startX = e.clientX - tx;
  startY = e.clientY - ty;
});

window.addEventListener("mousemove", (e) => {
  if (!isPanning) return;
  tx = e.clientX - startX;
  ty = e.clientY - startY;
  applyTransform();
});

window.addEventListener("mouseup", () => { isPanning = false; });

// ESC closes
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox?.classList.contains("isOpen")) closeLightbox();
});




});

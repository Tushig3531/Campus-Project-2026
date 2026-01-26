/* carbon-panels.js
   Two panels: 2024 + 2025
   Solar toggle moved under year header.
   Metrics rearranged + rename "Selected Month CO₂".
*/

(function () {
  const mount = document.getElementById("carbon-panels");
  if (!mount) return;

  if (!window.Chart) {
    mount.innerHTML = `<div class="solarNote">Chart.js not loaded. Include it once before carbon-panels.js.</div>`;
    return;
  }

  const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const HOME_M2 = 240;
  const FACTORS = {
    elec_lbs_per_MWh: 920.1,
    gas_lbs_per_therm: 11.68,
    therm_to_kWh: 29.3,
    lb_to_kg: 0.455
  };

  const DATA = {
    gasTherms: {
      2024: [164,228,152,134,94,38,4,2,33,45,82,166],
      2025: [208,222,216,148,131,67,7,1,7,16,100,166],
    },
    electricity: {
      net: {
        2024: [305,502,126,10,48,-136,-331,-353,-229,127,209,563],
        2025: [516,286,495,128,188,97,-311,-347,-213,92,232,381],
      },
      gross: {
        2024: [439,571,504,445,442,338,96,132,284,606,598,737],
        2025: [641,561,695,592,612,566,128,139,230,502,557,592],
      }
    }
  };

  const years = [2024, 2025];

  const sum = (arr) => arr.reduce((a,b)=>a+b,0);
  const fmt = (n) => Math.round(n).toLocaleString();

  function computeYear(year, solarMode){
    const elecKWh = (DATA.electricity[solarMode][year] || Array(12).fill(0)).slice(0,12);
    const gasTherm = (DATA.gasTherms[year] || Array(12).fill(0)).slice(0,12);

    const gasKWh = gasTherm.map(t => t * FACTORS.therm_to_kWh);

    const elecCO2 = elecKWh.map(kwh => (kwh/1000) * FACTORS.elec_lbs_per_MWh); // lbs
    const gasCO2  = gasTherm.map(t => t * FACTORS.gas_lbs_per_therm);          // lbs
    const totalCO2Monthly = elecCO2.map((v,i)=> v + gasCO2[i]);

    const totalElecKWh = sum(elecKWh);
    const totalGasTherm = sum(gasTherm);
    const totalGasKWh = sum(gasKWh);
    const totalEnergyKWh = totalElecKWh + totalGasKWh;

    const totalElecCO2 = sum(elecCO2);
    const totalGasCO2  = sum(gasCO2);
    const totalCO2 = totalElecCO2 + totalGasCO2;

    const lbsPerM2 = totalCO2 / HOME_M2;
    const kgPerM2  = lbsPerM2 * FACTORS.lb_to_kg;

    const avgMonthly = totalCO2Monthly.length ? (sum(totalCO2Monthly)/totalCO2Monthly.length) : 0;

    return {
      elecKWh, gasTherm,
      totalElecKWh, totalGasTherm, totalEnergyKWh,
      elecCO2, gasCO2, totalCO2Monthly,
      totalElecCO2, totalGasCO2, totalCO2,
      lbsPerM2, kgPerM2,
      avgMonthly
    };
  }

  // Build UI
  mount.innerHTML = `<div class="cfWrap">${years.map(y => `
    <div class="cfYearBlock" data-year="${y}">
      <div class="cfYearHeader">${y}</div>

      <!-- Solar toggle moved HERE -->
      <div class="cfYearControls">
        <div class="cfSeg cfSegWide" data-seg="solar" aria-label="Solar mode">
          <button data-solar="net" class="isActive">With solar</button>
          <button data-solar="gross">Without solar</button>
        </div>
      </div>

      <div class="cfGrid">
        <div class="cfCard cfUsage">
          <div class="cfCardTitle">Usage</div>

          <div class="cfUsageTableWrap">
            <table class="cfUsageTable">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Electricity (kWh)</th>
                  <th>Natural Gas (therms)</th>
                </tr>
              </thead>
              <tbody id="usageBody-${y}"></tbody>
            </table>
          </div>

          <div class="cfTotals" id="usageTotals-${y}"></div>
        </div>

        <div class="cfCard cfCarbon">
          <div class="cfHeadRow">
            <div class="cfTitleRight">Carbon Footprint</div>

            <div class="cfSeg" data-seg="mode" aria-label="View">
              <button data-mode="month" class="isActive">Month</button>
              <button data-mode="year">Year</button>
            </div>
          </div>

          <div class="cfChartWrap">
            <canvas id="co2Chart-${y}" height="120"></canvas>
          </div>

          <div class="cfMetrics" id="metrics-${y}"></div>

          <div class="cfHint">Tip: tap a month bar to update “Selected Month CO₂”.</div>
        </div>
      </div>
    </div>
  `).join("")}</div>`;

  // State + charts
  const stateByYear = {};
  const chartByYear = {};

  years.forEach((year) => {
    stateByYear[year] = {
      solar: "net",
      mode: "month",
      selectedMonth: null
    };
  });

  function renderUsage(year){
    const st = stateByYear[year];
    const d = computeYear(year, st.solar);

    const body = document.getElementById(`usageBody-${year}`);
    body.innerHTML = MONTHS.map((m, i) => `
      <tr>
        <td>${m}</td>
        <td style="text-align:right; font-variant-numeric: tabular-nums;">${fmt(d.elecKWh[i])}</td>
        <td style="text-align:right; font-variant-numeric: tabular-nums;">${fmt(d.gasTherm[i])}</td>
      </tr>
    `).join("");

    const totals = document.getElementById(`usageTotals-${year}`);
    totals.innerHTML = `
      <div class="cfTotalCard">
        <div class="k">Total Energy</div>
        <div class="v">${fmt(d.totalEnergyKWh)} kWh</div>
      </div>
      <div class="cfTotalCard">
        <div class="k">Total Electricity</div>
        <div class="v">${fmt(d.totalElecKWh)} kWh</div>
      </div>
      <div class="cfTotalCard">
        <div class="k">Total Natural Gas</div>
        <div class="v">${fmt(d.totalGasTherm)} therms</div>
      </div>
    `;
  }

  function renderMetrics(year, computed){
    const st = stateByYear[year];

    // Selected month CO2 (month mode only)
    let selectedMonthCO2 = null;
    let selectedMonthLabel = "Tap a month";
    if (st.mode === "month" && st.selectedMonth != null) {
      selectedMonthCO2 = computed.totalCO2Monthly[st.selectedMonth];
      selectedMonthLabel = MONTHS[st.selectedMonth];
    }

    const metrics = document.getElementById(`metrics-${year}`);
    metrics.innerHTML = `
      <div class="cfMetric cfMetricBig">
        <div class="k">Total CO₂</div>
        <div class="v">${fmt(computed.totalCO2)} lbs</div>
        <div class="cfMetricNote">Intensity: ${computed.kgPerM2.toFixed(1)} kg/m²</div>
      </div>

      <div class="cfMetric">
        <div class="k">Electricity CO₂</div>
        <div class="v">${fmt(computed.totalElecCO2)} lbs</div>
      </div>

      <div class="cfMetric">
        <div class="k">Natural Gas CO₂</div>
        <div class="v">${fmt(computed.totalGasCO2)} lbs</div>
      </div>

      <div class="cfMetric">
        <div class="k">Average Month CO₂</div>
        <div class="v">${fmt(computed.avgMonthly)} lbs</div>
      </div>

      <div class="cfMetric">
        <div class="k">Selected Month CO₂</div>
        <div class="v">${selectedMonthCO2 == null ? "—" : `${fmt(selectedMonthCO2)} lbs`}</div>
        <div class="cfMetricNote">${selectedMonthLabel}</div>
      </div>
    `;
  }

  function setSegButtonsActive(blockEl, st){
    blockEl.querySelectorAll('[data-seg="solar"] button').forEach(b=>{
      b.classList.toggle("isActive", b.dataset.solar === st.solar);
    });
    blockEl.querySelectorAll('[data-seg="mode"] button').forEach(b=>{
      b.classList.toggle("isActive", b.dataset.mode === st.mode);
    });
  }

  function drawChart(year){
    const st = stateByYear[year];
    const blockEl = mount.querySelector(`.cfYearBlock[data-year="${year}"]`);
    setSegButtonsActive(blockEl, st);

    const d = computeYear(year, st.solar);
    renderUsage(year);

    const ctx = document.getElementById(`co2Chart-${year}`);
    if (chartByYear[year]) chartByYear[year].destroy();

    if (st.mode === "month") {
      chartByYear[year] = new Chart(ctx, {
        type: "bar",
        data: {
          labels: MONTHS.map(m => m.slice(0,3)),
          datasets: [
            { label: "Electricity CO₂ (lbs)", data: d.elecCO2, backgroundColor: "rgba(59,130,246,.55)" },
            { label: "Gas CO₂ (lbs)",         data: d.gasCO2,  backgroundColor: "rgba(245,158,11,.55)" }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `CO₂ by Month (${st.solar === "net" ? "With solar" : "Without solar"})`
            },
            legend: { display: true }
          },
          scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: false }
          },
          onClick: (evt, elements) => {
            if (!elements?.length) return;
            st.selectedMonth = elements[0].index;
            renderMetrics(year, d);
          }
        }
      });
    } else {
      chartByYear[year] = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Electricity", "Natural Gas", "Total"],
          datasets: [{
            label: "CO₂ (lbs)",
            data: [d.totalElecCO2, d.totalGasCO2, d.totalCO2],
            backgroundColor: [
              "rgba(59,130,246,.55)",
              "rgba(245,158,11,.55)",
              "rgba(16,185,129,.55)"
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `CO₂ Year Total (${st.solar === "net" ? "With solar" : "Without solar"})`
            },
            legend: { display: true }
          },
          scales: { y: { beginAtZero: true } }
        }
      });

      st.selectedMonth = null;
    }

    renderMetrics(year, d);
  }

  // events
  years.forEach((year) => {
    const blockEl = mount.querySelector(`.cfYearBlock[data-year="${year}"]`);

    blockEl.querySelector('[data-seg="solar"]').addEventListener("click", (e) => {
      const b = e.target.closest("button[data-solar]");
      if (!b) return;
      stateByYear[year].solar = b.dataset.solar;
      drawChart(year);
    });

    blockEl.querySelector('[data-seg="mode"]').addEventListener("click", (e) => {
      const b = e.target.closest("button[data-mode]");
      if (!b) return;
      stateByYear[year].mode = b.dataset.mode;
      drawChart(year);
    });

    drawChart(year);
  });

})();

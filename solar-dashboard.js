
(function () {
  const root = document.getElementById("solar-dashboard");
  if (!root) return;

  const base = new URL(root.dataset.base || "", window.location.href).toString();
  const map = (() => {
    try { return JSON.parse(root.dataset.map || "{}"); }
    catch { return {}; }
  })();

  const RES_KEYS = ["minutes", "hours", "days", "weeks", "months"];
  const RES_LABEL = {
    minutes: "Minute",
    hours: "Hour",
    days: "Day",
    weeks: "Week",
    months: "Month",
  };

  const DEFAULT_TYPE_BY_RES = {
    minutes: "line",
    hours: "line",
    days: "line",
    weeks: "bar",
    months: "bar",
  };

  
  const DEFAULT_VIEW_POINTS = {
    minutes: 720, 
    hours:   168, 
    days:     90, 
    weeks:    52, 
    months:   36, 
  };

  root.innerHTML = `
    <div class="solarUI">
      <aside class="solarSide" id="solarSide"></aside>

      <section class="solarMain">
        <div class="solarHeader">
          <div class="solarStatus" id="solarStatus">Loading…</div>

          <div class="solarSeg" role="tablist" aria-label="Chart type">
            <button class="isActive" data-type="line" role="tab">Graph</button>
            <button data-type="bar" role="tab">Column</button>
          </div>
        </div>

        <div class="solarChartWrap">
          <canvas id="solarChart" height="120"></canvas>
        </div>
      </section>

      <section class="solarDetail">
        <div class="detailGrid">
          <div class="detailBlock">
            <h3>Summary (Totals by Resolution)</h3>
            <div id="summaryArea"></div>
          </div>

          <div class="detailBlock">
            <h3 id="selectedTitle">Selected Detail</h3>
            <div id="selectedArea"></div>
          </div>
        </div>
      </section>
    </div>
  `;

  const sideEl = root.querySelector("#solarSide");
  const statusEl = root.querySelector("#solarStatus");
  const typeButtons = [...root.querySelectorAll(".solarSeg button")];
  const canvas = root.querySelector("#solarChart");
  const summaryArea = root.querySelector("#summaryArea");
  const selectedTitle = root.querySelector("#selectedTitle");
  const selectedArea = root.querySelector("#selectedArea");

  RES_KEYS.forEach((k) => {
    const btn = document.createElement("button");
    btn.dataset.res = k;
    btn.textContent = RES_LABEL[k] || k;
    btn.disabled = !map[k];
    sideEl.appendChild(btn);
  });


  function parseTwoDigitYear(yy) {
    return (yy <= 69) ? (2000 + yy) : (1900 + yy);
  }

  function parseTimestamp(str) {
    const s = String(str || "").trim();
    const parts = s.split(/\s+/);
    if (parts.length < 2) return null;

    const [timePart, datePart] = parts;
    const t = timePart.split(":").map(Number);
    const d = datePart.split("/").map(Number);

    if (t.length !== 3 || d.length !== 3) return null;

    const [hh, mm, ss] = t;
    const [mo, da, yy] = d;
    const year = parseTwoDigitYear(yy);

    const dt = new Date(year, mo - 1, da, hh, mm, ss);
    return isNaN(dt) ? null : dt;
  }

  function parseCSVRows(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    const pts = [];
    for (const line of lines) {
      const idx = line.indexOf(",");
      if (idx === -1) continue;

      const vStr = line.slice(0, idx).trim();
      const tsStr = line.slice(idx + 1).trim();

      const value = Number(vStr);
      const dt = parseTimestamp(tsStr);

      if (!Number.isFinite(value) || !dt) continue;
      pts.push({ dt, value });
    }

    pts.sort((a, b) => a.dt - b.dt);
    return pts;
  }

  
  const fmt = {
    minutes: new Intl.DateTimeFormat(undefined, { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }),
    hours:   new Intl.DateTimeFormat(undefined, { month:"2-digit", day:"2-digit", hour:"2-digit" }),
    days:    new Intl.DateTimeFormat(undefined, { year:"numeric", month:"short", day:"2-digit" }),
    weeks:   new Intl.DateTimeFormat(undefined, { year:"numeric", month:"short", day:"2-digit" }),
    months:  new Intl.DateTimeFormat(undefined, { year:"numeric", month:"short" }),
  };

  function labelFor(resKey, dt) {
    return (fmt[resKey] || fmt.days).format(dt);
  }

  function kwh(n) { return Math.round(n).toLocaleString(); }

  const cache = {};   
  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.text();
  }

  async function loadRes(resKey) {
    if (cache[resKey]) return cache[resKey];
    const file = map[resKey];
    if (!file) throw new Error(`No CSV mapped for ${resKey}`);

    const url = new URL(file, base).toString();
    const text = await fetchText(url);
    const pts = parseCSVRows(text);

    const total = pts.reduce((a, p) => a + p.value, 0);
    const peak = pts.length ? Math.max(...pts.map(p => p.value)) : 0;
    const avg = pts.length ? total / pts.length : 0;
    const start = pts[0]?.dt ?? null;
    const end = pts.at(-1)?.dt ?? null;

    cache[resKey] = { resKey, pts, total, peak, avg, start, end, url };
    return cache[resKey];
  }

  async function preloadAll() {
    const jobs = RES_KEYS.filter(k => map[k]).map(k => loadRes(k).catch(() => null));
    await Promise.all(jobs);
  }

  function renderSummary(activeKey) {
    const rows = RES_KEYS
      .filter(k => map[k] && cache[k])
      .map(k => {
        const d = cache[k];
        const range = (d.start && d.end) ? `${d.start.toLocaleDateString()} → ${d.end.toLocaleDateString()}` : "—";
        return `
          <tr ${k === activeKey ? 'style="font-weight:900;"' : ""}>
            <td>${RES_LABEL[k]}</td>
            <td>${kwh(d.total)}</td>
            <td>${d.pts.length.toLocaleString()}</td>
            <td>${range}</td>
          </tr>`;
      }).join("");

    summaryArea.innerHTML = `
      <table class="detailTable">
        <thead>
          <tr>
            <th>Resolution</th>
            <th>Total (kWh)</th>
            <th>Points</th>
            <th>Date Range</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderSelected(resKey, viewPts) {
    const d = cache[resKey];
    selectedTitle.textContent = `Selected Detail — ${RES_LABEL[resKey]}`;

    const viewTotal = viewPts.reduce((a, p) => a + p.value, 0);
    const viewPeak = viewPts.length ? Math.max(...viewPts.map(p => p.value)) : 0;
    const viewAvg = viewPts.length ? viewTotal / viewPts.length : 0;
    const viewRange = (viewPts[0]?.dt && viewPts.at(-1)?.dt)
      ? `${viewPts[0].dt.toLocaleString()} → ${viewPts.at(-1).dt.toLocaleString()}`
      : "—";

    const showN = (resKey === "months") ? 12 : (resKey === "weeks") ? 12 : 10;
    const last = viewPts.slice(-showN);

    const lastList = last.map(p => `
      <div class="miniRow">
        <span>${labelFor(resKey, p.dt)}</span>
        <strong>${kwh(p.value)}</strong>
      </div>
    `).join("");

    selectedArea.innerHTML = `
      <table class="detailTable">
        <tbody>
          <tr><th>Total (All)</th><td>${kwh(d.total)} kWh</td></tr>
          <tr><th>Total (Shown)</th><td>${kwh(viewTotal)} kWh</td></tr>
          <tr><th>Average (Shown)</th><td>${kwh(viewAvg)} kWh</td></tr>
          <tr><th>Peak (Shown)</th><td>${kwh(viewPeak)} kWh</td></tr>
          <tr><th>Shown Range</th><td>${viewRange}</td></tr>
        </tbody>
      </table>

      <div class="miniList">
        <div style="font-weight:900; margin-top:6px;">Last ${showN} points</div>
        ${lastList || "<div class='miniRow'><span>No data</span><strong>—</strong></div>"}
      </div>
    `;
  }

  let chart;

  function setActiveResButton(resKey) {
    [...sideEl.querySelectorAll("button[data-res]")].forEach(b =>
      b.classList.toggle("isActive", b.dataset.res === resKey)
    );
    const active = sideEl.querySelector(`button[data-res="${resKey}"]`);
  active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function setActiveTypeButton(type) {
    typeButtons.forEach(b => b.classList.toggle("isActive", b.dataset.type === type));
  }

  function getDefaultViewPts(resKey, pts) {
    const n = DEFAULT_VIEW_POINTS[resKey] ?? pts.length;
    return pts.length > n ? pts.slice(-n) : pts;
  }

  function drawChart(resKey, type, viewPts) {
    if (chart) chart.destroy();

    const labels = viewPts.map(p => labelFor(resKey, p.dt));
    const values = viewPts.map(p => p.value);

    chart = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [{
          label: "Solar production (kWh)",
          data: values,
          borderWidth: 2,
          pointRadius: 0,
          tension: type === "line" ? 0.25 : 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: `${RES_LABEL[resKey]} — ${type === "line" ? "Graph" : "Column"}`
          }
        },
        scales: {
          x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0 } },
          y: { ticks: { callback: (v) => v } }
        }
      }
    });
  }

  const state = {
    resKey: "months",
    chartType: "auto"
  };

  async function update() {
    statusEl.textContent = "Loading…";
    const d = await loadRes(state.resKey);

    const defaultType = DEFAULT_TYPE_BY_RES[state.resKey] || "line";
    const type = (state.chartType === "auto") ? defaultType : state.chartType;

    const viewPts = getDefaultViewPts(state.resKey, d.pts);

    setActiveResButton(state.resKey);
    setActiveTypeButton(type);

    drawChart(state.resKey, type, viewPts);
    renderSummary(state.resKey);
    renderSelected(state.resKey, viewPts);

    statusEl.textContent = `Loaded ${d.pts.length.toLocaleString()} points • Showing ${viewPts.length.toLocaleString()} • Total: ${kwh(d.total)} kWh`;
  }

  
  sideEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-res]");
    if (!btn || btn.disabled) return;
    state.resKey = btn.dataset.res;
    await update();
  });

  root.querySelector(".solarSeg").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-type]");
    if (!btn) return;

    state.chartType = btn.dataset.type; 
    await update();
  });

  
  (async function init() {
    if (!map[state.resKey]) {
      const first = RES_KEYS.find(k => map[k]);
      if (first) state.resKey = first;
    }

    await preloadAll();
    await update();
  })();
})();

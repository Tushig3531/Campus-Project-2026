/* solar-compare.js
   Column-only comparison chart
   - Select Year
   - Toggle Month / Year
   Data columns per line:
   produced  month  year  consumed
*/

(function () {
  const mount = document.getElementById("solar-compare");
  if (!mount) return;

  // ===== Paste/keep your dataset here =====
  const RAW = `
170	1	2017		462
180	2	2017		497
363	3	2017		513
357	4	2017		461
341	5	2017		342
462	6	2017		282
487	7	2017		228
487	8	2017		204
435	9	2017		164
446	10	2017		530
243	11	2017		355
226	12	2017		371
170	1	2018		333
186	2	2018		319
228	3	2018		370
504	4	2018		337
481	5	2018		317
443	6	2018		268
410	7	2018		153
507	8	2018		185
401	9	2018		370
348	10	2018		391
294	11	2018		348
147	12	2018		422
151	1	2019		469
107	2	2019		409
145	3	2019		418
498	4	2019		364
381	5	2019		297
406	6	2019		222
432	7	2019		91
491	8	2019		179
487	9	2019		267
326	10	2019		550
285	11	2019		367
147	12	2019		408
190	1	2020		491
89	2	2020		385
362	3	2020		434
367	4	2020		369
460	5	2020		161
338	6	2020		148
2	7	2020		142
2	8	2020		222
2	9	2020		234
2	10	2020		372
2	11	2020		588
90	12	2020		374
177	1	2021		437
174	2	2021		413
214	3	2021		433
449	4	2021		359
409	5	2021		300
441	6	2021		215
514	7	2021		265
448	8	2021		178
439	9	2021		174
416	10	2021		332
288	11	2021		375
243	12	2021		461
163	1	2022		489
222	2	2022		515
337	3	2022		648
397	4	2022		656
352	5	2022		599
415	6	2022		460
479	7	2022		406
338	8	2022		373
0	9	2022		257
0	10	2022		478
0	11	2022		500
72	12	2022		597
111	1	2023		537
133	2	2023		505
296	3	2023		537
384	4	2023		555
448	5	2023		471
535	6	2023		363
490	7	2023		95
505	8	2023		121
502	9	2023		303
356	10	2023		534
292	11	2023		529
231	12	2023		620
134	1	2024		439
69	2	2024		571
378	3	2024		504
435	4	2024		445
394	5	2024		442
474	6	2024		338
427	7	2024		96
485	8	2024		132
513	9	2024		284
479	10	2024		606
389	11	2024		598
174	12	2024		737
125	1	2025		641
275	2	2025		561
200	3	2025		695
464	4	2025		592
424	5	2025		612
469	6	2025		566
439	7	2025		128
486	8	2025		139
443	9	2025		230
410	10	2025		502
325	11	2025		557
211	12	2025		592
`.trim();

  // Parse into {year -> {month -> {p,c}}}
  const byYear = new Map();

  RAW.split(/\r?\n/).forEach(line => {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 4) return;

    const produced = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);
    const consumed = Number(parts[3]);

    if (!Number.isFinite(produced) || !Number.isFinite(consumed) || !year || !month) return;

    if (!byYear.has(year)) byYear.set(year, new Map());
    byYear.get(year).set(month, { produced, consumed });
  });

  const years = [...byYear.keys()].sort((a,b) => a - b);
  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // UI
  mount.innerHTML = `
    <div class="compareUI">
      <aside class="compareSide">
        <div class="compareSideTitle">Year</div>
        <div class="compareYearGrid" id="yearGrid"></div>
      </aside>

      <section class="compareMain">
        <div class="compareHeader">
          <div class="compareStatus" id="cmpStatus">Loading…</div>

          <div class="compareSeg" id="cmpMode" role="tablist" aria-label="Month or Year">
            <button class="isActive" data-mode="month" role="tab">Month</button>
            <button data-mode="year" role="tab">Year</button>
          </div>
        </div>

        <div class="compareChartWrap">
          <canvas id="cmpChart" height="120"></canvas>
        </div>

        <div class="compareSummary" id="cmpSummary"></div>
      </section>
    </div>
  `;

  const yearGrid = mount.querySelector("#yearGrid");
  const statusEl = mount.querySelector("#cmpStatus");
  const modeEl = mount.querySelector("#cmpMode");
  const summaryEl = mount.querySelector("#cmpSummary");
  const canvas = mount.querySelector("#cmpChart");

  // Build year buttons
  years.forEach(y => {
    const b = document.createElement("button");
    b.className = "compareYearBtn";
    b.dataset.year = String(y);
    b.textContent = y;
    yearGrid.appendChild(b);
  });

  // State
  const state = {
    year: years.at(-1) || 2025,
    mode: "month" // month | year
  };

  let chart;

  function setActiveYearBtn() {
    [...yearGrid.querySelectorAll(".compareYearBtn")].forEach(b => {
      b.classList.toggle("isActive", Number(b.dataset.year) === state.year);
    });
  }

  function setActiveModeBtn() {
    [...modeEl.querySelectorAll("button")].forEach(b => {
      b.classList.toggle("isActive", b.dataset.mode === state.mode);
    });
  }

  function kwh(n) { return Math.round(n).toLocaleString(); }

  function renderSummary(totalP, totalC) {
    const net = totalP - totalC;
    const coverage = totalC > 0 ? (totalP / totalC) * 100 : null;

    summaryEl.innerHTML = `
      <div class="compareCard">
        <div class="k">Produced</div>
        <div class="v">${kwh(totalP)} kWh</div>
      </div>
      <div class="compareCard">
        <div class="k">Consumed</div>
        <div class="v">${kwh(totalC)} kWh</div>
      </div>
      <div class="compareCard">
        <div class="k">Net</div>
        <div class="v">${kwh(net)} kWh</div>
      </div>
      <div class="compareCard">
        <div class="k">Coverage</div>
        <div class="v">${coverage == null ? "—" : coverage.toFixed(1) + "%"}</div>
      </div>
    `;
  }

  function makeDataForYear(year) {
    const m = byYear.get(year) || new Map();
    const produced = [];
    const consumed = [];

    for (let mo = 1; mo <= 12; mo++) {
      const row = m.get(mo);
      produced.push(row ? row.produced : 0);
      consumed.push(row ? row.consumed : 0);
    }

    const totalP = produced.reduce((a,b) => a + b, 0);
    const totalC = consumed.reduce((a,b) => a + b, 0);

    return { produced, consumed, totalP, totalC };
  }

  function draw() {
    setActiveYearBtn();
    setActiveModeBtn();

    const { produced, consumed, totalP, totalC } = makeDataForYear(state.year);

    if (chart) chart.destroy();

    const isMonth = state.mode === "month";
    const labels = isMonth ? monthLabels : [String(state.year)];

    const dataProduced = isMonth ? produced : [totalP];
    const dataConsumed = isMonth ? consumed : [totalC];

    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Produced (kWh)",
            data: dataProduced,
            backgroundColor: "rgba(56,189,113,.55)"
          },
          {
            label: "Consumed (kWh)",
            data: dataConsumed,
            backgroundColor: "rgba(59,130,246,.55)"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: isMonth
              ? `Monthly Produced vs Consumed — ${state.year}`
              : `Year Total Produced vs Consumed — ${state.year}`
          }
        },
        scales: {
          x: { stacked: false, ticks: { maxRotation: 0 } },
          y: { beginAtZero: true }
        }
      }
    });

    statusEl.textContent = isMonth
      ? `${state.year} • Month view • Total Produced ${kwh(totalP)} kWh • Total Consumed ${kwh(totalC)} kWh`
      : `${state.year} • Year view • Produced ${kwh(totalP)} kWh • Consumed ${kwh(totalC)} kWh`;

    renderSummary(totalP, totalC);
  }

  // Events
  yearGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".compareYearBtn");
    if (!b) return;
    state.year = Number(b.dataset.year);
    draw();
    b.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  });

  modeEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-mode]");
    if (!b) return;
    state.mode = b.dataset.mode;
    draw();
  });

  // Boot
  // default year = latest
  const lastBtn = yearGrid.querySelector(`.compareYearBtn[data-year="${state.year}"]`);
  lastBtn?.classList.add("isActive");
  draw();

})();

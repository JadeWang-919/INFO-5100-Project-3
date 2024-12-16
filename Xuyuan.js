document.addEventListener("DOMContentLoaded", async function () {
  // Example states (same as before)
  const states = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ];

  // Populate the state select dropdown
  const stateSelectElem = document.getElementById("state-select");
  states.forEach((state) => {
    const option = document.createElement("option");
    option.value = state.toLowerCase().replace(/ /g, "_");
    option.textContent = state;
    stateSelectElem.appendChild(option);
  });

  const svg = d3.select("#time-series-svg");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 40, right: 60, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const chartArea = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("text")
    .text("Unemployment & Ethanol Consumption Trends")
    .attr("x", margin.left + chartWidth / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold");

  // Axes labels
  chartArea
    .append("text")
    .attr("class", "x-axis-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Year");

  chartArea
    .append("text")
    .attr("class", "y-axis-label-unemployment")
    .attr("x", -chartHeight / 2)
    .attr("y", -margin.left + 30)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .style("font-weight", "bold")
    .text("Unemployment Rate (%)");

  chartArea
    .append("text")
    .attr("class", "y-axis-label-ethanol")
    .attr("x", -chartHeight / 2)
    .attr("y", chartWidth + margin.right)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .style("font-weight", "bold")
    .text("Ethanol Consumption (Gallons per Capita)");

  // Define a clip path for lines and points
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "chart-clip")
    .append("rect")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const xScale = d3.scaleLinear().range([0, chartWidth]);
  const yScaleUnemployment = d3.scaleLinear().range([chartHeight, 0]);
  const yScaleEthanol = d3.scaleLinear().range([chartHeight, 0]);

  const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d"));
  const yAxisLeft = d3.axisLeft(yScaleUnemployment);
  const yAxisRight = d3.axisRight(yScaleEthanol);

  const xAxisGroup = chartArea
    .append("g")
    .attr("transform", `translate(0, ${chartHeight})`);
  const yAxisLeftGroup = chartArea.append("g");
  const yAxisRightGroup = chartArea
    .append("g")
    .attr("transform", `translate(${chartWidth}, 0)`);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  function renderGridlines() {
    const xGrid = d3.axisBottom(xScale).tickSize(-chartHeight).tickFormat("");

    const yGrid = d3
      .axisLeft(yScaleUnemployment)
      .tickSize(-chartWidth)
      .tickFormat("");

    chartArea.selectAll(".x-grid").remove();
    chartArea.selectAll(".y-grid").remove();

    chartArea
      .append("g")
      .attr("class", "grid x-grid")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xGrid);

    chartArea.append("g").attr("class", "grid y-grid").call(yGrid);
  }

  async function loadData() {
    try {
      const unemploymentData = await d3.csv(
        "unemployment_by_state_yearly_1976_2018.csv",
        d3.autoType
      );
      const ethanolData = await d3.csv(
        "apparent_per_capita_alcohol_consumption_1977_2018.csv",
        d3.autoType
      );
      console.log("Data loaded successfully");
      return { unemploymentData, ethanolData };
    } catch (error) {
      d3.select("#loading-message").text(
        "Error loading data. Please check console for details."
      );
      console.error("Data loading error:", error);
      throw error;
    }
  }

  function renderChart(stateName, unemploymentData, ethanolData) {
    chartArea.selectAll("text.no-data").remove();
    chartArea.selectAll("#viewport").remove();

    const stateUnemployment = unemploymentData.filter(
      (d) => d.state.toLowerCase() === stateName.toLowerCase()
    );
    const stateEthanol = ethanolData.filter(
      (d) => d.state.toLowerCase() === stateName.toLowerCase()
    );

    if (!stateUnemployment.length || !stateEthanol.length) {
      chartArea
        .append("text")
        .attr("class", "no-data")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("No data available for this state.");
      return;
    }

    const years = stateUnemployment.map((d) => d.year);
    const unemploymentRates = stateUnemployment.map((d) => ({
      year: d.year,
      value: d["Yearly Unemployment Rate"],
    }));
    const ethanolConsumption = stateEthanol.map((d) => ({
      year: d.year,
      value: d["ethanol_all_drinks_gallons_per_capita"],
    }));

    xScale.domain(d3.extent(years));
    yScaleUnemployment.domain([0, d3.max(unemploymentRates, (d) => d.value)]);
    yScaleEthanol.domain([0, d3.max(ethanolConsumption, (d) => d.value)]);

    xAxisGroup.call(xAxis);
    yAxisLeftGroup.call(yAxisLeft);
    yAxisRightGroup.call(yAxisRight);

    // Draw gridlines behind everything
    renderGridlines();

    const viewport = chartArea
      .append("g")
      .attr("id", "viewport")
      .attr("clip-path", "url(#chart-clip)");

    const unemploymentLine = d3
      .line()
      .x((d) => xScale(d.year))
      .y((d) => yScaleUnemployment(d.value));
    const ethanolLine = d3
      .line()
      .x((d) => xScale(d.year))
      .y((d) => yScaleEthanol(d.value));

    viewport
      .append("path")
      .datum(unemploymentRates)
      .attr("class", "line")
      .attr("d", unemploymentLine)
      .style("stroke", "#5db5f0")
      .style("fill", "none");

    viewport
      .append("path")
      .datum(ethanolConsumption)
      .attr("class", "line")
      .attr("d", ethanolLine)
      .style("stroke", "#ba4227")
      .style("fill", "none");

    updatePoints(viewport, unemploymentRates, ethanolConsumption);

    // Re-append axes on top
    chartArea.append(() => xAxisGroup.node());
    chartArea.append(() => yAxisLeftGroup.node());
    chartArea.append(() => yAxisRightGroup.node());
  }

  function updatePoints(viewport, unemploymentRates, ethanolConsumption) {
    viewport.selectAll(".point").remove();

    // Unemployment points
    viewport
      .selectAll(".unemployment-point")
      .data(unemploymentRates)
      .join("circle")
      .attr("class", "point unemployment-point")
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => yScaleUnemployment(d.value))
      .attr("r", 8)
      .style("fill", "#5db5f0")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`Year: ${d.year}<br>Unemployment: ${d.value}%`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Ethanol points
    viewport
      .selectAll(".ethanol-point")
      .data(ethanolConsumption)
      .join("circle")
      .attr("class", "point ethanol-point")
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => yScaleEthanol(d.value))
      .attr("r", 8)
      .style("fill", "#ba4227")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`Year: ${d.year}<br>Ethanol: ${d.value} gallons`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });
  }

  const zoom = d3.zoom().scaleExtent([1, 5]).on("zoom", handleZoom);
  svg.call(zoom);

  function handleZoom(event) {
    const new_xScale = event.transform.rescaleX(xScale);
    const new_yScaleUnemployment = event.transform.rescaleY(yScaleUnemployment);
    const new_yScaleEthanol = event.transform.rescaleY(yScaleEthanol);

    xAxis.scale(new_xScale);
    yAxisLeft.scale(new_yScaleUnemployment);
    yAxisRight.scale(new_yScaleEthanol);

    xAxisGroup.call(xAxis);
    yAxisLeftGroup.call(yAxisLeft);
    yAxisRightGroup.call(yAxisRight);

    const xGrid = d3
      .axisBottom(new_xScale)
      .tickSize(-chartHeight)
      .tickFormat("");
    chartArea.select(".x-grid").call(xGrid);

    const yGrid = d3
      .axisLeft(new_yScaleUnemployment)
      .tickSize(-chartWidth)
      .tickFormat("");
    chartArea.select(".y-grid").call(yGrid);

    chartArea
      .select("#viewport")
      .selectAll(".line")
      .attr("transform", event.transform);
    chartArea
      .select("#viewport")
      .selectAll(".point")
      .attr("transform", event.transform);

    chartArea.append(() => xAxisGroup.node());
    chartArea.append(() => yAxisLeftGroup.node());
    chartArea.append(() => yAxisRightGroup.node());
  }

  d3.select("#reset-view-xuyuan").on("click", () => {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  });

  // Load data and initial render
  const { unemploymentData, ethanolData } = await loadData();
  d3.select("#loading-message").remove();

  const stateSelect = d3.select("#state-select");
  stateSelect.on("change", function () {
    renderChart(this.value, unemploymentData, ethanolData);
  });

  // Initial chart rendering
  renderChart(stateSelect.node().value, unemploymentData, ethanolData);

  // **Important**: Make chart updateable from Arthur's code
  window.updateStateChart = function (stateName) {
    // Convert stateName to the format your chart expects (lowercase with underscores)
    // If Arthur's code gives you lowercase name with spaces, do:
    stateName = stateName.replace(/ /g, "_");
    renderChart(stateName, unemploymentData, ethanolData);
  };
});

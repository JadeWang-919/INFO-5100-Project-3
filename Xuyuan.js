// Xuyuan.js

document.addEventListener("DOMContentLoaded", async function () {
  // List of US States
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

  // Populate the "Select a State:" dropdown
  const stateSelectElem = document.getElementById("state-select");
  states.forEach((state) => {
    const option = document.createElement("option");
    option.value = state.toLowerCase().replace(/ /g, "_");
    option.textContent = state;
    stateSelectElem.appendChild(option);
  });

  // Initialize SVG and chart dimensions
  const svg = d3
    .select("#time-series-svg")
    .attr("viewBox", `0 0 1000 600`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const width = 1000;
  const height = 600;
  const margin = { top: 80, right: 80, bottom: 80, left: 100 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Append a group for the chart area
  const chartArea = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add Chart Title
  svg
    .append("text")
    .text("Unemployment & Ethanol Consumption Trends")
    .attr("x", margin.left + chartWidth / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold");

  // Add Axes Labels
  chartArea
    .append("text")
    .attr("class", "x-axis-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 50)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Year");

  chartArea
    .append("text")
    .attr("class", "y-axis-label-unemployment")
    .attr("x", -chartHeight / 2)
    .attr("y", -70)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .style("font-weight", "bold")
    .text("Unemployment Rate (%)");

  chartArea
    .append("text")
    .attr("class", "y-axis-label-ethanol")
    .attr("x", -chartHeight / 2)
    .attr("y", chartWidth + 60)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .style("font-weight", "bold")
    .text("Ethanol Consumption (Gallons per Capita)");

  // Define a clip path to prevent drawing outside the chart area
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "chart-clip")
    .append("rect")
    .attr("width", chartWidth)
    .attr("height", chartHeight - 4)
    .attr("x", 0)
    .attr("y", 4);

  // Initialize Tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "arthur-tooltip")
    .style("opacity", 0);

  // Function to Load Data
  async function loadData() {
    try {
      const unemploymentData = await d3.csv(
        "unemployment_by_state_yearly_1976_2018.csv",
        d3.autoType
      );
      const ethanolData = await d3.csv(
        "alcohol_consumption_1977_2018.csv",
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

  // Global Variables to Store Current Data
  let currentUnemploymentData = [];
  let currentEthanolData = [];

  // Define 'viewport' Globally
  const viewport = chartArea
    .append("g")
    .attr("id", "viewport")
    .attr("clip-path", "url(#chart-clip)");

  const xScale = d3
    .scaleLinear()
    .domain([1977, 2018])
    .range([10, chartWidth - 10]);

  // Function to Render the Chart
  function renderChart(stateName, unemploymentData, ethanolData) {
    // Clear Previous Chart Elements
    viewport.selectAll(".line").remove();
    viewport.selectAll(".point").remove();
    viewport.selectAll(".year-marker").remove();
    viewport.selectAll(".year-highlight").remove();
    chartArea.selectAll("text.no-data").remove();

    // Clear existing axes and gridlines
    chartArea.selectAll(".x-axis").remove();
    chartArea.selectAll(".x-gridlines").remove();
    chartArea.selectAll(".y-axis").remove();
    chartArea.selectAll(".y-gridlines").remove();

    // Filter Data for the Selected State
    const stateUnemployment = unemploymentData.filter(
      (d) => d.state.toLowerCase() === stateName.toLowerCase()
    );
    const stateEthanol = ethanolData.filter(
      (d) => d.state.toLowerCase() === stateName.toLowerCase()
    );

    // Check if Data Exists
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

    // Prepare Data
    const years = stateUnemployment.map((d) => d.year);
    const unemploymentRates = stateUnemployment.map((d) => ({
      year: d.year,
      value: d["Yearly Unemployment Rate"],
    }));
    const ethanolConsumption = stateEthanol.map((d) => ({
      year: d.year,
      value: d["ethanol_all_drinks_gallons_per_capita"],
    }));

    // Store Current Data Globally
    currentUnemploymentData = unemploymentRates;
    currentEthanolData = ethanolConsumption;

    // Define yScales
    const yScaleUnemployment = d3
      .scaleLinear()
      .domain([
        d3.min(unemploymentRates, (d) => d.value),
        d3.max(unemploymentRates, (d) => d.value),
      ])
      .range([chartHeight - 10, 10]);
    const yScaleEthanol = d3
      .scaleLinear()
      .domain([
        d3.min(ethanolConsumption, (d) => d.value),
        d3.max(ethanolConsumption, (d) => d.value),
      ])
      .range([chartHeight - 10, 10]);

    // Append Axes & Gridlines
    let xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    let xGridlines = d3
      .axisBottom(xScale)
      .tickSize(-chartHeight + 10)
      .tickFormat("");
    let xAxisGroup = chartArea
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis);
    let xGridlineGroup = chartArea
      .append("g")
      .attr("class", "x-gridlines")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xGridlines);
    xGridlineGroup.lower();

    let yAxisLeft = d3.axisLeft(yScaleUnemployment);
    let yAxisRight = d3.axisRight(yScaleEthanol);
    let yGridlines = d3
      .axisLeft(yScaleUnemployment)
      .tickSize(-chartWidth)
      .tickFormat("");
    let yAxisRightGroup = chartArea
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${chartWidth}, 0)`)
      .call(yAxisRight);
    let yAxisLeftGroup = chartArea
      .append("g")
      .attr("class", "y-axis")
      .call(yAxisLeft);

    let yGridlineGroup = chartArea
      .append("g")
      .attr("class", "y-gridlines")
      .call(yGridlines);
    yGridlineGroup.lower();

    // Define Lines
    const unemploymentLine = d3
      .line()
      .x((d) => xScale(d.year))
      .y((d) => yScaleUnemployment(d.value));

    const ethanolLine = d3
      .line()
      .x((d) => xScale(d.year))
      .y((d) => yScaleEthanol(d.value));

    // Draw Lines
    viewport
      .append("path")
      .datum(unemploymentRates)
      .attr("class", "line unemployment-line")
      .attr("d", unemploymentLine)
      .style("stroke", "#5db5f0")
      .style("fill", "none");

    viewport
      .append("path")
      .datum(ethanolConsumption)
      .attr("class", "line ethanol-line")
      .attr("d", ethanolLine)
      .style("stroke", "#ba4227")
      .style("fill", "none");

    // Draw Data Points
    // Unemployment Points
    viewport
      .selectAll(".unemployment-point")
      .data(unemploymentRates)
      .join("circle")
      .attr("class", "point unemployment-point")
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => yScaleUnemployment(d.value))
      .attr("r", 6)
      .style("fill", "#5db5f0")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(
          `Year: ${d.year}<br>Unemployment: ${d3.format(".3f")(d.value)}%`
        );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Ethanol Points
    viewport
      .selectAll(".ethanol-point")
      .data(ethanolConsumption)
      .join("circle")
      .attr("class", "point ethanol-point")
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => yScaleEthanol(d.value))
      .attr("r", 6)
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

    // Define Zoom Behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 4]) // Allow zooming out to 50% and in up to 400%
      .on("zoom", handleZoom);

    // Apply Zoom to SVG
    svg.call(zoom);

    function handleZoom(event) {
      const transform = event.transform;

      // Update Scales based on Zoom
      const new_xScale = transform.rescaleX(xScale);
      const new_yScaleUnemployment = transform.rescaleY(yScaleUnemployment);
      const new_yScaleEthanol = transform.rescaleY(yScaleEthanol);

      // Update Axes with New Scales
      xAxisGroup.call(xAxis.scale(new_xScale));
      yAxisLeftGroup.call(yAxisLeft.scale(new_yScaleUnemployment));
      yAxisRightGroup.call(yAxisRight.scale(new_yScaleEthanol));

      // Update Gridlines with New Scales
      const xGrid = d3
        .axisBottom(new_xScale)
        .tickSize(-chartHeight)
        .tickFormat("");
      const yGrid = d3
        .axisLeft(new_yScaleUnemployment)
        .tickSize(-chartWidth)
        .tickFormat("");

      chartArea.select(".x-gridlines").call(xGrid);
      chartArea.select(".y-gridlines").call(yGrid);

      // Update Lines with New Scales
      viewport.selectAll(".unemployment-line").attr(
        "d",
        d3
          .line()
          .x((d) => new_xScale(d.year))
          .y((d) => new_yScaleUnemployment(d.value))
      );

      viewport.selectAll(".ethanol-line").attr(
        "d",
        d3
          .line()
          .x((d) => new_xScale(d.year))
          .y((d) => new_yScaleEthanol(d.value))
      );

      // Update Points with New Scales
      viewport
        .selectAll(".unemployment-point")
        .attr("cx", (d) => new_xScale(d.year))
        .attr("cy", (d) => new_yScaleUnemployment(d.value));

      viewport
        .selectAll(".ethanol-point")
        .attr("cx", (d) => new_xScale(d.year))
        .attr("cy", (d) => new_yScaleEthanol(d.value));

      // Re-apply Highlights (if any)
      const selectedYearValue = +document.getElementById("year-select").value;
      if (selectedYearValue) {
        highlightYear(
          selectedYearValue,
          new_xScale,
          new_yScaleUnemployment,
          new_yScaleEthanol
        );
      }
    }

    // Reset Zoom Button Functionality
    d3.select("#reset-view-xuyuan").on("click", () => {
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });

    // Highlight the Currently Selected Year
    function highlightYear(
      selectedYear,
      xScale,
      new_yScaleUnemployment,
      new_yScaleEthanol
    ) {
      // Remove Previous Highlights
      viewport.selectAll(".year-marker").remove();
      viewport.selectAll(".year-highlight").remove();

      // Add Vertical Line at Selected Year
      viewport
        .append("line")
        .attr("class", "year-marker")
        .attr("x1", xScale(selectedYear))
        .attr("y1", 0)
        .attr("x2", xScale(selectedYear))
        .attr("y2", chartHeight)
        .style("stroke", "black")
        .style("stroke-dasharray", "4,4");

      // Highlight Unemployment Point for Selected Year
      const ur = currentUnemploymentData.find((d) => d.year === selectedYear);
      if (ur) {
        viewport
          .append("circle")
          .attr("class", "year-highlight unemployment-highlight")
          .attr("cx", xScale(ur.year))
          .attr("cy", new_yScaleUnemployment(ur.value))
          .attr("r", 10)
          .style("fill", "none")
          .style("stroke", "#5db5f0")
          .style("stroke-width", 3);
      }

      // Highlight Ethanol Consumption Point for Selected Year
      const ec = currentEthanolData.find((d) => d.year === selectedYear);
      if (ec) {
        viewport
          .append("circle")
          .attr("class", "year-highlight ethanol-highlight")
          .attr("cx", xScale(ec.year))
          .attr("cy", new_yScaleEthanol(ec.value))
          .attr("r", 10)
          .style("fill", "none")
          .style("stroke", "#ba4227")
          .style("stroke-width", 3);
      }
    }

    // Listen to Changes on the "Select a Year" Dropdown
    d3.select("#year-select").on("change", function () {
      const selectedYear = +this.value;
      highlightYear(selectedYear, xScale, yScaleUnemployment, yScaleEthanol);

      // Dispatch 'yearChanged' event to synchronize with the map
      const yearChangeEvent = new CustomEvent("yearChanged", {
        detail: { year: selectedYear },
      });
      window.dispatchEvent(yearChangeEvent);
      console.log(`Dispatched yearChanged event for year: ${selectedYear}`);
    });

    // After rendering the chart, call highlightYear
    const selectedYear = +document.getElementById("year-select").value;
    if (selectedYear) {
      highlightYear(selectedYear, xScale, yScaleUnemployment, yScaleEthanol);
    }

    // Listen for Custom 'yearChanged' Events from the Map
    window.addEventListener("yearChanged", function (e) {
      d3.select("#reset-view-xuyuan").node().click();
      const newYear = e.detail.year;
      // Update the "year-select" dropdown value without triggering the 'change' event again
      d3.select("#year-select").property("value", newYear);
      // Highlight the new year on the chart
      highlightYear(
        newYear,
        xScale,
        yScaleUnemployment,
        yScaleEthanol,
        currentUnemploymentData,
        currentEthanolData
      );
      console.log(`Received yearChanged event for year: ${newYear}`);
    });
  }

  // Load Data and Render Initial Chart
  const { unemploymentData, ethanolData } = await loadData();
  d3.select("#loading-message").remove();

  // Populate the "Select a Year" dropdown dynamically based on data
  const yearsUnemployment = unemploymentData.map((d) => d.year);
  const yearsEthanol = ethanolData.map((d) => d.year);
  const allYears = Array.from({ length: 2018 - 1977 + 1 }, (_, i) => 1977 + i);

  const yearSelectElem = document.getElementById("year-select");
  allYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelectElem.appendChild(option);
  });

  // Set the initial selected year to the latest year
  yearSelectElem.value = allYears[allYears.length - 1];

  const stateSelect = d3.select("#state-select");
  stateSelect.on("change", function () {
    renderChart(this.value, unemploymentData, ethanolData);
  });

  // Initial Chart Rendering
  renderChart(stateSelect.node().value, unemploymentData, ethanolData);

  // Dispatch 'yearChanged' event to synchronize with the map
  const initialYear = +yearSelectElem.value;
  const initialYearChangeEvent = new CustomEvent("yearChanged", {
    detail: { year: initialYear },
  });
  window.dispatchEvent(initialYearChangeEvent);
  console.log(`Dispatched initial yearChanged event for year: ${initialYear}`);

  // Make Chart Updateable from Arthur's Code
  window.updateStateChart = function (stateName) {
    stateName = stateName.replace(/ /g, "_");
    renderChart(stateName, unemploymentData, ethanolData);
    console.log(`Chart updated for state: ${stateName}`);
  };
});

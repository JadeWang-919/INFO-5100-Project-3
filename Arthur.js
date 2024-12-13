
// For main graph
const width = 960, height = 600;
const svg = d3.select("#choropleth");
const tooltip = d3.select("body").append("div").attr("class", "arthur-tooltip").style("visibility", "hidden");

// For legend
const legendSvg = d3.select("#legendSvg");
const unemploymentColorScale = d3.scaleSequential(d3.interpolateBlues);
const legendWidth = 20;
const legendHeight = 200;

// Create a group inside the legend SVG for the legend content
const legendGroup = legendSvg.append("g")
  .attr("class", "arthur-legend")
  .attr("transform", `translate(60,50)`);

const defs = legendSvg.append("defs");
const gradient = defs.append("linearGradient")
  .attr("id", "legend-gradient")
  .attr("x1", "0%").attr("x2", "0%")
  .attr("y1", "0%").attr("y2", "100%");

gradient.append("stop").attr("class", "start").attr("offset", "0%");
gradient.append("stop").attr("class", "end").attr("offset", "100%");

// Legend Title (centered above the rectangle)
legendGroup.append("text")
  .attr("class", "arthur-legend-title")
  .attr("x", legendWidth / 2)
  .attr("y", -20)
  .attr("text-anchor", "middle")
  .text("Unemployment rate");

const legendRect = legendGroup.append("rect")
  .attr("width", legendWidth)
  .attr("height", legendHeight);

const legendAxisGroup = legendGroup.append("g")
  .attr("transform", `translate(${legendWidth}, 0)`);

// "No data" label under the gradient
const noDataY = legendHeight + 30;
legendGroup.append("rect")
  .attr("x", 0)
  .attr("y", noDataY)
  .attr("width", legendWidth)
  .attr("height", 15)
  .attr("fill", "#ccc");

legendGroup.append("text")
  .attr("x", legendWidth / 2)
  .attr("y", noDataY + 28)
  .attr("text-anchor", "middle")
  .text("No data");

(async function loadAndVisualizeData() {
  const topoData = await d3.json("us-smaller.json");
  const alcoholData = await d3.csv("alcohol_consumption_1977_2018.csv", d3.autoType);
  const unemploymentData = await d3.csv("unemployment_by_state_1976_2018.csv", d3.autoType);
  const stateData = await d3.csv("state-data.csv");

  const stateIdToName = {
    1: "Alabama", 2: "Alaska", 4: "Arizona", 5: "Arkansas", 6: "California",
    8: "Colorado", 9: "Connecticut", 10: "Delaware", 11: "District of Columbia",
    12: "Florida", 13: "Georgia", 15: "Hawaii", 16: "Idaho", 17: "Illinois",
    18: "Indiana", 19: "Iowa", 20: "Kansas", 21: "Kentucky", 22: "Louisiana",
    23: "Maine", 24: "Maryland", 25: "Massachusetts", 26: "Michigan", 27: "Minnesota",
    28: "Mississippi", 29: "Missouri", 30: "Montana", 31: "Nebraska", 32: "Nevada",
    33: "New Hampshire", 34: "New Jersey", 35: "New Mexico", 36: "New York",
    37: "North Carolina", 38: "North Dakota", 39: "Ohio", 40: "Oklahoma",
    41: "Oregon", 42: "Pennsylvania", 44: "Rhode Island", 45: "South Carolina",
    46: "South Dakota", 47: "Tennessee", 48: "Texas", 49: "Utah", 50: "Vermont",
    51: "Virginia", 53: "Washington", 54: "West Virginia", 55: "Wisconsin", 56: "Wyoming"
  };

  const stateLookup = {};
  stateData.forEach(d => {
    stateLookup[d.State.toLowerCase()] = d.Code;
  });

  const projection = d3.geoAlbersUsa().fitSize([width, height], topojson.feature(topoData, topoData.objects.states));
  const path = d3.geoPath().projection(projection);

  const states = topojson.feature(topoData, topoData.objects.states).features;

  const yearSlider = d3.select("#yearSlider");
  const dataTypeDropdown = d3.select("#dataType");
  const yearLabel = d3.select("#yearLabel");

  // Mapping from data keys to descriptive labels in the legend
  const consumptionLabels = {
    "ethanol_beer_gallons_per_capita": "Beer consumption",
    "ethanol_wine_gallons_per_capita": "Wine consumption",
    "ethanol_spirit_gallons_per_capita": "Spirit consumption"
  };


  function updateMap(selectedYear, selectedType) {
    // Filter unemployment data by year
    const yearData = unemploymentData.filter(d => d.year === selectedYear);
    const unemploymentByState = Object.fromEntries(
      yearData.map(d => [d.state.toLowerCase(), d["Unemployed - Percent of Labor Force"]])
    );

    // Compute min and max unemployment for this year
    const values = Object.values(unemploymentByState).filter(v => v != null);
    const [minVal, maxVal] = d3.extent(values);

    // Handle cases where no data is available
    const actualMin = (minVal !== undefined) ? minVal : 0;
    const actualMax = (maxVal !== undefined) ? maxVal : 0;

    // Update color scale domain based on this year's data
    unemploymentColorScale.domain([actualMin, actualMax]);

    const gStates = svg.append("g").attr("class", "states-group");
    const gLabels = svg.append("g").attr("class", "labels-group");

    gStates.selectAll(".arthur-state")
      .data(states)
      .join("path")
      .attr("class", "arthur-state")
      .attr("d", path)
      .style("fill", d => {
        const stateName = stateIdToName[d.id];
        if (!stateName) return "#ccc"; 
        return stateName.toLowerCase() in unemploymentByState
          ? unemploymentColorScale(unemploymentByState[stateName.toLowerCase()])
          : "#ccc";
      })
      .on("mouseover", (event, d) => {
        const stateName = stateIdToName[d.id];
        if (!stateName) return;

        const alcoholInfo = alcoholData.find(
          record => record.state.toLowerCase() === stateName.toLowerCase() && record.year === selectedYear
        );

        d3.select(event.currentTarget)
          .raise()
          .style("stroke", "black")
          .style("stroke-width", "1px");

        const unemploymentRate = unemploymentByState[stateName.toLowerCase()];
        const selectedConsumptionLabel = consumptionLabels[selectedType];
        const selectedValue = alcoholInfo ? alcoholInfo[selectedType] : "No data";
        const formattedValue = (selectedValue !== "No data") ? selectedValue.toFixed(3) + " gallons per person" : "No data";

        tooltip
          .style("visibility", "visible")
          .html(`
            <strong>${stateName}</strong><br>
            Unemployment Rate: ${unemploymentRate != null ? unemploymentRate.toFixed(1) + '%' : 'No data'}<br>
            ${selectedConsumptionLabel}: ${formattedValue}
          `);
      })
      .on("mousemove", event => {
        tooltip
          .style("top", (event.pageY + 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", event => {
        d3.select(event.currentTarget)
          .style("stroke", "#ffffff")
          .style("stroke-width", "1px");

        tooltip.style("visibility", "hidden");
      });

    updateLegend(actualMin, actualMax);

      // Add state codes as text labels
      gLabels.selectAll(".state-code")
      .data(states)
      .join("text")
      .attr("class", "state-code")
      .attr("x", d => path.centroid(d)[0])
      .attr("y", d => path.centroid(d)[1])
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .text(d => {
        const stateName = stateIdToName[d.id]?.toLowerCase();
        return stateLookup[stateName] || "";
      })
      .style("font-size", "10px")
      .style("fill", "black");
  }


  function updateLegend(minVal, maxVal) {
    // Update gradient stops
    gradient.select(".start")
      .attr("stop-color", unemploymentColorScale(maxVal));

    gradient.select(".end")
      .attr("stop-color", unemploymentColorScale(minVal));

    legendRect.style("fill", "url(#legend-gradient)");

    // Legend scale and axis
    const legendScale = d3.scaleLinear()
      .domain([minVal, maxVal])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .ticks(6)
      .tickFormat(d => `${d.toFixed(1)}%`);

    legendAxisGroup.call(legendAxis);
  }

  yearSlider.on("input", function () {
    yearLabel.text(this.value);
    updateMap(+this.value, dataTypeDropdown.property("value"));
  });

  dataTypeDropdown.on("change", function () {
    updateMap(+yearSlider.property("value"), this.value);
  });

  // Initial render
  updateMap(+yearSlider.property("value"), dataTypeDropdown.property("value"));
})();

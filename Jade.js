async function drawGraph() {
  const svg = d3.select("#jade-svg");
  const width = svg.attr("width");
  const height = svg.attr("height");
  const margin = { top: 40, right: 60, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const disneyData = await d3.csv("disney_modified.csv", d3.autoType);
  const unemployData = await d3.csv(
    "unemployment_by_state_1976_2018.csv",
    d3.autoType
  );

  const title = svg
    .append("text")
    .text("Disney Movies vs Unemployment in US")
    .attr("x", margin.left + chartWidth / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .attr("class", "h3");

  // Count number of Disney movies by year
  let movieCountByYear = {};
  for (let i = 0; i < disneyData.length; i++) {
    let year = disneyData[i].year;
    if (!movieCountByYear[year]) {
      movieCountByYear[year] = 1;
    } else {
      movieCountByYear[year]++;
    }
  }

  // Ensure all years are included
  for (let year = 1976; year <= 2016; year++) {
    if (!movieCountByYear[year]) {
      movieCountByYear[year] = 0;
    }
  }

  let minMovies = Infinity;
  let maxMovies = -Infinity;

  // Find min and max number of movies
  for (let year in movieCountByYear) {
    let count = movieCountByYear[year];
    if (count < minMovies) minMovies = count;
    if (count > maxMovies) maxMovies = count;
  }

  // Aggregate total unemployment by year
  function aggregateUnemployment(data) {
    return data.reduce((acc, curr) => {
      const unemployed = Number(curr["Unemployed - Total"]);
      const existingYear = acc.find((item) => item.year === curr.year);
      if (existingYear) {
        existingYear["UnemployedTotal"] += unemployed;
      } else {
        acc.push({
          year: curr.year,
          UnemployedTotal: unemployed,
        });
      }
      return acc;
    }, []);
  }

  const aggregatedData = Object.values(
    aggregateUnemployment(unemployData)
  ).filter((d) => d.year <= 2016);

  let annotations = svg.append("g").attr("id", "annotations");
  let chartArea = svg
    .append("g")
    .attr("id", "chartArea")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3
    .scaleLinear()
    .domain([1976, 2016])
    .range([10, chartWidth - 10]);

  const yScale = d3
    .scaleLog()
    .domain(d3.extent(aggregatedData, (d) => d.UnemployedTotal))
    .range([chartHeight - 20, 20]);

  const colorScale = d3
    .scaleSequential(d3.interpolateBlues)
    .domain([minMovies, maxMovies]);

  const radiusScale = d3.scaleLinear().domain([0, maxMovies]).range([4, 12]); // Minimum and maximum radius for circles

  // Axes & Gridlines
  let xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
  let xGridlines = d3
    .axisBottom(xScale)
    .tickSize(-chartHeight + 20)
    .tickFormat("");
  annotations
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(${margin.left},${chartHeight + margin.top})`)
    .call(xAxis);
  annotations
    .append("g")
    .attr("class", "x gridlines")
    .attr("transform", `translate(${margin.left},${chartHeight + margin.top})`)
    .call(xGridlines);
  svg
    .append("text")
    .attr("x", margin.left + chartWidth / 2)
    .attr("y", margin.top + chartHeight + 40)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "15px")
    .text("Year");

  let yAxis = d3.axisLeft(yScale);
  let yGridlines = d3
    .axisLeft(yScale)
    .tickSize(-chartWidth + 10)
    .tickFormat("");
  annotations
    .append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .call(yAxis);
  annotations
    .append("g")
    .attr("class", "y gridlines")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .call(yGridlines);

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -margin.top - chartHeight / 2)
    .attr("y", margin.left / 2 - 15)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "15px")
    .text("Unemployment Population in US");

  const tooltip = d3
    .select("#jade-div")
    .append("div")
    .attr("class", "arthur-tooltip")
    .style("opacity", 0);

  // Set up zoom behavior
  const chartZoom = d3.zoom().scaleExtent([1, 5]).on("zoom", chartZoomed);
  svg.call(chartZoom);

  function chartZoomed(event) {
    viewport.attr("transform", event.transform);

    const new_xScale = event.transform.rescaleX(xScale);
    const new_yScale = event.transform.rescaleY(yScale);

    xAxis.scale(new_xScale);
    yAxis.scale(new_yScale);
    xGridlines.scale(new_xScale);
    yGridlines.scale(new_yScale);

    d3.select("g.x.axis").call(xAxis);
    d3.select("g.y.axis").call(yAxis);
    d3.select("g.x.gridlines").call(xGridlines);
    d3.select("g.y.gridlines").call(yGridlines);

    // Update circle radius and stroke width
    viewport
      .selectAll("circle")
      .attr(
        "r",
        (d) => radiusScale(movieCountByYear[d.year]) / event.transform.k
      )
      .attr("stroke-width", 2 / event.transform.k);

    // Update line path with new scales
    linePath.attr(
      "d",
      d3
        .line()
        .x((d) => new_xScale(d.year))
        .y((d) => new_yScale(d.UnemployedTotal))
        .curve(d3.curveMonotoneX)(aggregatedData)
    );
  }

  function resetZoom() {
    svg.transition().duration(750).call(chartZoom.transform, d3.zoomIdentity);
  }
  document.getElementById("reset-view").addEventListener("click", resetZoom);

  // Clip Path for the chart
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", chartWidth)
    .attr("height", chartHeight - 10)
    .attr("x", 0)
    .attr("y", 10);

  chartArea.attr("clip-path", "url(#clip)");

  let viewport = chartArea.append("g");

  const line = d3
    .line()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.UnemployedTotal))
    .curve(d3.curveMonotoneX);

  const linePath = chartArea
    .append("path")
    .data([aggregatedData])
    .join("path")
    .attr("class", "line")
    .attr("d", line)
    .style("stroke", "#393e8f")
    .style("fill", "none")
    .style("stroke-width", 2);

  viewport
    .selectAll("circle")
    .data(aggregatedData)
    .join("circle")
    .attr("cx", (d) => xScale(d.year))
    .attr("cy", (d) => yScale(d.UnemployedTotal))
    .attr("r", (d) => radiusScale(movieCountByYear[d.year]))
    .attr("fill", (d) => colorScale(movieCountByYear[d.year]))
    .attr("stroke", "#12194a")
    .attr("stroke-width", 2)
    .style("opacity", 1)
    .on("mouseover", (event, d) => {
      const movieData = disneyData.filter((movie) => movie.year === d.year);
      const topMovieData = movieData.sort(
        (a, b) => b.total_gross - a.total_gross
      )[0];
      const topMovie = topMovieData ? topMovieData.movie_title : null;
      const topMovieGenre =
        topMovieData && topMovieData.genre ? topMovieData.genre : null;

      tooltip.transition().duration(200).style("opacity", 1);

      let tooltipContent = `Year: ${d.year}<br>Disney Movies: ${
        movieCountByYear[d.year]
      }<br>Unemployed: ${d.UnemployedTotal}`;

      if (topMovie) {
        tooltipContent += `<br>Top Disney Movie: ${topMovie}`;
      }

      if (topMovieGenre) {
        tooltipContent += `<br>Genre of Top Movie: ${topMovieGenre}`;
      }

      tooltip
        .html(tooltipContent)
        .style("left", `${event.pageX + 20}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", () =>
      tooltip.transition().duration(500).style("opacity", 0)
    );

  chartArea.select(".line").lower(); // Move line to the back

  // Legend
  const legendSvg = d3.select("#jade-legendSvg");
  const legendWidth = 20;
  const legendHeight = 200;
  const legendGroup = legendSvg
    .append("g")
    .attr("class", "arthur-legend")
    .attr("transform", `translate(40,50)`);

  const gradient = legendSvg
    .append("linearGradient")
    .attr("id", "jade-legend-gradient")
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "0%")
    .attr("y2", "100%");

  // Apply the color scale to the gradient stops
  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colorScale(minMovies));

  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colorScale(maxMovies));

  // Create the rectangle that will hold the gradient
  const legendRect = legendGroup
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#jade-legend-gradient)"); // Use the gradient for fill

  // Create the scale and axis for the legend
  const legendScale = d3
    .scaleLinear()
    .domain([minMovies, maxMovies])
    .range([0, legendHeight]);

  const legendAxis = d3
    .axisRight(legendScale)
    .ticks(5)
    .tickFormat(d3.format(".0f"));

  // Add the axis to the legend
  const legendAxisGroup = legendGroup
    .append("g")
    .attr("transform", `translate(${legendWidth}, 0)`)
    .call(legendAxis);

  legendGroup
    .append("text")
    .attr("class", "arthur-legend-title")
    .attr("x", 60)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .text("Disney Movie Amount 🎥");

  // Circle Size Legend
  const sizeLegendGroup = legendGroup
    .append("g")
    .attr("class", "circle-size-legend")
    .attr("transform", `translate(60, 0)`);

  const circleSizes = [
    radiusScale(0),
    radiusScale(maxMovies / 4),
    radiusScale(maxMovies / 2),
    radiusScale((3 * maxMovies) / 4),
    radiusScale(maxMovies),
  ];

  const sizeValues = [
    0,
    Math.round(maxMovies / 4),
    Math.round(maxMovies / 2),
    Math.round((3 * maxMovies) / 4),
    maxMovies,
  ];

  sizeLegendGroup
    .selectAll("circle")
    .data(circleSizes)
    .join("circle")
    .attr("cy", (d, i) => i * 45 + 5)
    .attr("cx", 30)
    .attr("r", (d) => d)
    .style("fill", "none")
    .style("stroke", "#3c61a4")
    .style("stroke-width", 1.5);

  sizeLegendGroup
    .selectAll("text")
    .data(sizeValues)
    .join("text")
    .attr("x", 50)
    .attr("y", (d, i) => i * 45 + 10)
    .attr("text-anchor", "start")
    .attr("font-size", "10px")
    .text((d) => d);
}

drawGraph();

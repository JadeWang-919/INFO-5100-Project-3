document.addEventListener("DOMContentLoaded", function () {
    const svg = d3.select("#time-series-svg");
    const width = svg.attr("width");
    const height = svg.attr("height");
    const margin = { top: 40, right: 60, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const chartArea = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const clipPath = chartArea
        .append("clipPath")
        .attr("id", "chart-clip")
        .append("rect")
        .attr("width", chartWidth)
        .attr("height", chartHeight);

    const viewport = chartArea.append("g").attr("clip-path", "url(#chart-clip)");

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

    async function loadData() {
        const unemploymentData = await d3.csv("unemployment_by_state_yearly_1976_2018.csv", d3.autoType);
        const ethanolData = await d3.csv("apparent_per_capita_alcohol_consumption_1977_2018.csv", d3.autoType);
        return { unemploymentData, ethanolData };
    }

    function renderChart(stateName, unemploymentData, ethanolData) {
        const stateUnemployment = unemploymentData.filter(
            (d) => d.state.toLowerCase() === stateName.toLowerCase()
        );
        const stateEthanol = ethanolData.filter(
            (d) => d.state.toLowerCase() === stateName.toLowerCase()
        );

        if (!stateUnemployment.length || !stateEthanol.length) {
            viewport.selectAll("*").remove();
            chartArea
                .append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight / 2)
                .attr("text-anchor", "middle")
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

        viewport.selectAll(".line").remove();
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

        updatePoints(unemploymentRates, ethanolConsumption);
    }

    function updatePoints(unemploymentRates, ethanolConsumption) {
        viewport.selectAll(".point").remove();
        
        const unemploymentPointScale = d3
        .scaleSqrt()
        .domain([0, d3.max(unemploymentRates, (d) => d.value)])
        .range([3, 10]);

    const ethanolPointScale = d3
        .scaleSqrt()
        .domain([0, d3.max(ethanolConsumption, (d) => d.value)])
        .range([3, 10]);

        viewport
            .selectAll(".unemployment-point")
            .data(unemploymentRates)
            .join("circle")
            .attr("class", "point unemployment-point")
            .attr("cx", (d) => xScale(d.year))
            .attr("cy", (d) => yScaleUnemployment(d.value))
            .attr("r", 5)
            .style("fill", "#5db5f0")
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip
                    .html(`Year: ${d.year}<br>Unemployment: ${d.value}%`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));

        viewport
            .selectAll(".ethanol-point")
            .data(ethanolConsumption)
            .join("circle")
            .attr("class", "point ethanol-point")
            .attr("cx", (d) => xScale(d.year))
            .attr("cy", (d) => yScaleEthanol(d.value))
            .attr("r", 5)
            .style("fill", "#ba4227")
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip
                    .html(`Year: ${d.year}<br>Ethanol: ${d.value} gallons`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));
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

        viewport.selectAll(".line").attr("transform", event.transform);
        viewport.selectAll(".point").attr("transform", event.transform);
    }




    loadData().then(({ unemploymentData, ethanolData }) => {
        const stateSelect = d3.select("#state-select");
        stateSelect.on("change", function () {
            renderChart(this.value, unemploymentData, ethanolData);
        });
        renderChart(stateSelect.node().value, unemploymentData, ethanolData);
    });
});

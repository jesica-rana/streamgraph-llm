const colors = {
  "GPT-4": "#e41a1c",
  "Gemini": "#377eb8",
  "PaLM-2": "#4daf4a",
  "Claude": "#984ea3",
  "LLaMA-3.1": "#ff7f00"
};

document.getElementById("fileInput").addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = d3.csvParse(e.target.result);
      d3.select("#upload-section").style("display", "none");
      d3.select("#chart-section").style("display", "block");
      drawStreamgraph(data);
    };
    reader.readAsText(file);
  }
});

function drawStreamgraph(data) {
  const svg = d3.select("#streamgraph");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 20, right: 30, bottom: 30, left: 50 };
  
  const parseDate = d3.timeParse("%m/%d/%y");


  data.forEach(d => {
    const rawDate = (d.Date || "").toString().trim();
    const parsedDate = parseDate(rawDate);
  
    if (!parsedDate) {
      console.warn("⚠️ Invalid date:", rawDate);
    }
  
    d.date = parsedDate || new Date(); // fallback to avoid NaN
  
    for (let key in colors) {
      let val = d[key];
      if (val !== undefined && val !== null && val !== "") {
        d[key] = +val.toString().replace(/,/g, '').trim();
      } else {
        console.warn(`⚠️ Missing or invalid value in ${key} for ${rawDate}:`, val);
        d[key] = 0;
      }
    }
  });

  const keys = Object.keys(colors);
  const stack = d3.stack()
  .keys(keys)
  .offset(d3.stackOffsetWiggle) 
  (data);

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(stack, layer => d3.min(layer, d => d[0])),
      d3.max(stack, layer => d3.max(layer, d => d[1]))
    ])
    .range([height - margin.bottom, margin.top]);

  const area = d3.area()
    .curve(d3.curveBasis) 
    .x(d => x(d.data.date))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]));

  svg.selectAll("path")
    .data(stack)
    .enter().append("path")
    .attr("fill", d => colors[d.key])
    .attr("d", area)
    .on("mousemove", function (event, d) {
      showTooltip(event, d.key, data);
    })
    .on("mouseleave", () => d3.select("#tooltip").classed("hidden", true));

  createLegend(keys);
  // X-axis
  svg.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y")))
  .selectAll("text")
  .attr("transform", "rotate(45)")
  .style("text-anchor", "start");

  // Y-axis
  svg.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(d3.axisLeft(y));

}

function createLegend(keys) {
  const legend = d3.select("#legend");
  keys.forEach(k => {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("div").attr("class", "legend-color").style("background-color", colors[k]);
    item.append("span").text(k);
  });
}

function showTooltip(event, key, data) {
  const tooltip = d3.select("#tooltip");
  tooltip.classed("hidden", false);
  tooltip.style("left", event.pageX + 15 + "px")
         .style("top", event.pageY - 100 + "px");

  const chart = d3.select("#tooltip-chart");
  chart.selectAll("*").remove();

  const width = +chart.attr("width");
  const height = +chart.attr("height");
  const margin = { top: 10, right: 10, bottom: 30, left: 30 };

  const x = d3.scaleBand()
    .domain(data.map(d => d3.timeFormat("%b")(d.date))) // Month names
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d[key])])
    .range([height - margin.bottom, margin.top]);

  chart.append("g")
    .selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("x", d => x(d3.timeFormat("%b")(d.date)))
    .attr("y", d => y(d[key]))
    .attr("height", d => height - margin.bottom - y(d[key]))
    .attr("width", x.bandwidth())
    .attr("fill", colors[key]);

  chart.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(45)")
    .style("text-anchor", "start");

  chart.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(3));
}


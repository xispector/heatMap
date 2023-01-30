
const cmyk2rgb = function(c, m, y, k, normalized) {
  c = (c / 100);
  m = (m / 100);
  y = (y / 100);
  k = (k / 100);
  
  c = c * (1 - k) + k;
  m = m * (1 - k) + k;
  y = y * (1 - k) + k;
  
  var r = 1 - c;
  var g = 1 - m;
  var b = 1 - y;
  
  if(!normalized){
      r = Math.round(255 * r);
      g = Math.round(255 * g);
      b = Math.round(255 * b);
  }
  return `rgb(${r}, ${g}, ${b})`
}

const setupFunction = (a, b, c) => {
  return (domain) => {
    if (domain < a) {
      return cmyk2rgb(0, 100 - (100 / a) * domain, 100, 0, false);
    } else if (domain >= a && domain < b) {
      return cmyk2rgb(0, 0, -(100 / (b - a)) * (domain - a) - 100, 0, false);
    } else if (domain >= b && domain < c) {
      return cmyk2rgb((100 / (c - b)) * (domain - b) + 200 - 200, 0, 0, 0, false);
    } else if (domain >= c) {
      return cmyk2rgb(100, (54 / (100 - c)) +(domain - c), 0, 0, false);
    }
  }
}

$(document).ready(() => {
  

  const size = {
    width: 1500,
    height: 700
  }
  const padding = {
    top: 10,
    bottom: 250,
    left: 100,
    right: 100
  }
  const svg = d3.select("svg");
  svg.attr("width", size.width).attr("height", size.height);

  
  const req = new XMLHttpRequest();
  req.open("GET", "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json", true);
  req.send();
  req.onload = () => {
    const json = JSON.parse(req.responseText);
    const baseTemperature = json.baseTemperature;
    const monthlyVariance = json.monthlyVariance;
    const domains = {
      year: d3.extent(monthlyVariance, d => d.year),
      month: d3.extent(monthlyVariance, d => d.month),
      variance: d3.extent(monthlyVariance, d => d.variance)
    }

    console.log();
    const xScale = d3.scaleBand().domain(d3.range(domains.year[0], domains.year[1] + 1)).range([0, size.width - padding.left - padding.right]);
    const yScale = d3.scaleBand().domain(d3.range(domains.month[0], domains.month[1] + 1)).range([0, size.height - padding.top - padding.bottom]);
    const colorScale = d3.scaleLinear().domain(domains.variance).range([100, 0]);

    console.log()
    const xAxis = d3.axisBottom(xScale).tickValues(d3.range(domains.year[0], domains.year[1]).filter((_, i) => i % 20 === 0));
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    const yAxis = d3.axisLeft(yScale).tickFormat((_, i) => month[i]);
  
    svg.append("g").attr("transform", `translate(${padding.left}, ${size.height - padding.bottom})`).attr("id", "x-axis").call(xAxis);
    svg.append("g").attr("transform", `translate(${padding.left}, ${padding.top})`).attr("id", "y-axis").call(yAxis); 

    svg.selectAll("rect").data(monthlyVariance).enter().append("rect")
    .attr("x", d => padding.left + xScale(d.year))
    .attr("y", d => padding.top + yScale(d.month))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", d => {
      const domain = colorScale(d.variance);
      return setupFunction(58, 58, 85)(domain);
    })
    .attr("class", "cell")
    .attr("data-month", d => d.month - 1)
    .attr("data-year", d => d.year)
    .attr("data-temp", d => d.variance)

    const legendSize = {
      content: {
        width: 300,
        height: 60
      },
      padding: {
        top: 0,
        left_right: 10,
        bottom: 30
      }
    }
    const legend = svg.insert("g", ":first-child").attr("id", "legend").attr("transform", `translate(${padding.left}, ${padding.top + size.height - padding.bottom + 30})`)
    .attr("width", legendSize.content.width + legendSize.padding.left_right * 2).attr("height", legendSize.content.height + legendSize.padding.top + legendSize.padding.bottom)
    
    const SPLIT_NUMBER = 5
    const makelegendColor = ((number) => {
      const arr = [];
      const jumpUnit = Math.round(100 / number)
      const half = Math.round(jumpUnit / 2);
      for (let i = half; i < 100; i += jumpUnit) {
        arr.push(setupFunction(58, 58, 85)(i))
      }
      return arr.reverse();
    })(SPLIT_NUMBER);

    const tempArr = d3.range(domains.variance[0], domains.variance[1], (domains.variance[1] - domains.variance[0]) / (SPLIT_NUMBER + 1));
    console.log(tempArr);
    const legendScale = d3.scalePoint().domain(tempArr).range([0, legendSize.content.width]);
    const lengendAxis = d3.axisBottom(legendScale).tickFormat(d => d3.format("r")(d + baseTemperature))

    legend.append("g").attr("transform", `translate(${legendSize.padding.left_right}, ${legendSize.padding.top + legendSize.content.height})`).call(lengendAxis)
    legend.selectAll("rect").data(makelegendColor).enter().append("rect")
    .attr("width", legendSize.content.width / SPLIT_NUMBER)
    .attr("height", legendSize.content.height)
    .attr("x", (_,i) => legendSize.padding.left_right + i * legendSize.content.width / SPLIT_NUMBER)
    .attr("y", legendSize.padding.top)
    .attr("fill", d => d)



    const tooltip = d3.select("#tooltip");
    $(".cell").hover((event) => {
      d3.select(event.target).attr("stroke", "black").attr("stroke-width", 2);
      tooltip.style("opacity", 0.8).style("left", `${event.target.x.baseVal.value + 40}px`).style("top", `${event.target.y.baseVal.value + 90}px`)
      .html(`${event.target.attributes["data-year"].value} - ${month[event.target.attributes["data-month"].value]}</br>
      ${parseFloat(event.target.attributes["data-temp"].value) + baseTemperature}</br>
      ${event.target.attributes["data-temp"].value}`).attr("data-year", event.target.attributes["data-year"].value);
    }, (event) => {
      tooltip.style("opacity", 0);
      d3.select(event.target).attr("stroke", "none");
    })
  }

})
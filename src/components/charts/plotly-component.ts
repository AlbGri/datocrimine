import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js/lib/core";
import bar from "plotly.js/lib/bar";
import choropleth from "plotly.js/lib/choropleth";
import scattergeo from "plotly.js/lib/scattergeo";

// Plotly completo pesa 4,5 MB: si registrano solo i tipi usati dal sito (scatter e' nel core).
// Un grafico di un tipo non registrato qui non compare.
Plotly.register([bar, choropleth, scattergeo]);

export default createPlotlyComponent(Plotly);

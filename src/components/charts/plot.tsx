"use client";

import dynamic from "next/dynamic";

// Un solo import dinamico: con piu' import separati Turbopack duplica il core di Plotly
export const Plot = dynamic(() => import("./plotly-component"), { ssr: false });

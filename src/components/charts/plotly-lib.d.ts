declare module "plotly.js/lib/*" {
  const lib: { register(modules: unknown[]): void };
  export default lib;
}

declare module "plotly.js/lib/core" {
  const lib: typeof import("plotly.js") & { register(modules: unknown[]): void };
  export default lib;
}

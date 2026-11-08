declare module "plotly.js/lib/*" {
  const lib: { register(modules: unknown[]): void };
  export default lib;
}

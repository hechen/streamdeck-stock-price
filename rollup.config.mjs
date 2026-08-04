import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.chen.stock-price.sdPlugin/bin/plugin.js",
    format: "esm",
    sourcemap: true
  },
  plugins: [resolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }), commonjs(), typescript()]
};

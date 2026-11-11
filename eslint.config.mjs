import { defineConfig, globalIgnores } from "eslint/config";
import web from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([...web, ...ts, globalIgnores([".next/**", "out/**", "next-env.d.ts"])]);

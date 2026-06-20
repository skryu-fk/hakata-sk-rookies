import { execSync } from "node:child_process";
import { copyFileSync } from "node:fs";

execSync("tsc -p tsconfig.ds.json", { stdio: "inherit" });

// ds-dist needs its own package.json (name + types) so tools that resolve a
// package root by walking up from a file inside ds-dist stop here instead of
// at the app's root package.json, which has no "types"/"main" pointing here.
copyFileSync("src/ds/package.json", "ds-dist/package.json");
copyFileSync("src/ds/styles.css", "ds-dist/styles.css");

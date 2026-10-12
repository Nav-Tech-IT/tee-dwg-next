// Public API of the engine. Framework-free: used by the web app today and by the MCP server later.
export { build, buildFrom, type Build, type BomLine, type Drawing, type Issue } from "./build";
export { solveLayout, type Lineup, type Module, type Section } from "./layout";
export { RequirementsSchema, exampleRequirements, parseRequirements, type Feeder, type Requirements } from "./requirements";
export * from "./system";
export { drawingSet } from "./drawings/sheets";
export type { Sheet } from "./drawings/sheet";
export { sheetToSvg, flatToSvg } from "./export/svg";
export { toDxf } from "./export/dxf";
export { bomCsv, feederScheduleCsv } from "./export/csv";
export { sheetsToPdf } from "./export/pdf";
export { factoryZip, packageName } from "./export/zip";
export { model3d, GROUPS3D, type Solid, type Group3D } from "./model3d";
export { RULES } from "./parts";

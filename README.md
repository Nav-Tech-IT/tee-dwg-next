# TSG Panel Studio

TEE's DB-panel design tool. An approved order goes in; the factory package comes out: line-up, 3D review, DXF cutting files and PDF drawings. A central component library holds the products and their real dimensions, with every value traced to a manufacturer document.

Runs locally. No logins.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # engine tests (parametric parts vs the reference DXFs)
```

Factory package from the command line:

```bash
npx tsx scripts/generate.ts [requirements.json] [out-dir]
```

## Layout

| Path | What it is |
|---|---|
| `src/engine/` | Design engine, pure TypeScript (no React, no database): requirements → layout → parts list → DXF / PDF / 3D model. Shared with the future MCP server. |
| `src/engine/parts/` | Part rules, one file per assembly area. Add a part by adding a rule. |
| `src/engine/generators/` | Parametric flat patterns (P50 frame, plinth, roof, panels, duct barrier, side wall, covers). |
| `src/engine/data/reference-flats.json` | Flats of the TSG-F 800 x 600 x 2000 reference section, from the original Python generator. Ground truth for the tests. |
| `src/library/` | Component library: SQLite schema, seed, repository, Excel/CSV importer. |
| `src/app/` | Pages and API routes (projects, export, library). |
| `data/library.sqlite` | The component library database. Back it up with *Library › Export JSON*. |
| `data/library-files/` | Uploaded catalogues, drawings and 3D models. |
| `projects/` | Saved projects (one JSON file per order). |
| `product-pdfs/` | Supplier documents and extraction outputs (CHINT price list, model list, download list). |
| `scripts/` | CLI tools: package generation, CSV import, CHINT price-list extraction. |

## Component library rules

- Brand › Type › Series (frame) › Product. Series values (e.g. dimensions per pole count) are shared; products override.
- Every value records its source document and page.
- Status: draft → extracted → verified. A product can only be verified when every required value is filled in and sourced; editing it (or its series) sends it back to extracted. Only verified products are meant for design.
- Prices are never stored.

# Floor Planner Skill

A specialized AI workflow for maintaining, extending, and debugging the SmartDine Interactive Floor Planner and Restaurant Layout Designer.

---

## Workflow Instructions

### 1. Analyze the Requested Floor Planner Task
- Review the user's intent against existing floor plan architecture:
  - **Stage & Canvas Engine**: `src/components/floorplan/FloorCanvas.tsx`
  - **Table Nodes**: `src/components/floorplan/TableNode.tsx`
  - **Furniture & Fixture Nodes**: `src/components/floorplan/FurnitureNode.tsx`
  - **Property Inspector**: `src/components/floorplan/PropertyPanel.tsx`
  - **Palette & Toolbox**: `src/components/floorplan/Toolbox.tsx`
  - **Save & State Managers**: `src/components/floorplan/AutoSaveEngine.ts`, `HistoryManager.ts`, `CollisionEngine.ts`
  - **Type Contracts**: `src/components/floorplan/types.ts`
  - **Dashboard Route Wrapper**: `src/app/(dashboard)/dashboard/tables/page.tsx`
- Identify minimal required changes before modifying any code.

### 2. Make Minimal Code Changes Only
- Keep changes surgical, localized, and clean.
- Avoid large-scale refactoring or rewriting unaffected components.
- Adhere strictly to the CleverOps React Hooks Safety Guardrail (`useState` -> `useRef` -> `useMemo` -> `useCallback` -> `useEffect` -> `useLayoutEffect`, zero hooks below returns).

### 3. Preserve QR Mapping & Blueprint Compatibility
- **Permanent QR Invariance**: Never alter or drop `qrCodeUrl`, `qr_token`, `table_id`, or physical table UUID mappings.
- **Blueprint Schema Compatibility**: Ensure all saved blueprint JSON objects remain backward-compatible across existing restaurant layouts.
- **Dimensions & Clamping**: Maintain standard minimum dimension bounds (e.g., minimum 30px bounds on width/height blur) without restricting active typing.
- **Zone Aliases**: Preserve zone aliases (`general` / `zone_general`) and ensure multi-zone filters remain accurate.

### 4. Build & Smoke Test Verification
- **Build Verification**: Always run `npm run build` to confirm 0 compilation and TypeScript errors across all routes before claiming completion.
- **Founder Smoke Suite**: When Floor Planner files (`src/components/floorplan/*` or `tables/page.tsx`) are modified, execute the founder verification suites:
  ```bash
  npx tsx scripts/test_founder_r4_smoke.ts
  npx tsx scripts/test_founder_r3_smoke.ts
  ```
  Ensure all P0 blueprint, fixture label, and QR tests achieve 100% pass rate.
- **React Hook Audit**: Run `node scripts/audit-react-hooks.mjs --all` to verify 0 hook violations.

### 5. Git & Deployment Safety
- **Never auto commit**: Do not run `git commit` automatically.
- **Never auto push**: Do not run `git push` or push code to remote repositories without explicit user instruction.

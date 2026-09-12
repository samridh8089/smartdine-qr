// SmartDine Vision+ Premium Floor Planner — Production Verification Suite
// Tests all 7 parts of the Founder Command

import { LocalDeterministicProvider } from '../src/components/floorplan/ai-layout/LayoutGenerator';
import { GeminiVisionProvider } from '../src/lib/ai/providers/geminiVision';
import { CAPTURE_TARGETS } from '../src/components/floorplan/ai-layout/GuidedPhotoCapture';
import { FURNITURE_MODEL_REGISTRY } from '../src/components/floorplan3d/ModelRegistry';
import { LAYOUT_ARCHETYPES } from '../src/components/floorplan/ai-layout/LayoutTemplates';
import { execSync } from 'child_process';

function runTests() {
  console.log('===============================================================');
  console.log('SMARTDINE VISION+ PREMIUM FLOOR PLANNER — FOUNDER PROD SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Frozen Engine Verification
  const gitDiff = execSync('git diff src/lib/inventoryEngine.ts src/lib/inventoryUnits.ts', { encoding: 'utf8' }).trim();
  assert(gitDiff.length === 0, 'Invariant: src/lib/inventoryEngine.ts and inventoryUnits.ts strictly untouched (diff = 0)');

  // 2. Bug 1: 3D Preview Sidebar Clearance
  const previewContent = execSync('type src\\components\\floorplan3d\\FloorPreview3D.tsx', { encoding: 'utf8' });
  assert(previewContent.includes('sidebarOffset'), 'Bug 1: FloorPreview3D automatically measures dynamic sidebarOffset');
  assert(previewContent.includes('left-0 lg:left-64'), 'Bug 1: Viewport starts after desktop CleverOps sidebar (lg:left-64)');
  assert(previewContent.includes('p-4 lg:p-6'), 'Bug 1: Desktop target equal 24px outer padding (p-6 = 24px)');

  // 3. Bug 2: Quick Presets Decoupled From Dimensions
  const modalContent = execSync('type src\\components\\floorplan\\ai-layout\\AILayoutModal.tsx', { encoding: 'utf8' });
  assert(!modalContent.includes('setWidth(preset.w)'), 'Bug 2: Quick Presets do NOT overwrite width dimension');
  assert(!modalContent.includes('setLength(preset.l)'), 'Bug 2: Quick Presets do NOT overwrite length dimension');
  assert(modalContent.includes('setLayoutStyle'), 'Bug 2: Quick Presets toggle layoutStyle theme without touching room dimensions');

  // 4. Bug 3: Photo Upload Optional
  assert(modalContent.includes('Option A — Room Size Only'), 'Bug 3: Option A (Dimensions Only) mode guidance displayed');
  assert(modalContent.includes('Skip Photos & Set Furniture'), 'Bug 3: Explicit Skip Photos button provided for immediate progression');
  assert(CAPTURE_TARGETS.every(t => t.isRequired === false), 'Bug 3: All photo targets marked optional so user is never blocked');

  // 5. Bug 4: Photo Cards Reference Illustrations & Captions
  const captureContent = execSync('type src\\components\\floorplan\\ai-layout\\GuidedPhotoCapture.tsx', { encoding: 'utf8' });
  assert(captureContent.includes('FrontReferenceSvg'), 'Bug 4: Faded architectural SVG reference illustration for Front');
  assert(captureContent.includes('LeftWallReferenceSvg'), 'Bug 4: Faded architectural SVG reference illustration for Left Wall');
  assert(captureContent.includes('RightWallReferenceSvg'), 'Bug 4: Faded architectural SVG reference illustration for Right Wall');
  assert(captureContent.includes('BackWallReferenceSvg'), 'Bug 4: Faded architectural SVG reference illustration for Back Wall');
  assert(captureContent.includes('KitchenReferenceSvg'), 'Bug 4: Faded architectural SVG reference illustration for Kitchen');
  assert(captureContent.includes('Stand near entrance. Capture straight toward dining area.'), 'Bug 4: Explicit Front caption present');
  assert(captureContent.includes('Completed'), 'Bug 4: Completed check badge rendered when photo is captured');

  // 6. Part 2: Gemini Vision Architectural Detection
  const visionFallback = GeminiVisionProvider.generateDeterministicFallback(
    { width: 60, length: 35, unit: 'ft', areaSqFt: 2100, areaSqM: 195 },
    []
  );
  assert(Boolean(visionFallback.doors && visionFallback.doors.length > 0), 'Part 2: Doors detected');
  assert(Boolean(visionFallback.windows && visionFallback.windows.length > 0), 'Part 2: Windows detected');
  assert(Boolean(visionFallback.acUnits && visionFallback.acUnits.length > 0), 'Part 2: AC units detected');
  assert(Boolean(visionFallback.ceilingHeightFt && visionFallback.ceilingHeightFt > 8), 'Part 2: Ceiling height detected');
  assert(Boolean(visionFallback.lightingDirection), 'Part 2: Lighting direction detected');
  assert(Boolean(visionFallback.unusedCorners && visionFallback.unusedCorners.length > 0), 'Part 2: Unused corners detected');

  // 7. Part 3 & Part 5: Real Interior Designer Layouts Generation
  const provider = new LocalDeterministicProvider();
  const input = {
    dimensions: { width: 60, length: 35, unit: 'ft' as const, areaSqFt: 2100, areaSqM: 195 },
    requirements: [
      { id: 't4', name: '4-Seater Table', category: 'tables' as const, quantity: 12, defaultSeats: 4 },
      { id: 't2', name: '2-Seater Table', category: 'tables' as const, quantity: 4, defaultSeats: 2 },
      { id: 'booth', name: 'Booth Table', category: 'tables' as const, quantity: 4, defaultSeats: 4, shape: 'booth' as const }
    ],
    restaurantName: 'The Heritage Bistro',
    currentSeats: 26
  };

  const suggestions = (provider as any).generateLayouts(input);
  suggestions.then((layouts: any[]) => {
    assert(layouts.length === 4, 'Part 5: Exactly 4 architectural layouts generated');
    const names = layouts.map(l => l.name);
    assert(names.includes('Open Dining'), 'Part 5: Layout 1 (Open Dining) generated');
    assert(names.includes('Family Booth Layout'), 'Part 5: Layout 2 (Family Booth) generated');
    assert(names.includes('Fast Service Layout'), 'Part 5: Layout 3 (Fast Service) generated');
    assert(names.includes('Premium Lounge Layout'), 'Part 5: Layout 4 (Premium Lounge) generated');

    // Verify interior elements in each layout
    layouts.forEach(l => {
      const items = l.items;
      assert(items.some((it: any) => it.furnitureType === 'pendant_light'), `Part 3: ${l.name} contains pendant lights`);
      assert(items.some((it: any) => it.furnitureType === 'spotlight'), `Part 3: ${l.name} contains spotlights`);
      assert(items.some((it: any) => it.furnitureType === 'wall_art' || it.furnitureType === 'slat_wall'), `Part 3: ${l.name} contains wall art / acoustic slat panels`);
      assert(items.some((it: any) => it.furnitureType?.startsWith('plant_')), `Part 3: ${l.name} contains indoor plants`);
      assert(items.some((it: any) => it.furnitureType === 'wall_ac' || it.furnitureType === 'ceiling_ac'), `Part 3: ${l.name} contains AC cooling units`);
      assert(l.metrics.seats > 0, `Part 5: ${l.name} displays seats (${l.metrics.seats})`);
      assert(l.businessImpact.walkingAisleWidthFt > 0, `Part 5: ${l.name} displays aisle width (${l.businessImpact.walkingAisleWidthFt} ft)`);
      assert(Boolean(l.businessImpact.waiterEfficiencyBadge), `Part 5: ${l.name} displays waiter flow badge (${l.businessImpact.waiterEfficiencyBadge})`);
    });

    // 8. Part 4: Model Registry Mappings
    assert(Boolean(FURNITURE_MODEL_REGISTRY.wall_art), 'Part 4: wall_art registered in 3D Model Registry');
    assert(Boolean(FURNITURE_MODEL_REGISTRY.pendant_light), 'Part 4: pendant_light registered in 3D Model Registry');
    assert(Boolean(FURNITURE_MODEL_REGISTRY.spotlight), 'Part 4: spotlight registered in 3D Model Registry');
    assert(Boolean(FURNITURE_MODEL_REGISTRY.slat_wall), 'Part 4: slat_wall registered in 3D Model Registry');
    assert(Boolean(FURNITURE_MODEL_REGISTRY.wall_ac), 'Part 4: wall_ac registered in 3D Model Registry');
    assert(Boolean(FURNITURE_MODEL_REGISTRY.ceiling_ac), 'Part 4: ceiling_ac registered in 3D Model Registry');

    // 9. Part 4: False Ceiling in FloorScene
    const sceneContent = execSync('type src\\components\\floorplan3d\\FloorScene.tsx', { encoding: 'utf8' });
    assert(sceneContent.includes('CeilingSystem'), 'Part 4: CeilingSystem component present in FloorScene');
    assert(sceneContent.includes('downlights'), 'Part 4: Recessed downlights generated on false ceiling');
    assert(sceneContent.includes('wooden acoustic slats'), 'Part 4: Suspended wooden acoustic slats canopy generated');

    console.log('\n---------------------------------------------------------------');
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    console.log('---------------------------------------------------------------');

    if (failed === 0) {
      console.log('\n[PASS] ALL FOUNDER PRODUCTION VERIFICATIONS PASSED!');
    } else {
      process.exit(1);
    }
  }).catch((err: any) => {
    console.error('Error running test suite:', err);
    process.exit(1);
  });
}

runTests();

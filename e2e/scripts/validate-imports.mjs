// Import validation script — verifies all e2e infrastructure modules compile and import cleanly.
// Run: node e2e/scripts/validate-imports.mjs

import '../constants/index.ts';
import '../types/index.ts';
import '../utils/index.ts';
import '../helpers/environment.helper.ts';
import '../helpers/wait.helper.ts';
import '../helpers/retry.helper.ts';
import '../helpers/screenshot.helper.ts';
import '../helpers/storage-state.helper.ts';
import '../network/network.helper.ts';
import '../network/console.helper.ts';
import '../accessibility/accessibility.helper.ts';
import '../api/base-api.helper.ts';
import '../database/base-database.helper.ts';
import '../auth/base-auth.helper.ts';
import '../page-objects/index.ts';
import '../factories/index.ts';
import '../fixtures/index.ts';
import '../test-data/index.ts';
import '../mocks/index.ts';
import '../reports/index.ts';
import '../visual/index.ts';


console.log('✅ All Phase 7A.2 E2E infrastructure modules imported successfully with 0 errors.');

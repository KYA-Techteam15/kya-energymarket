import { describe, expect, it } from 'vitest';
import { checkBranchDirection } from './check-branch.mjs';

describe('sens des branches (spec 001, FR-018)', () => {
  it.each([
    ['feat-001-socle', 'dev', true],
    ['fix-typo-accueil', 'dev', true],
    ['dev', 'main', true],
    ['feat-001-socle', 'main', false],
    ['socle', 'dev', false],
    ['main', 'dev', false],
  ])('%s → %s', (source, target, allowed) => {
    expect(checkBranchDirection(source, target) === null).toBe(allowed);
  });
});

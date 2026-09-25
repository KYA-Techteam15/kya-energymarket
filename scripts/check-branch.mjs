// Sens des branches (docs/gouvernance/depot.md) : feat-NNN-nom → dev, dev → main.
// En CI : SOURCE_BRANCH et TARGET_BRANCH viennent de l'événement pull_request.
import { pathToFileURL } from 'node:url';

export function checkBranchDirection(source, target) {
  if (target === 'main') {
    return source === 'dev' ? null : `Seule « dev » peut fusionner vers « main » (reçu « ${source} »).`;
  }
  if (target === 'dev') {
    return /^feat-\d{3}-[a-z0-9-]+$/u.test(source) || /^fix-[a-z0-9-]+$/u.test(source)
      ? null
      : `Une branche vers « dev » doit s'appeler feat-NNN-nom ou fix-nom (reçu « ${source} »).`;
  }
  return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source = process.env.SOURCE_BRANCH ?? '';
  const target = process.env.TARGET_BRANCH ?? '';
  const problem = checkBranchDirection(source, target);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  console.log(`Sens des branches correct : ${source} → ${target}`);
}

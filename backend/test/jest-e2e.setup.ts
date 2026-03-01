import * as path from 'path';

const runRealDriveE2E = process.env.RUN_REAL_DRIVE_E2E === '1';

if (!runRealDriveE2E) {
  // Standard E2E must not depend on external Google Drive credentials.
  process.env.STORAGE_PROVIDER = 'LOCAL';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';
  process.env.STORAGE_PATH = path.join(process.cwd(), '.tmp', 'e2e-uploads');
}

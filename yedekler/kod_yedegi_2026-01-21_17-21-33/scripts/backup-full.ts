import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function main() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');
    const rootDir = path.join(__dirname, '..');

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`📦 Starting full backup...`);
    console.log(`📂 Project Root: ${rootDir}`);
    console.log(`📂 Backup Dir:  ${backupDir}`);

    // 1. Run Database Backup (JSON Export)
    console.log('\n[1/2] Exporting Database to JSON...');
    try {
        // Reuse the existing backup-db.ts script
        execSync(`npx tsx scripts/backup-db.ts`, { stdio: 'inherit', cwd: rootDir });
    } catch (error) {
        console.error('❌ Database export failed. Aborting full backup.');
        process.exit(1);
    }

    // 2. Create Project ZIP
    const zipName = `portfoy-full-project-${timestamp}.zip`;
    const zipPath = path.join(backupDir, zipName);
    console.log(`\n[2/2] Archiving project files to ${zipName}...`);

    // Files/Folders to exclude from the zip
    // Note: 'backups' is excluded to prevent recursion loop (backing up the backups)
    const excludes = [
        'node_modules',
        '.next',
        '.vercel',
        '.git',
        'backups',
        '.env.local', // Optional: include or exclude secrets? User said "herşeyi" (everything). usually secrets are risky but for local backup maybe desired. I'll include .env* for now as it is a "backup".
        // Actually, tar exclusion on windows vs linux can be tricky with slashes.
        // We will try standard pattern.
    ];

    // Build tar command
    // tar -a -c -f <archive> <files>
    // -a: auto-detect suffix (zip)
    // -c: create
    // -f: file
    // --exclude pattern

    // Construct exclude args
    const excludeArgs = excludes.map(e => `--exclude "${e}"`).join(' ');

    // Command: tar --exclude "node_modules" ... -acvf "backups/..." *
    // Note: We run from rootDir. "*" expands to all files in root.

    // Using simple tar command. 
    // Important: We must ensure we don't pick up the zip file itself if it's being written to current dir, but we are writing to backups/.
    // We excluded 'backups' folder, so we are safe from recursion.

    try {
        // We use "." to archive current directory content
        const command = `tar ${excludeArgs} -a -c -f "backups/${zipName}" * .env .env.local`;
        // Note: "*" in shell doesn't usually pick up hidden files like .env in some shells, but in basic cmd it might not. 
        // Safer to just use "." which means current directory.
        // But "." includes hidden files.
        // Let's refine the command: `tar --exclude ... -acf ... .`

        // Windows tar (bsdtar) supports local paths.
        console.log(`Executing: tar ${excludeArgs} -a -c -f "backups/${zipName}" .`);

        execSync(`tar ${excludeArgs} -a -c -f "backups/${zipName}" .`, {
            cwd: rootDir,
            stdio: 'inherit'
        });

        console.log(`\n✅ Full backup created successfully!`);
        console.log(`📍 Location: ${zipPath}`);

    } catch (error) {
        console.error('❌ Failed to create zip archive:', error);
        process.exit(1);
    }
}

main();

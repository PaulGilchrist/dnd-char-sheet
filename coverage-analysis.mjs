import { spawn } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const COVERAGE_FILE = path.join(ROOT, 'coverage', 'coverage-final.json');
const OUTPUT_FILE = '/tmp/coverage_files.json';
const TOP_N = 100;
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'coverage', 'public', 'vendor', 'eslint-plugin-custom']);

function pct(hit, total) {
    return total === 0 ? 100 : (hit / total) * 100;
}

function scoreFromEntry(entry) {
    const statementKeys = Object.keys(entry.s);
    const fnKeys = Object.keys(entry.f);
    const branchKeys = Object.keys(entry.b);

    const metrics = [];

    if (statementKeys.length > 0) {
        const hit = statementKeys.filter((k) => entry.s[k] > 0).length;
        metrics.push(pct(hit, statementKeys.length));
    }

    if (fnKeys.length > 0) {
        const hit = fnKeys.filter((k) => entry.f[k] > 0).length;
        metrics.push(pct(hit, fnKeys.length));
    }

    if (branchKeys.length > 0) {
        let hit = 0;
        let total = 0;
        for (const key of branchKeys) {
            const counts = Array.isArray(entry.b[key]) ? entry.b[key] : [entry.b[key]];
            total += counts.length;
            hit += counts.filter((c) => c > 0).length;
        }
        metrics.push(pct(hit, total));
    }

    if (metrics.length === 0) {
        return 100;
    }
    return Math.min(...metrics);
}

function isEmptyCoverage(entry) {
    return (
        Object.keys(entry.statementMap ?? {}).length === 0 &&
        Object.keys(entry.fnMap ?? {}).length === 0 &&
        Object.keys(entry.branchMap ?? {}).length === 0
    );
}

const RE_EXPORT_ONLY = /^export\s+(?:\*\s+from|\{[^}]*\}\s+from)\s+['"][^'"]+['"];?\s*$/;

function isPureReexportShim(source) {
    const lines = source.split('\n').map((line) => line.trim());
    return lines.some((line) => line !== '') && lines.every((line) => line === '' || RE_EXPORT_ONLY.test(line));
}

async function walk(dir) {
    const files = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (EXCLUDED_DIRS.has(entry.name)) continue;
            files.push(...(await walk(path.join(dir, entry.name))));
        } else if (/\.(js|jsx)$/.test(entry.name) && !/\.test\.(js|jsx)$/.test(entry.name)) {
            files.push(path.join(dir, entry.name));
        }
    }
    return files;
}

function runCoverage() {
    return new Promise((resolve, reject) => {
        const child = spawn('npm', ['run', 'test:coverage'], {
            cwd: ROOT,
            stdio: 'inherit',
            shell: process.platform === 'win32',
        });
        child.on('error', reject);
        child.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`npm run test:coverage exited with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}

async function main() {
    await runCoverage();

    const raw = await readFile(COVERAGE_FILE, 'utf8');
    let coverageData;
    try {
        coverageData = JSON.parse(raw);
    } catch (error) {
        console.error(`Failed to parse ${COVERAGE_FILE}: ${error.message}`);
        process.exit(1);
    }

    if (Object.keys(coverageData).length === 0) {
        console.error('Coverage data is empty; no files were analyzed.');
        process.exit(1);
    }

    const [srcFiles, serverFiles] = await Promise.all([
        walk(path.join(ROOT, 'src')),
        walk(path.join(ROOT, 'server')),
    ]);
    const sourceFiles = srcFiles.concat(serverFiles);

    const byAbsPath = new Map();
    let skippedShims = 0;
    for (const file of sourceFiles) {
        const abs = path.resolve(ROOT, file);
        const entry = coverageData[abs];
        if (entry && isEmptyCoverage(entry)) {
            skippedShims += 1;
            continue;
        }
        if (isPureReexportShim(await readFile(abs, 'utf8'))) {
            skippedShims += 1;
            continue;
        }
        let score = 0;
        let status = 'zero-coverage';
        if (entry) {
            score = scoreFromEntry(entry);
            status = 'partial';
        }
        byAbsPath.set(abs, { path: abs, score, status });
    }

    const files = [...byAbsPath.values()].sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.path.localeCompare(b.path);
    });

    const topFiles = files.slice(0, TOP_N);
    await writeFile(OUTPUT_FILE, JSON.stringify(topFiles, null, 2));

    const zeroCount = files.filter((f) => f.status === 'zero-coverage').length;
    const partialCount = files.filter((f) => f.status === 'partial').length;

    console.log(`Total source files: ${files.length}`);
    console.log(`Skipped shim files: ${skippedShims}`);
    console.log(`Zero-coverage files: ${zeroCount}`);
    console.log(`Partial-coverage files: ${partialCount}`);
    console.log(`Top ${TOP_N} files by coverage (lowest first):`);
    for (const file of topFiles) {
        console.log(`${file.score.toFixed(2).padStart(8)}  ${file.path}`);
    }
    console.log(`Wrote ${OUTPUT_FILE} with ${topFiles.length} entries.`);
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});

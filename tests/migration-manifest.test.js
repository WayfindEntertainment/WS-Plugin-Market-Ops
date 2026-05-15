import fs from 'node:fs/promises'
import path from 'node:path'

const PLUGIN_ROOT =
    'C:\\Users\\mslas\\OneDrive - Wayfind Entertainment LLC\\StudioPlugins\\ws_plugin_market_ops'
const MIGRATION_FILENAME_REGEX = /^[0-9]{3}_[a-z0-9_]+[.]sql$/

/**
 * Extract the declared plugin migration paths directly from `index.js`.
 *
 * This avoids loading the full route module graph in Jest, which would
 * otherwise require runtime-only plugin dependencies such as `express`.
 *
 * @returns {Promise<string[]>} Declared migration paths.
 */
async function readDeclaredMigrations() {
    const source = await fs.readFile(path.join(PLUGIN_ROOT, 'index.js'), 'utf8')
    const match = source.match(/migrations:\s*\[([\s\S]*?)\]/)

    if (!match) {
        return []
    }

    return Array.from(match[1].matchAll(/'([^']+\.sql)'/g), (migrationMatch) => migrationMatch[1])
}

describe('Market Ops plugin migration manifest', () => {
    test('declares one ordered relative sql migration path per schema file on disk', async () => {
        const migrations = await readDeclaredMigrations()

        expect(migrations).toHaveLength(13)

        const seen = new Set()
        let previousPrefix = -1

        for (const migrationPath of migrations) {
            expect(typeof migrationPath).toBe('string')
            expect(path.isAbsolute(migrationPath)).toBe(false)
            expect(migrationPath.endsWith('.sql')).toBe(true)

            const filename = path.basename(migrationPath)
            expect(filename).toMatch(MIGRATION_FILENAME_REGEX)

            const prefix = Number(filename.slice(0, 3))
            expect(prefix).toBeGreaterThan(previousPrefix)
            previousPrefix = prefix

            expect(seen.has(migrationPath)).toBe(false)
            seen.add(migrationPath)

            const resolvedPath = path.resolve(PLUGIN_ROOT, migrationPath)
            await expect(fs.access(resolvedPath)).resolves.toBeUndefined()
        }
    })
})

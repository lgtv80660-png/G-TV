The Netlify deploy errored, with the following guidance provided:

The build fails at [line 77-86](#L77-L86) because `fetchSeries` is imported from `@/lib/api` in [`app/(app)/series/page.tsx`](https://github.com/lgtv80660-png/G-TV/tree/main/app/(app)/series/page.tsx), but that export does not exist in [`lib/api.ts`](https://github.com/lgtv80660-png/G-TV/tree/main/lib/api.ts).

**Solution**

Open `lib/api.ts` and add the missing `fetchSeries` export. Based on the pattern of the existing file, it likely should look something like:

```typescript
export async function fetchSeries() {
  // fetch and return series data
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/series`);
  if (!res.ok) throw new Error("Failed to fetch series");
  return res.json();
}
```

Alternatively, if `fetchSeries` was renamed or already exists under a different name in `lib/api.ts`, update the import in `app/(app)/series/page.tsx` to match the correct export name:

```typescript
import { yourActualFunctionName, fetchSeriesCategories } from "@/lib/api";
```

After making the fix, commit and push the change to trigger a new build.

The relevant error logs are:

Line 65: - very dynamic requires (like require('./' + foo)).
Line 66: To resolve this, you can
Line 67: - remove them if possible, or
Line 68: - only use them in development, or
Line 69: - make sure they are statically scoped to some subfolder: path.join(process.cwd(), 'data', bar), or
Line 70: - add ignore comments: path.join(/*turbopackIgnore: true*/ process.cwd(), bar)
Line 71: Import trace:
Line 72:   App Route:
Line 73:     ./next.config.ts
Line 74:     ./app/api/transcode/route.ts
Line 75: > Build error occurred
Line 76: Error: Turbopack build failed with 4 errors:
Line 77: ./app/(app)/series/page.tsx:5:1
Line 78: Export fetchSeries doesn't exist in target module
Line 79:   3 | import { useEffect, useState } from "react";
Line 80:   4 | import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
Line 81: > 5 | import { fetchSeries, fetchSeriesCategories } from "@/lib/api";
Line 82:     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Line 83:   6 |
Line 84:   7 | export default function SeriesPage() {
Line 85:   8 |   const [series, setSeries] = useState<any[]>([]);
Line 86: The export fetchSeries was not found in module [project]/lib/api.ts [app-client] (ecmascript).
Line 160:     ./app/(app)/series/page.tsx [Client Component Browser]
Line 161:     ./app/(app)/series/page.tsx [Server Component]
Line 162:   Client Component SSR:
Line 163:     ./app/(app)/series/page.tsx [Client Component SSR]
Line 164:     ./app/(app)/series/page.tsx [Server Component]
Line 165:     at <unknown> (./app/(app)/series/page.tsx:5:1)
Line 166:     at <unknown> (./app/(app)/series/page.tsx:5:1)
Line 167:     at <unknown> (./app/(app)/series/page.tsx:5:1)
Line 168:     at <unknown> (./app/(app)/series/page.tsx:5:1)
Line 169: ​
Line 170: "build.command" failed                                        
Line 171: ────────────────────────────────────────────────────────────────
Line 172: ​
Line 173:   Error message
Line 174:   Command failed with exit code 1: npm run build
Line 175: ​
Line 176:   Error location
Line 177:   In Build command from Netlify app:
Line 178:   npm run build
Line 179: ​
Line 180:   Resolved config
Line 181:   build:
Line 182:     command: npm run build
Line 183:     commandOrigin: ui
Line 184:     publish: /opt/build/repo/.next
Line 185:     publishOrigin: ui
Line 186:   plugins:
Line 187:     - inputs: {}
Line 188:       origin: ui
Line 189:       package: "@netlify/plugin-nextjs"
Line 190: Build failed due to a user error: Build script returned non-zero exit code: 2
Line 191: Failing build: Failed to build site
Line 192: Finished processing build request in 25.041s
Line 193: Failed during stage 'building site': Build script returned non-zero exit code: 2

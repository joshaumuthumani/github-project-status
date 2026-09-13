import { NextRequest, NextResponse } from "next/server";
import { CURATED_STATUSES, writeMetadataEntry, type CuratedStatus } from "@/lib/metadata";

export const runtime = "nodejs";

// FR-10 / ADR-0004: the one deliberate write path. It can only ever update
// this repo's own curated-metadata file via lib/metadata's scoped PAT — it
// has no knowledge of, and no code path toward, any of the ~27 portfolio
// repos or any other file.
//
// Deliberately not validated against the live discovered repo list: a
// typo'd or renamed "owner/name" key can be written and then orphaned.
// This is docs/PRD.md §8's explicitly accepted MVP risk ("Metadata/GitHub
// drift... not solved in MVP; explicitly deferred, not an oversight"), not
// a gap introduced here.
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const repo = typeof body?.repo === "string" ? body.repo : null;
  const status = typeof body?.status === "string" ? body.status : null;
  const purpose = typeof body?.purpose === "string" ? body.purpose : null;
  const production = typeof body?.production === "boolean" ? body.production : null;

  if (!repo || !/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    return NextResponse.json({ error: "repo must be an \"owner/name\" string" }, { status: 400 });
  }
  if (!status || !CURATED_STATUSES.includes(status as CuratedStatus)) {
    return NextResponse.json({ error: `status must be one of: ${CURATED_STATUSES.join(", ")}` }, { status: 400 });
  }
  if (purpose === null) {
    return NextResponse.json({ error: "purpose must be a string" }, { status: 400 });
  }
  if (production === null) {
    return NextResponse.json({ error: "production must be a boolean" }, { status: 400 });
  }

  try {
    await writeMetadataEntry(repo, { status: status as CuratedStatus, purpose, production });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update curated metadata" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

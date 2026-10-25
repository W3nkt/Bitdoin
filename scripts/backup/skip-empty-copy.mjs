// stdin → stdout: drops COPY blocks with no rows from a pg_dump data file.
// They load nothing, but still need write access, which a hosted project
// does not give on some internal tables (e.g. storage.buckets_vectors).
// Blocks with rows pass through unchanged, so real permission problems
// still fail the restore.
import { createInterface } from 'node:readline'

let pending = null
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  if (pending !== null) {
    if (line !== '\\.') process.stdout.write(`${pending}\n${line}\n`)
    pending = null
  } else if (/^COPY .* FROM stdin;$/.test(line)) {
    pending = line
  } else {
    process.stdout.write(`${line}\n`)
  }
}
if (pending !== null) process.stdout.write(`${pending}\n`)

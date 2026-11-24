# Smart Campus — Software Engineering Practice 12

Two working implementations: Bolt React/TypeScript and Appsmith visual builder.

- Code demo: https://smartcampus-practice-yfnf.bolt.host
- Low-code demo: https://app.appsmith.com/app/smartcampus-lowcode/page1-6b0564f762b46899de31f58c
- Appsmith export is private; grant the instructor viewer access and verify sharing before submission.

## Reproduction
Code-based: `cd code-based`, `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run dev`.
Appsmith: import SmartCampus_LowCode.json into a compatible workspace and deploy; run Availability.runTests in the editor.
Identical rule-level comparison from repository root (requires Node and tsc):
```sh
tsc code-based/src/lib/availability.ts code-based/src/lib/demoData.ts --outDir compiled --module commonjs --target es2022 --skipLibCheck
node verify.cjs
```
Results: 8/8 each; Bolt platform suite 46/46; Appsmith platform suite 8/8. See report for limitations and unresolved edge cases.

## Submission
The course PDF specifies an email subject using Practice #13 even though the slide title says Practice #12. Do not attach ZIP archives to the email. Extract this local package, review it, upload the source and JSON to a repository, and provide report/screenshots as required. Review personal information in report and screenshots before any public upload; share those directly with the instructor or use redacted copies if appropriate. Never publish credentials.

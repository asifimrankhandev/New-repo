# Release checklist

From the planning guide, adapted to this codebase. Nothing here is done automatically.

## Product & legal

- [ ] Validation gates passed (competitor teardown, interviews, prototype, concierge test).
- [ ] Name, domain and trademarks cleared; update `app.json` name, slug, bundle IDs.
- [ ] Replace `SUPPORT_EMAIL` in `src/constants/app-info.ts` with a monitored inbox.
- [ ] Privacy policy and terms reviewed; in-app copy (`src/app/privacy.tsx`) matches them.
- [ ] Store descriptions make no promise of recovering money.

## Quality

- [ ] `npm run validate` passes.
- [ ] Development builds tested on a real iPhone and Android device.
- [ ] Create, edit, archive, reopen, delete a case; sample case flow.
- [ ] Partial refund + store credit: totals and “remaining” arithmetic.
- [ ] Evidence: camera, photo picker, PDF; >15 MB and unsupported types rejected; files survive restart.
- [ ] Reminders: allow/deny permission, snooze, complete, resolve case stops reminders, timezone change.
- [ ] Export preview equals shared file; exclusions respected.
- [ ] Backup → delete all → restore round trip, including evidence files; corrupt file rejected.
- [ ] Largest text size, VoiceOver and TalkBack pass on key screens; dark mode contrast.

## Store

- [ ] App Privacy (iOS) and Data safety (Play) match `docs/privacy-data-inventory.md`.
- [ ] Screenshots show the real app.
- [ ] `eas build` production profiles configured and signed.

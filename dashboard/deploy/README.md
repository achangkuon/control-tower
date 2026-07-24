# Dashboard deployment boundary

These files are operator-facing examples, not an automated deployment system. Every real-host smoke check, service restart, public route or certificate change, credential rotation, rollout, and rollback is blocked on **explicit future user approval**. Applying this work unit performs none of them.

## Release and credential layout

Use immutable release directories and keep all credentials outside them:

```text
/opt/control-tower-dashboard/releases/<release-id>/dashboard/
/opt/control-tower-dashboard/current -> /opt/control-tower-dashboard/releases/<release-id>/dashboard/
/etc/control-tower-dashboard/dashboard.env
```

For a release, copy only the self-contained `dashboard/` directory. Do not copy the repository, a worktree, a Control Tower database, SSH material, an operational socket, or any external runtime artifact. The release directory becomes read-only after verification.

The real environment file must remain `/etc/control-tower-dashboard/dashboard.env`, outside every release, owned by `root:root`, and mode `0600`. Never place it beneath `releases/<release-id>/dashboard/`. Generate the password hash through the standard-input helper; never put a plaintext password on a command line or in a release.

Caddy is the only public HTTPS listener. The Bun service remains on loopback and keeps authentication inside the application.

## Future approved rollout

After explicit approval, an operator performs this sequence:

1. Create a new immutable release directory from the verified application tree.
2. Verify the file set and external environment-file ownership privately, without changing the public route.
3. Start or inspect the candidate only through its loopback boundary; do not grant it repository, worktree, database, SSH, or operational-socket access.
4. Switch `/opt/control-tower-dashboard/current` to the candidate with one atomic symlink replacement.
5. Restart only the dashboard service.
6. Run the complete smoke checklist below at the unchanged dashboard URL. A failed check stops rollout and triggers the rollback procedure.

No step grants Control Tower authority or changes observed project, agent, task, or branch state.

## Future approved smoke checklist

Record outcomes, never credential values, cookies, protected response bodies, or fixture values.

- `/healthz` reports process availability only and discloses no dashboard or credential data.
- Unauthenticated `/` must redirect to `/login` with no protected value.
- Unauthenticated `/dashboard/content` must return 401 with no protected value.
- Invalid login must show generic failure with no protected data or username/password distinction.
- Authenticated flow must show loading and then populated or empty content through the same protected content route.
- Populated content exposes only project name, agent name, state, task title, and branch name; the empty path fabricates no record.
- After an approved rotation, the old credential and old cookie must fail, the replacement credential must succeed, and the unchanged dashboard URL must still be used.

## Future approved rollback

1. Select the known-good previous release.
2. Restore `/opt/control-tower-dashboard/current` with one atomic symlink replacement that points to that previous release.
3. Restart only the dashboard service.
4. Repeat the smoke checklist before considering the rollback complete.

Rollback changes only the release symlink and dashboard process. It requires no dashboard data migration, projection replay, queue repair, protocol downgrade, Tower database action, or P4-P6 recovery. Credential revocation remains independent: an operator may disable or rotate the external credentials under separate explicit approval without changing the release symlink or dashboard URL.

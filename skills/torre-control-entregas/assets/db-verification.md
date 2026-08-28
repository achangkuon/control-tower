# DB Verification

Replace every placeholder. Send separately from the git-delivery token.

```text
POST-MERGE DB VERIFICATION: <UNIT_ID>

Merged PR and remote merge SHA: <PR_URL_AND_MERGE_SHA>
Assigned execution context: <USER_ASSIGNED_CONTEXT>
Expected DB change: <MIGRATION_OR_CHANGE_IDENTITY>
Project DB instructions: <AUTHORITATIVE_FILES>
Inventory command: <DISCOVERED_INVENTORY_COMMAND>
Deploy/apply command: <DISCOVERED_DEPLOY_COMMAND>
Targeted remote verification: <DISCOVERED_VERIFICATION_COMMANDS_OR_QUERIES>

Stay in `MERGED` with the pending proof named in `note`; there is no separate DB state. The `db-writer` semaphore is independent from the Git delivery token, and you take and release it yourself. Load `coordinador_multi_agente` for the shared DB/resource semaphore only; do not use its stale delivery lifecycle. Do not use a release-publication gate or assume a provider.

1. Verify the assigned context, merged remote authority, project instructions, credentials target without exposing secrets, and expected inventory.
2. Request and receive explicit semaphore ownership. STOP before any DB command if ownership is unclear.
3. After interruption or stale/uncertain ownership, load `coordinador_multi_agente`, inspect the shared-resource state, and obtain explicit human confirmation to resume, transfer, or clear it. Never clear/reassign ownership silently.
4. Run the discovered inventory command. If the expected change is already applied, do not deploy. If inventory contains drift or unexpected pending changes, STOP without deployment.
5. Run the discovered deploy/apply command only when inventory exactly supports it.
6. Prove the expected remote effect with targeted verification; deploy output alone is insufficient.
7. In finally-style handling, release the semaphore explicitly after success, failure, skipped deployment, or verification error.

STOP on context mismatch, drift, unexpected changes, missing backup/approval required by project policy, command failure, or unverifiable remote effect.

Return: semaphore acquisition/release evidence, inventory before/after, deploy or no-deploy reason, exact command results, targeted remote proof, drift/blockers, and `DB semaphore released`.
```

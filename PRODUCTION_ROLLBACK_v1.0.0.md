# CleverOps Production Rollback Specification (v1.0.0-launch-candidate)

> **EMERGENCY ROLLBACK PROTOCOL**: Instructions to safely revert production code, deployments, or database migrations in case of zero-day defects.

---

## 1. Git Source Rollback Instructions

To roll back code to the baseline release candidate (`v1.0.0-launch-candidate`):

```bash
# 1. Fetch all release tags
git fetch --tags origin

# 2. Checkout the verified launch candidate tag
git checkout v1.0.0-launch-candidate

# 3. Create emergency patch branch
git checkout -b hotfix/emergency-rollback

# 4. Force push baseline to main (Requires Admin Access)
git push -f origin hotfix/emergency-rollback:main
```

---

## 2. Vercel Instant Deployment Rollback

1. Open Vercel Dashboard $ightarrow$ Projects $ightarrow$ **SmartDine QR**.
2. Navigate to **Deployments** tab.
3. Locate the deployment built from tag `v1.0.0-launch-candidate`.
4. Click **...** (Options) $ightarrow$ **Promote to Production**.
5. Vercel Edge Network will route 100% of production traffic to the rollback build within **3 seconds**.

---

## 3. Database Migration Rollback

If a migration broke schema contracts:

```sql
-- Rollback migration script template
BEGIN;
  -- Revert broken schema change
  -- Example: DROP TABLE IF EXISTS broken_feature;
COMMIT;
```

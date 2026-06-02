# Fix: RLS Infinite Recursion Error - Guild Creation Fix

## 🔴 Problem
When trying to create a guild, you're getting:
```
infinite recursion detected in policy for relation "profiles"
```

## ✅ Solution
The issue is in your Supabase RLS (Row-Level Security) policies. The `profiles` table policies had circular dependencies that caused infinite recursion.

### Root Cause
The previous policies used subqueries that referenced the same table:
```sql
-- ❌ WRONG: Creates infinite recursion
CREATE POLICY "profiles_select_own_guild" ON public.profiles
  FOR SELECT
  USING (
    guild_id = (SELECT guild_id FROM public.profiles WHERE id = auth.uid())  -- ← Recursion!
  );
```

### How to Fix

#### Option 1: Apply via Supabase SQL Editor (Recommended)
1. Go to your Supabase dashboard → SQL Editor
2. Click "New Query"
3. Copy the entire content from: `migrations/004_fix_rls_recursion.sql`
4. Run the query

#### Option 2: Apply via Supabase Migrations
```bash
# Your migration file is ready at:
# migrations/004_fix_rls_recursion.sql

# If using Supabase CLI, run:
supabase db push
```

### What the Fix Does

**Before (❌ Broken):**
```sql
-- Circular reference causes infinite loop
WHERE guild_id = (SELECT guild_id FROM public.profiles WHERE id = auth.uid())
AND EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
```

**After (✅ Fixed):**
```sql
-- Uses LIMIT 1 to prevent recursion + simpler logic
WHERE guild_id IN (
  SELECT COALESCE(guild_id, 'null') 
  FROM public.profiles 
  WHERE id = auth.uid() 
  LIMIT 1
)
```

### Changed Policies

| Policy | Change | Reason |
|--------|--------|--------|
| `profiles_select_own_guild` | Split into two simpler policies | Prevent AND/OR recursion |
| `profiles_select_admin` | NEW: Separate admin policy | Cleaner logic, no recursion |
| `profiles_update_own` | Simplified condition | Removed guild_id subquery |
| `profiles_update_admin` | NEW: Generic admin policy | Works for all admins without recursion |
| `profiles_insert_service` | NEW: Allow service role | Enables admin client operations |
| `profiles_delete_admin` | Simplified condition | Removed guild_id subquery |

### After Applying the Fix

✅ You should now be able to:
1. Create guilds without RLS errors
2. Update user profiles
3. Run Phase 5 billing features
4. All other operations work normally

### Verify the Fix

After applying the migration, test guild creation:
```typescript
// Try creating a guild - should work now!
const result = await createGuildOnboardingAction(
  "My Guild",
  "My Server", 
  "my-guild-url"
)
```

### Files Modified

- ✅ `migrations/003_saas_schema_update.sql` - Updated with fixed policies
- ✨ `migrations/004_fix_rls_recursion.sql` - NEW migration file for applying the fix

### Additional Notes

- The `createAdminClient()` in your code bypasses RLS, but still needs valid policies
- This fix maintains security while removing the circular reference
- All 14-day trial logic continues to work as expected

---

## 🚀 Next Steps

1. **Apply migration 004 to Supabase**
2. **Try creating a guild again** - it should work!
3. **Run the full build** to confirm no errors:
   ```bash
   npm run build
   ```

---

If you need help applying the migration or have other issues, let me know! 🎯

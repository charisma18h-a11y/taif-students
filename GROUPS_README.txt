Group registration fix for taif-students

1. Upload contents of this project to the GitHub repository root; Vercel will redeploy.
2. Sign into an existing student account, choose University Skills, and select Join Group.
3. The first request auto-creates university_group_members in the SAME PostgreSQL database used by student accounts, and seeds 66 archived entries without overwriting existing entries.
4. Student registration uses their existing account name and phone. Phone and normalized name are checked to prevent duplication. Moving requires the existing group change password. Student phones are not returned to browsers.
5. On a DB permission error, check Vercel Logs for CREATE TABLE privileges. No repeated inserts or additional Supabase RPCs are required.
6. For stronger security, set GROUP_CHANGE_PASSWORD in Vercel with a NEW, private password, then redeploy. The original shared password remains the default only until then.
7. No live database access was available during the build; verify operation by registering with a test student account and viewing from another browser.

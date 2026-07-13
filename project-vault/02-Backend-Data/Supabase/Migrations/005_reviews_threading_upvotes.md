# 005_reviews_threading_upvotes 🧱

- **File Path**: `supabase/migrations/005_reviews_threading_upvotes.sql`
- **Type**: Database Migration
- **Status**: Stable
- **Relations**: [[Vault-MOC]], [[Full-File-Inventory]]

---

## 📋 Purpose
Database changes supporting a recursive comment/review structure with Reddit-style nested replies, upvote tracking join tables (preventing duplicate array write races), and reviewer trust scoring.

---

## 🔌 Key Entities Created
- `public.reviews.parent_id`: foreign key column pointing to reviews(id) with cascade delete.
- `public.review_upvotes`: table tracking upvoted reviews by user.
- `public.get_review_thread(root_id)`: recursive query function.
- `public.get_reviewer_trust_score(reviewer_id)`: security definer function for reviewer badges.

---

## 🔗 Dependency Map
- **Imports**: None
- **Imported By**: None

# Rate My Rat

A daily drawing iOS app built with Expo and React Native. Users draw one rat per day, rate other users' rats, and earn badges for streaks and achievements.

## Features

- **Daily Drawing**: Draw one rat per day with a simple canvas (black background, limited palette: black, white, brown, and optional blood red)
- **Rating System**: Rate rats 1-3 scale with Bayesian weighted scoring
- **Wall View**: Browse rats in a masonry grid with All-Time and Today views
- **Badges & Streaks**: Track daily drawing streaks and earn achievement badges
- **In-App Purchase**: Unlock blood red color for £4.99 (RevenueCat integration required)
- **Emoji Reactions**: React to rats with emojis (visible in fullscreen only)
- **Admin Dashboard**: Role-gated moderation tools for reviewing reports
- **Push Notifications**: Opt-in notifications for ratings and badges

## Tech Stack

- **Frontend**: Expo 54, React Native, TypeScript
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions, Realtime)
- **Auth**: Sign in with Apple and Google OAuth
- **Storage**: Supabase Storage for rat images
- **Payments**: RevenueCat (requires native build - see setup below)
- **Platform**: iOS only

## Project Structure

```
rate-my-rat/
├── app/
│   ├── (tabs)/           # Main tab navigation
│   │   ├── index.tsx     # Wall screen
│   │   ├── draw.tsx      # Drawing canvas
│   │   ├── rate.tsx      # Rating screen
│   │   └── settings.tsx  # Settings & profile
│   ├── auth/             # Onboarding flow
│   │   ├── signin.tsx
│   │   ├── username.tsx
│   │   └── tour.tsx
│   ├── rat/
│   │   └── [id].tsx      # Rat detail with emoji reactions
│   ├── admin.tsx         # Admin moderation dashboard
│   ├── badges.tsx        # Badge collection screen
│   ├── purchase.tsx      # IAP screen (RevenueCat)
│   └── _layout.tsx       # Root navigation
├── components/
│   └── DrawingCanvas.tsx # SVG-based drawing component
├── contexts/
│   └── AuthContext.tsx   # Authentication state
├── lib/
│   ├── supabase.ts       # Supabase client
│   └── analytics.ts      # Analytics helper
├── supabase/
│   └── functions/        # Edge Functions (deployed)
│       ├── on-rating-insert/
│       ├── award-badges/
│       ├── moderate-image/
│       ├── word-filter/
│       └── verify-purchase/
└── scripts/
    └── seed.sql          # Test data seed script
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- Expo CLI
- iOS development environment (macOS with Xcode)
- Supabase account

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Supabase Setup

The database schema and Edge Functions are already deployed to your Supabase instance.

#### Database Tables
- `profiles` - User profiles
- `rats` - Rat drawings
- `ratings` - User ratings (1-3)
- `emoji_reactions` - Emoji reactions on rats
- `reports` - Moderation reports
- `badges` - Badge definitions
- `profile_badges` - Earned badges
- `purchases` - IAP transactions
- `notifications` - In-app notifications
- `analytics_events` - Event tracking

#### Storage Buckets
Create a `rats` bucket in Supabase Storage with public read access.

#### Edge Functions (Already Deployed)
- `on-rating-insert` - Updates rat scores after rating
- `award-badges` - Awards badges based on achievements
- `moderate-image` - Image moderation (stub for Google Vision API)
- `word-filter` - Username and title content filter
- `verify-purchase` - RevenueCat webhook handler

#### Auth Providers
Configure in Supabase Dashboard → Authentication → Providers:
- Enable Apple Sign In (iOS Bundle ID: `com.ratemyrat.app`)
- Enable Google OAuth (redirect URL: `ratemyrat://`)

### 5. Run Development Build

```bash
npm run dev
```

Scan the QR code with Expo Go (iOS) or build a development client.

### 6. RevenueCat Integration (For IAP)

The blood red color IAP requires RevenueCat SDK, which needs a native build:

1. Export the project:
   ```bash
   npx expo prebuild
   ```

2. Install RevenueCat:
   ```bash
   npm install react-native-purchases
   ```

3. Configure RevenueCat:
   - Create a RevenueCat account at https://www.revenuecat.com
   - Set up the `blood_red` product (non-consumable, £4.99)
   - Configure webhook to point to `verify-purchase` Edge Function
   - Update `app/purchase.tsx` with RevenueCat API calls

4. Build for iOS:
   ```bash
   npx expo run:ios
   ```

See: https://www.revenuecat.com/docs/getting-started/installation/expo

### 7. Testing

#### Create Test Data

1. Create 3+ test users via Supabase Auth dashboard
2. Update UUIDs in `scripts/seed.sql`
3. Run seed script via Supabase SQL Editor
4. Upload sample rat images to Storage

#### Feature Testing

- **Drawing**: One submission per day enforced by `(owner_id, day_key)` unique constraint
- **Rating**: Users cannot rate their own rats (RLS policy)
- **Moderation**: Set `is_admin=true` in profiles table to access admin dashboard
- **Dev Mode**: Set `BYPASS_MODERATION=true` in Edge Function env to skip image checks

## Key Features Detail

### Daily Drawing Limit
- Enforced by database unique constraint on `(owner_id, day_key)`
- UI shows countdown timer when user has already drawn today
- Streak tracking updates on successful submissions

### Rating & Ranking
- Bayesian weighted score: `(prior_weight * prior_mean + ratings_sum) / (prior_weight + ratings_count)`
- Prior: mean=2.0, weight=5 votes
- Tie-breakers: more ratings first, then earlier submission
- Live updates via Supabase Realtime

### Badges
- Streak badges: 3, 7, 14, 30, 50, 100 days
- Rater badges: 10, 50, 100, 250, 500 ratings given
- Top rat badges: avg ≥2.6 with 20+, 50+, 100+ ratings
- Consecutive top rat badges: 3, 7, 14 days

### Content Moderation
- Image moderation stub (integrate Google Cloud Vision SafeSearch)
- Word filter for usernames and titles
- Admin dashboard for reports and takedowns
- RLS policies hide rejected/pending content

### Push Notifications
- Expo push notifications (requires setup)
- In-app notification center
- Badge popups with opt-out in Settings

## Build for Production

### iOS Build

```bash
npx expo build:ios
```

Or use EAS Build:

```bash
npm install -g eas-cli
eas build --platform ios
```

## Security Notes

- All tables use Row Level Security (RLS)
- API keys stored in Expo Secure Store (iOS) or localStorage (web fallback)
- Users can only insert/update their own data
- Admin actions gated by `is_admin` column
- RevenueCat webhook validates purchases server-side

## Analytics

Track events:
- `app_open`
- `draw_started`
- `draw_submitted`
- `rating_given`
- `rat_viewed_fullscreen`
- `badge_earned`
- `purchase_started`
- `purchase_completed`

Data stored in `analytics_events` table.

## Troubleshooting

### Auth Issues
- Verify redirect URLs in Supabase Auth settings
- Check bundle identifier matches in app.json and Apple Developer
- Ensure auth tokens are persisted (check SecureStore)

### Drawing Not Saving
- Check Storage bucket permissions (public read, authenticated write)
- Verify RLS policies on `rats` table
- Check file upload size limits

### Ratings Not Updating
- Ensure Edge Function `on-rating-insert` is deployed
- Check function logs in Supabase dashboard
- Verify Realtime is enabled on `ratings` table

### RevenueCat Not Working
- RevenueCat requires a native build (won't work in Expo Go)
- Verify product IDs match between RevenueCat dashboard and app
- Check webhook is configured correctly

## License

MIT

## Support

For issues or questions, create an issue in the repository.

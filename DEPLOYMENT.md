# PolyGen AI SaaS - Deployment Guide

This guide walks you through deploying PolyGen AI as a monetized SaaS product.

## Prerequisites

- Node.js 18+
- Vercel account (free tier works)
- Supabase account (free tier works)
- Stripe account (test mode first, then live)
- Google AI Studio account (for Gemini API key)
- Anthropic account (for Claude API key)

## Step 1: Set Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note your project URL and anon key from Settings > API

2. **Run the Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/schema.sql`
   - Click "Run" to create the tables and functions

3. **Enable Google OAuth (Optional)**
   - Go to Authentication > Providers > Google
   - Add your Google OAuth credentials
   - Set redirect URL to `https://your-project.supabase.co/auth/v1/callback`

## Step 2: Set Up Stripe

1. **Create Stripe Products and Prices**
   - Go to [stripe.com](https://stripe.com) > Products
   - Create products:
     - **Pro Monthly**: $19/month
     - **Pro Yearly**: $190/year
     - **Enterprise Monthly**: $99/month
     - **Enterprise Yearly**: $990/year
   - Note the Price IDs (start with `price_`)

2. **Get API Keys**
   - Go to Developers > API keys
   - Copy your Secret key (starts with `sk_`)

3. **Set Up Webhook**
   - Go to Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the Webhook Secret (starts with `whsec_`)

4. **Set Up Customer Portal**
   - Go to Settings > Billing > Customer portal
   - Enable the portal and customize branding

## Step 3: Get AI API Keys

1. **Google Gemini**
   - Go to [aistudio.google.com](https://aistudio.google.com)
   - Create an API key

2. **Anthropic Claude**
   - Go to [console.anthropic.com](https://console.anthropic.com)
   - Create an API key

## Step 4: Deploy to Vercel

1. **Push to GitHub**
   ```bash
   cd polygen-ai-saas
   git add .
   git commit -m "Add SaaS monetization"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repo

3. **Configure Environment Variables**
   In Vercel project settings, add these environment variables:

   ```
   # AI APIs
   GEMINI_API_KEY=your_gemini_key
   ANTHROPIC_API_KEY=your_anthropic_key
   USE_MULTI_AGENT=true

   # Supabase
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Stripe
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   VITE_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
   VITE_STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
   VITE_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
   VITE_STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxx
   STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
   STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
   STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
   STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxx

   # App
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

## Step 5: Configure Custom Domain (Optional)

1. In Vercel, go to Settings > Domains
2. Add your domain (e.g., `polygen-ai.vercel.app`)
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` env var

## Step 6: Test the Flow

1. **Test Signup**
   - Visit your deployed site
   - Create an account
   - Verify email confirmation works

2. **Test Free Tier**
   - Make 5 generations
   - Verify limit modal appears

3. **Test Stripe Checkout (Test Mode)**
   - Click "Upgrade to Pro"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Verify subscription is created
   - Verify user tier updates to "pro"

4. **Test Customer Portal**
   - Click "Manage Subscription"
   - Verify portal opens
   - Test cancellation flow

## Step 7: Go Live

1. **Switch Stripe to Live Mode**
   - Create live products/prices
   - Update environment variables with live keys
   - Redeploy

2. **Monitor**
   - Set up Stripe alerts for failed payments
   - Monitor Vercel analytics
   - Check Supabase logs

## Revenue Projections

| Users | Free | Pro ($19/mo) | Enterprise ($99/mo) | MRR |
|-------|------|--------------|---------------------|-----|
| 1,000 | 900  | 90           | 10                  | $2,700 |
| 5,000 | 4,500| 450          | 50                  | $13,500 |
| 10,000| 9,000| 900          | 100                 | $27,000 |

## Marketing Channels

1. **Product Hunt** - Launch for visibility
2. **Reddit** - r/3Dprinting, r/OpenSCAD, r/maker
3. **Twitter/X** - Tech/maker community
4. **SEO** - Target "text to 3D", "AI 3D modeling"
5. **YouTube** - Demo videos, tutorials

## Support

- Set up support email: support@polygen-ai.vercel.app
- Consider Intercom or Crisp for live chat
- Create FAQ page for common questions

## Complete Pre-Launch Checklist

### Technical Setup
- [ ] Supabase project created and schema deployed
- [ ] Stripe products created with correct pricing
- [ ] Stripe webhook configured
- [ ] AI API keys obtained (Gemini, Claude)
- [ ] Vercel project deployed with all env vars
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

### Testing
- [ ] Email signup/login works
- [ ] Google OAuth works (if configured)
- [ ] Free tier generation limit enforced
- [ ] Stripe checkout completes successfully
- [ ] Subscription upgrades user tier
- [ ] Customer portal accessible
- [ ] Webhook updates tier on subscription changes
- [ ] Password reset flow works

### SEO & Analytics
- [ ] Google Analytics 4 set up (VITE_GA_MEASUREMENT_ID)
- [ ] Google Search Console verified
- [ ] Sitemap submitted to Search Console
- [ ] Meta tags verified with social preview tools
- [ ] Structured data validated

### Marketing Assets
- [ ] OG image created (1200x630px)
- [ ] Twitter card image created
- [ ] Favicon set created
- [ ] Logo (512x512px) uploaded
- [ ] Product Hunt assets ready
- [ ] Demo video/GIF recorded

### Legal
- [ ] Privacy Policy published (/privacy)
- [ ] Terms of Service published (/terms)
- [ ] Cookie consent banner (if needed for EU)

### Email Setup
- [ ] Email provider configured (Resend, SendGrid, etc.)
- [ ] Welcome email sequence set up
- [ ] Transactional emails working

### Monitoring
- [ ] Vercel alerts configured
- [ ] Stripe alerts configured
- [ ] Error tracking set up (Sentry optional)
- [ ] Uptime monitoring (optional)

## Quick Deploy Commands

```bash
# Local development
npm install
npm run dev

# Deploy to Vercel
./scripts/deploy.sh
# OR
vercel --prod

# Test Stripe webhook locally
stripe listen --forward-to localhost:5173/api/stripe/webhook

# Run type check
npx tsc --noEmit
```

## Troubleshooting

### Stripe webhook not receiving events
1. Check webhook URL is correct in Stripe Dashboard
2. Verify webhook secret in env vars matches
3. Check Vercel function logs for errors

### User tier not updating after payment
1. Check webhook events in Stripe Dashboard
2. Verify Supabase RLS policies
3. Check service role key is correct

### Generations not counting
1. Verify `increment_generations` function exists in Supabase
2. Check user_profiles table has correct user_id
3. Verify auth context is providing user correctly

### 3D preview not loading
1. Check browser console for WASM errors
2. Verify WebGL is supported/enabled
3. Try clearing browser cache

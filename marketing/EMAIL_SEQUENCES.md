# PolyGen AI - Email Marketing Sequences

## Overview

These email sequences are designed to convert free users to paid and reduce churn. Set these up in your email provider (Resend, SendGrid, Mailchimp, etc.) with the triggers specified.

---

## Sequence 1: Welcome & Onboarding (Free Signup)

**Trigger:** User creates free account

### Email 1: Welcome (Immediately)
**Subject:** Welcome to PolyGen AI! Let's create your first 3D model 🎉

```
Hi {{first_name}},

Welcome to PolyGen AI! I'm excited to have you on board.

You now have 5 free generations to try out AI-powered 3D modeling. Here's how to get started:

1. **Describe your idea** - Tell the AI what you want to create in plain English
2. **Watch it generate** - Our multi-agent AI creates optimized OpenSCAD code
3. **Download & print** - Export to STL and send it to your 3D printer

Here are some ideas to try:
- "A desk organizer with 3 pen slots"
- "A phone stand with adjustable angle"
- "A wall hook for keys"

👉 [Create Your First Model](https://polygen-ai.vercel.app/app)

Happy creating!

Noah
Founder, PolyGen AI

P.S. Reply to this email if you have any questions. I read every message.
```

### Email 2: Tips & Tricks (Day 2)
**Subject:** 3 tips for better 3D models (from 10,000+ generations)

```
Hi {{first_name}},

Here's what I've learned from analyzing thousands of generations:

**1. Be specific with dimensions**
❌ "A small box"
✅ "A 50mm x 30mm x 20mm box with rounded corners"

**2. Describe functionality, not just appearance**
❌ "A nice-looking phone stand"
✅ "A phone stand that holds my iPhone at a 60-degree angle for video calls"

**3. Iterate, don't start over**
After generating, say "make it taller" or "add a hole for cables" instead of describing from scratch.

**Bonus tip:** Upload a reference image! Our image-to-3D feature can recreate objects from photos.

You've used {{generations_used}}/5 generations this month.

👉 [Continue Creating](https://polygen-ai.vercel.app/app)

Noah
```

### Email 3: Use Case Inspiration (Day 5)
**Subject:** What makers are building with PolyGen AI

```
Hi {{first_name}},

Need some inspiration? Here's what our community is creating:

🏠 **Home Organization**
- Custom drawer dividers
- Cable management clips
- Wall-mounted plant holders

🛠️ **Workshop Tools**
- Tool organizers
- Jig fixtures
- Parts bins

🎮 **Gaming & Hobbies**
- Board game accessories
- Miniature bases
- Controller stands

🎁 **Gifts & Personal**
- Custom nameplates
- Photo holders
- Personalized hooks

What will you create?

You've used {{generations_used}}/5 generations this month.

👉 [Get Inspired](https://polygen-ai.vercel.app/app)

Noah
```

### Email 4: Upgrade Reminder (Day 7, if <3 generations used)
**Subject:** Your free generations are waiting

```
Hi {{first_name}},

I noticed you still have {{generations_remaining}} free generations available this month.

Quick reminder of what you can create:
- Upload a photo → Get a 3D version
- Describe in text → Get printable code
- Iterate with natural language → Refine until perfect

Your free tier resets on the 1st, so use them while you can!

👉 [Use Your Free Generations](https://polygen-ai.vercel.app/app)

Noah

P.S. If you've hit any roadblocks or have questions, just reply to this email.
```

---

## Sequence 2: Activation Push (Free → Pro)

**Trigger:** User has used 4+ of 5 free generations

### Email 1: Running Low (Immediately)
**Subject:** You've almost used your free generations!

```
Hi {{first_name}},

Wow, you've been busy! You've created {{generations_used}} models with PolyGen AI.

You have {{generations_remaining}} generation(s) left this month.

**Upgrade to Pro** and get:
- 100 generations/month (20x more!)
- STL export for direct printing
- 3D preview in browser
- Priority support

All for just $19/month (or $190/year - save $38).

👉 [Upgrade to Pro](https://polygen-ai.vercel.app/pricing)

Happy creating,
Noah
```

### Email 2: Limit Reached (When 0 remaining)
**Subject:** You've reached your free limit 🚀

```
Hi {{first_name}},

Great news: You've used all 5 of your free generations this month! That means you're getting real value from PolyGen AI.

Bad news: You'll have to wait until the 1st to get more... unless you upgrade.

**With Pro, you'd have:**
- 95 more generations available right now
- STL export for direct 3D printing
- In-browser 3D preview
- Priority email support

**Limited time:** Use code KEEPCREATING for 20% off your first month.

👉 [Upgrade Now](https://polygen-ai.vercel.app/pricing?code=KEEPCREATING)

Noah

P.S. This code expires in 48 hours.
```

---

## Sequence 3: New Pro Subscriber

**Trigger:** User subscribes to Pro plan

### Email 1: Welcome to Pro (Immediately)
**Subject:** You're now a Pro! Here's what's unlocked 🎉

```
Hi {{first_name}},

Welcome to PolyGen AI Pro! Your upgrade is confirmed.

Here's what you now have access to:

✅ **100 generations/month** - Create without limits
✅ **STL export** - Download print-ready files directly
✅ **3D preview** - View and rotate models in your browser
✅ **Priority support** - I'll personally help with any issues

**Pro tips to maximize your subscription:**

1. **Use the 3D preview** - Catch issues before printing
2. **Batch similar designs** - Create variations quickly
3. **Save your favorites** - Export OpenSCAD code for later editing

👉 [Start Creating](https://polygen-ai.vercel.app/app)

Thank you for your support!

Noah
Founder, PolyGen AI
```

### Email 2: Feature Deep-Dive (Day 3)
**Subject:** Did you know you can do this?

```
Hi {{first_name}},

As a Pro user, you have some powerful features. Here's one you might have missed:

**Image-to-3D Conversion**

Upload a photo of any object, and our AI will recreate it as a 3D model:

1. Click the image icon in the chat
2. Upload your photo
3. Describe what you want: "Recreate this as a printable model"
4. Export to STL and print!

Great for:
- Reverse engineering broken parts
- Creating custom versions of existing objects
- Turning drawings into 3D models

👉 [Try Image-to-3D](https://polygen-ai.vercel.app/app)

What will you recreate?

Noah
```

---

## Sequence 4: Churn Prevention

**Trigger:** Pro user hasn't logged in for 14 days

### Email 1: We Miss You (Day 14)
**Subject:** Your 3D models are waiting

```
Hi {{first_name}},

I noticed you haven't used PolyGen AI in a while. Everything okay?

Here are some new things you might want to try:

🆕 **What's new:**
- Improved code generation accuracy
- Faster rendering
- New design templates

💡 **Quick ideas:**
- Custom brackets for your specific needs
- Replacement parts for broken items
- Personalized gifts

You still have {{generations_remaining}} generations available this month.

👉 [Jump Back In](https://polygen-ai.vercel.app/app)

If something's not working or you have feedback, just reply to this email. I read everything.

Noah
```

### Email 2: Last Chance (3 days before renewal)
**Subject:** Your Pro subscription renews soon

```
Hi {{first_name}},

Your PolyGen AI Pro subscription renews on {{renewal_date}}.

**This month's stats:**
- Generations used: {{generations_used}}/100
- Exports: {{exports_count}}

If you're not getting value, you can cancel anytime from your dashboard. No hard feelings.

But if you want to keep creating, I'd love to hear what you're working on. Reply to this email and share!

👉 [Continue Creating](https://polygen-ai.vercel.app/app)

Noah
```

---

## Sequence 5: Win-Back (Churned Users)

**Trigger:** User cancels subscription

### Email 1: We're Sorry to See You Go (Immediately)
**Subject:** Your subscription has been cancelled

```
Hi {{first_name}},

This confirms your PolyGen AI Pro subscription has been cancelled. You'll have access until {{end_date}}.

Quick question: Why did you leave? (Just reply with a number)

1. Too expensive
2. Didn't use it enough
3. Missing features I need
4. Found a better alternative
5. Just taking a break

Your feedback helps me improve PolyGen AI for everyone.

If you change your mind, you're always welcome back. Your account and settings will be saved.

Thank you for trying Pro!

Noah
```

### Email 2: Special Offer (Day 7 after cancellation)
**Subject:** A special offer just for you

```
Hi {{first_name}},

I wanted to reach out personally. As a former Pro user, I'd love to have you back.

**Here's a special offer:**
50% off your first month back: $9.50 instead of $19

Just use code WELCOME_BACK at checkout.

👉 [Reactivate Pro](https://polygen-ai.vercel.app/pricing?code=WELCOME_BACK)

No pressure - the offer is valid for 7 days if you decide to return.

Thank you for giving PolyGen AI a try.

Noah
```

---

## Email Templates Setup

### Variables Required
- `{{first_name}}` - User's first name
- `{{email}}` - User's email
- `{{generations_used}}` - Generations used this month
- `{{generations_remaining}}` - Generations remaining
- `{{renewal_date}}` - Next billing date
- `{{end_date}}` - Subscription end date
- `{{exports_count}}` - Number of exports made

### Recommended Tools
- **Resend** - Developer-friendly, great deliverability
- **SendGrid** - Robust analytics
- **Postmark** - High deliverability focus
- **Mailchimp** - If you want visual editor

### Compliance Notes
- Include unsubscribe link in all emails
- Add physical mailing address in footer
- Comply with CAN-SPAM and GDPR
- Honor unsubscribe requests immediately

---

*Last Updated: January 2026*

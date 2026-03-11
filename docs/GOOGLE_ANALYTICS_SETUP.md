# Google Analytics & Search Console Setup Guide

## ✅ Current Status

Your website already has:
- ✅ Google Analytics component (`GoogleAnalytics.tsx`) integrated
- ✅ Analytics settings stored in database (`website_analytics_settings`)
- ✅ Google Analytics ID: `G-ZWBWT1PJQL`
- ✅ Google Tag Manager ID: `GTM-P7BR3CH2`
- ✅ Robots.txt file with sitemap reference
- ✅ Sitemap.xml file created
- ✅ Google Search Console verification component ready

## 🔍 Verify Google Analytics is Working

### Step 1: Check Database Settings
1. Go to Admin → Analytics
2. Verify:
   - Google Analytics ID is set to `G-ZWBWT1PJQL`
   - "Inject scripts on website" toggle is **ON** (green)
   - Settings are saved

### Step 2: Verify on Live Site
1. Visit your site (e.g. `https://urbanhub.uk`) in your browser.
2. Open Developer Tools (F12) → **Network** tab.
3. Refresh the page and filter by `googletagmanager` or `gtm`.
4. You should see:
   - **If GTM ID is set in Admin:** `https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX` (the ID you saved). You will **not** see `gtag/js?id=G-...` — the site loads only GTM when GTM is set; GA4 runs via a **GA4 Configuration tag inside GTM**.
   - **If only GA ID is set (GTM blank):** `https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`.
5. **Correct container:** The GTM container ID in Admin → Analytics must match the container you use in [tagmanager.google.com](https://tagmanager.google.com). If tracking doesn’t work, confirm the ID in Admin matches the container where you added your GA4 and event tags.

### Step 3: Check Real-Time Data
1. Go to [Google Analytics](https://analytics.google.com)
2. Select your property (`G-ZWBWT1PJQL`)
3. Navigate to **Reports** → **Realtime**
4. Visit your website in another tab
5. You should see your visit appear in real-time (may take 30-60 seconds)

### Step 4: Verify with Browser Extension
Install the [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) Chrome extension:
1. Install the extension
2. Enable it
3. Visit your website
4. Open Console (F12)
5. You should see GA debug messages

## 🔐 Google Search Console Verification

### Step 1: Add Property
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add Property**
3. Enter `https://urbanhub.uk` (with https)
4. Choose **HTML tag** verification method
5. Copy the verification code (looks like: `abc123xyz...`)

### Step 2: Add Verification Code to Website
1. Go to Admin → SEO → General SEO tab
2. Find **Google Search Console Verification** field
3. Paste the verification code (just the code, not the full meta tag)
4. Click **Save**

### Step 3: Verify in Google Search Console
1. Go back to Google Search Console
2. Click **Verify**
3. You should see "Ownership verified" ✅

**Note:** If you already verified the domain before, you may not need to reverify. However, if you changed domains or the verification meta tag was removed, you'll need to reverify.

## 📄 Sitemap Submission

### Step 1: Verify Sitemap is Accessible
1. Visit `https://urbanhub.uk/sitemap.xml`
2. You should see the XML sitemap with all your pages

### Step 2: Submit to Google Search Console
1. In Google Search Console, go to **Sitemaps**
2. Enter: `sitemap.xml`
3. Click **Submit**
4. Status should show "Success"

### Step 3: Submit to Bing Webmaster Tools (Optional)
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add your site
3. Submit sitemap: `https://urbanhub.uk/sitemap.xml`

## 🧪 Testing Checklist

- [ ] Google Analytics real-time data shows visits
- [ ] Google Tag Manager container loads (check Network tab)
- [ ] Google Search Console verification successful
- [ ] Sitemap.xml is accessible and valid
- [ ] Robots.txt includes sitemap reference
- [ ] All pages are indexed (check in Search Console → Coverage)

## 🐛 Troubleshooting

### Analytics Not Working?
1. **Check Admin configuration (source of truth):**
   - **Admin → Analytics** → "Google Analytics & GTM" card.
   - **"Inject scripts on website"** must be **ON** (green).
   - **Google Tag Manager ID:** Must be the **exact** container ID you use in [tagmanager.google.com](https://tagmanager.google.com) (e.g. `GTM-P7BR3CH2`). The site injects this container only — no other GTM container is loaded. If you use a different container for this site, update the ID here and save.
   - **Google Analytics 4 Measurement ID:** If you use GTM, add a **GA4 Configuration** tag inside that GTM container with this ID (e.g. `G-ZWBWT1PJQL`). The site does not load gtag when GTM is set; GA4 runs via GTM.
   - Click **Save** after any change.

2. **Check which script loads:**
   - When **GTM ID is set:** only `gtm.js?id=GTM-...` should appear in Network. No `gtag/js?id=G-...`.
   - When **only GA ID is set:** `gtag/js?id=G-...` appears. No GTM.

3. **Check browser console for errors:**
   - Open DevTools → Console
   - Look for any JavaScript errors

4. **`net::ERR_BLOCKED_BY_CLIENT` on analytics/collect requests:**
   - This means a **browser extension** (ad blocker, privacy blocker, or Chrome tracking protection) is blocking requests to Google. Your GTM/GA setup is working; the browser is blocking the outbound calls.
   - To see data in GA: test in **Incognito** (extensions often disabled), or disable the blocker for your site, or use a browser profile without ad blockers. On the **live site**, real users without blockers will send data normally.

5. **Check ad blockers:**
   - Disable ad blockers temporarily when testing analytics
   - Some browsers block GA by default

6. **Verify database:**
   - Run migration `010_analytics_credentials_tracked_elements.sql` if not already run
   - In Supabase, table `website_analytics_settings`: one row should have your `google_tag_manager_id` and/or `google_analytics_id`. The app uses the row with the latest `updated_at`.

### Search Console Verification Fails?
1. **Check meta tag is present:**
   - View page source on `https://urbanhub.uk`
   - Search for "google-site-verification"
   - Should see: `<meta name="google-site-verification" content="YOUR_CODE" />`

2. **Wait a few minutes:**
   - Google may take 5-10 minutes to detect the tag

3. **Try alternative verification:**
   - HTML file upload
   - DNS verification
   - Google Analytics verification (if GA is already verified)

## 📊 Conversion tracking (GTM & GA4)

The site pushes **dataLayer events** for GTM and GA4 so you can see **which pages convert** (form submits, WhatsApp/clicks from floating buttons, etc.).

- **Event catalog and parameters:** See **[GTM_GA_CONVERSION_TRACKING.md](./GTM_GA_CONVERSION_TRACKING.md)** for:
  - All event names (`page_view`, `lead_form_open`, `form_submit`, `cta_click`, `whatsapp_click`, etc.)
  - Parameters: `page_path`, `form_type`, `cta_source`, `element_id`
  - **Floating buttons:** page-specific IDs (e.g. `float-whatsapp-home`, `float-whatsapp-studios`) so you know which page drove the click
  - **Book a viewing / Get a callback from nav:** `lead_form_open` with `cta_source: "nav"` and `form_submit` with `page_path`
  - How to set up GTM triggers and GA4 event tags/conversions

1. **Set up Goals/Conversions in Google Analytics:**
   - Mark `form_submit` (and optionally `lead_form_open`, `whatsapp_click`) as conversions in GA4
   - Use `page_path` and `element_id` in reports to see which pages convert

2. **Monitor Search Console:**
   - Check for indexing issues
   - Monitor search performance
   - Fix any crawl errors

3. **Update Sitemap Regularly:**
   - Currently static, consider making it dynamic
   - Include blog posts automatically
   - Update lastmod dates

## 🔗 Useful Links

- [Google Analytics](https://analytics.google.com)
- [Google Search Console](https://search.google.com/search-console)
- [Google Tag Manager](https://tagmanager.google.com)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)

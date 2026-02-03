# Google Analytics & Search Console Setup Guide

## ✅ Current Status

Your website already has:
- ✅ Google Analytics component (`GoogleAnalytics.tsx`) integrated
- ✅ Analytics settings stored in database (`website_analytics_settings`)
- ✅ Google Analytics ID: `G-ZWBWT1PJQL`
- ✅ Google Tag Manager ID: `GTM-M2V5FHT5`
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
1. Visit `https://urbanhub.uk` in your browser
2. Open Developer Tools (F12)
3. Go to **Network** tab
4. Filter by "gtag" or "analytics"
5. Refresh the page
6. You should see requests to:
   - `https://www.googletagmanager.com/gtag/js?id=G-ZWBWT1PJQL`
   - `https://www.googletagmanager.com/gtm.js?id=GTM-M2V5FHT5`

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
1. **Check if scripts are enabled:**
   - Admin → Analytics → Ensure "Inject scripts" is ON

2. **Check browser console for errors:**
   - Open DevTools → Console
   - Look for any JavaScript errors

3. **Check ad blockers:**
   - Disable ad blockers temporarily
   - Some browsers block GA by default

4. **Verify database settings:**
   - Run migration `010_analytics_credentials_tracked_elements.sql` if not already run
   - Check `website_analytics_settings` table in Supabase

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

## 📊 Next Steps

1. **Set up Goals in Google Analytics:**
   - Form submissions
   - Button clicks (Book Viewing, Get Callback)
   - Page views

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

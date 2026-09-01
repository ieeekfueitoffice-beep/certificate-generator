# CertifyFlow — Certificate Generator

A website where you can:
1. Sign in with your Google account
2. Create an "event" (e.g. "Coding Bootcamp 2026")
3. Upload a certificate design (image, with no name printed on it yet)
4. Upload a list of names + emails (a simple spreadsheet/CSV file)
5. Click one button to create a personalized certificate for everyone
6. Click another button to email each certificate to its owner — sent from your own Gmail

You can reuse it for as many different events as you like — each one keeps its own design, name placement, and list of people.

**You do not need to know how to code to set this up.** You just need to follow the steps below in order. It will take about 20–30 minutes the first time.

---

## The three things you'll set up

This app has two parts that need to "live" somewhere on the internet, plus one login setup:

| Part | What it does | Where it lives | Cost |
|---|---|---|---|
| **Frontend** | The website you see and click around in | **Netlify** | Free |
| **Backend** | Stores your data, creates certificates, sends emails | **Render** | Free (see note below) |
| **Google login** | Lets people sign in with Google and send email from Gmail | Google Cloud Console | Free |

You don't need to touch a terminal/command line for any of this — everything is done by clicking buttons on websites.

> **A note about the free tier:** Render's free plan is genuinely free forever, but it "falls asleep" after 15 minutes of no use (the first click after a break takes ~30 seconds to wake up — totally normal, just wait) and doesn't guarantee your uploaded certificates survive a redeploy. For occasional/small events this is fine. If you're running this for real, paid events and want your data to always be safe, Render's cheapest paid plan (~$7/month) with a "persistent disk" (~$1/month extra) fixes this — the README below shows you exactly where to add it if you ever want to.

---

## Step 1: Get the code onto GitHub

Both Netlify and Render deploy your app *from a GitHub repository*, so first the code needs to be on GitHub.

1. Go to https://github.com and create a free account if you don't have one.
2. Click the **+** icon (top right) → **New repository**. Name it `certificate-generator`. Leave it Public or Private, your choice. Click **Create repository**.
3. On the new repository's page, click **uploading an existing file**.
4. Unzip the `certificate-generator.zip` folder you downloaded, then drag the **entire contents** of that folder (the `backend` folder, `frontend` folder, `render.yaml`, `netlify.toml`) into the GitHub upload box.
5. Scroll down and click **Commit changes**.

You now have your code on GitHub — this is what Netlify and Render will read from.

---

## Step 2: Set up Google login (so people can sign in with Google)

This lets your app say "Sign in with Google" and, once someone signs in, get permission to send certificate emails from their own Gmail.

1. Go to https://console.cloud.google.com/ and sign in.
2. Top left, click the project dropdown → **New Project**. Name it anything (e.g. "CertifyFlow") → **Create**.
3. In the search bar at the top, type **Gmail API** → click it → click **Enable**.
4. In the left sidebar: **APIs & Services** → **OAuth consent screen**.
   - User Type: choose **External** → **Create**.
   - Fill in: App name (e.g. "CertifyFlow"), your email for "User support email" and "Developer contact".
   - Click **Save and Continue** through the next screens.
   - On the **Scopes** screen, click **Add or Remove Scopes**, search for and check: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and `https://www.googleapis.com/auth/gmail.send`. Click **Update**, then **Save and Continue**.
   - On the **Test users** screen, click **Add Users** and add your own Gmail address (and anyone else who'll log in and send certificates). This is required because Google keeps unverified apps limited to a list of approved testers — up to 100 people, which is plenty. Click **Save and Continue**.
5. Left sidebar: **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: anything.
   - Under **Authorized redirect URIs**, click **Add URI**. **Leave this browser tab open** — you'll come back and paste in the real value after Step 4, once you know your Render URL. For now you can put a placeholder like `http://localhost:5000/auth/google/callback`.
   - Click **Create**.
6. A box pops up with a **Client ID** and **Client Secret**. Copy both somewhere safe (like a notes app) — you'll paste these into Render in Step 4.

---

## Step 3: Deploy the backend to Render

1. Go to https://render.com and sign up (you can sign up with your GitHub account, which makes this step faster).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if asked, then choose the `certificate-generator` repository you created in Step 1.
4. Render should detect the `render.yaml` file automatically and offer to use it — click **Apply** (this pre-fills the build settings for you: it knows to look in the `backend` folder, run `npm install`, and start the server with `npm start`). If it doesn't auto-detect, fill in manually:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Before clicking Create, scroll to **Environment Variables** and add these (using the Client ID/Secret you copied in Step 2):

   | Key | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID` | *(paste from Step 2)* |
   | `GOOGLE_CLIENT_SECRET` | *(paste from Step 2)* |
   | `GOOGLE_CALLBACK_URL` | leave blank for now — see below |
   | `CLIENT_URL` | leave blank for now — see below |

6. Click **Create Web Service**. Render will build and deploy it — this takes 2–5 minutes. When done, you'll see a URL at the top of the page like `https://certifyflow-backend.onrender.com` — **copy this URL**, you'll need it twice.
7. Go back to your Render service → **Environment** tab → edit `GOOGLE_CALLBACK_URL` to:
   `https://certifyflow-backend.onrender.com/auth/google/callback`
   (using your actual URL from step 6). Save — Render will redeploy automatically.
8. Go back to the Google Cloud Console tab from Step 2 → **Credentials** → click your OAuth client → replace the placeholder **Authorized redirect URI** with the exact same URL: `https://certifyflow-backend.onrender.com/auth/google/callback` → **Save**.

Leave the `CLIENT_URL` variable for now — you'll fill it in at the end of Step 4, once your Netlify site exists.

---

## Step 4: Deploy the frontend to Netlify

1. Go to https://app.netlify.com and sign up (again, GitHub sign-up is fastest).
2. Click **Add new site** → **Import an existing project** → choose **GitHub** → select your `certificate-generator` repository.
3. Netlify should read the `netlify.toml` file and pre-fill:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

   If it doesn't auto-fill, enter those three values yourself.
4. Before deploying, click **Add environment variable** and add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Render URL from Step 3.6, e.g. `https://certifyflow-backend.onrender.com` (no slash at the end) |

5. Click **Deploy site**. After a minute or two, Netlify gives you a URL like `https://cheerful-certify-123abc.netlify.app`. You can rename this later under **Site settings → Change site name** to something nicer.

6. **Last connection step:** go back to Render → your backend service → **Environment** tab → set `CLIENT_URL` to your Netlify URL exactly, e.g. `https://cheerful-certify-123abc.netlify.app` (no trailing slash) → Save (Render redeploys automatically).

That's it — open your Netlify URL, click **Sign in with Google**, and you're using the app.

---

## Using the app

1. **Sign in** with a Google account that you added as a "test user" in Step 2.
2. Click **+ New Event**, give it a name (e.g. "Bootcamp 2026").
3. **Upload your certificate template** — this should be an image (PNG or JPG) of your certificate design *without* anyone's name printed on it, just blank space where the name goes.
4. **Click on the image** where you want the name to appear — a live preview shows exactly where it'll go. Adjust font size, color, and alignment with the controls underneath.
5. Write your **email subject and message** — type `{{name}}` anywhere you want the person's name inserted automatically.
6. **Upload a CSV** of participants. This is just a spreadsheet saved in CSV format with two columns:

   ```
   name,email
   Ayesha Khan,ayesha@example.com
   Bilal Ahmed,bilal@example.com
   ```

   (In Excel or Google Sheets: File → Download/Export → **.csv**)
7. Click **Generate certificates** — this creates a personalized image for every person.
8. Click **Email certificates** — each person gets emailed their certificate as an attachment, sent from your Gmail address.
9. You can also click **Download all (.zip)** to get every certificate as files on your computer instead of (or as well as) emailing them.

You can create as many events as you want from the dashboard — each keeps its own template, design, and participant list separately.

---

## Common problems

**"This app isn't verified" warning when signing in with Google.**
This is normal — Google shows this for apps still in "Testing" mode (which is fine and free, no need to submit for verification unless you want the public at large to use it). Click **Advanced** → **Go to CertifyFlow (unsafe)** to continue. Only test users you added in Step 2 can sign in this way.

**Nothing happens / errors when I click Sign in with Google.**
Double check that `GOOGLE_CALLBACK_URL` in Render and the "Authorized redirect URI" in Google Cloud Console are *exactly* the same, including `https://` and no trailing slash.

**I can log in, but generating/sending certificates fails.**
Make sure `CLIENT_URL` (in Render) and `VITE_API_URL` (in Netlify) are both set correctly and don't have a trailing slash. After changing either, wait for the automatic redeploy to finish before testing again.

**The site feels slow the first time I open it.**
That's Render's free plan "waking up" after being idle — it takes 20–30 seconds the first time, then is normal speed after that.

**My uploaded certificates disappeared after a while.**
On Render's free plan, uploaded files aren't guaranteed to survive every redeploy. If this matters to you, upgrade the Render service to a paid **Starter** plan (~$7/month) and add a **Disk** (Render dashboard → your service → **Disks** → Add Disk, mount path `/var/data`, ~1GB is plenty, ~$0.25–1/month) — then add one more environment variable in Render: `DATA_DIR` = `/var/data`. That's the only extra step; the app already knows how to use it.

**Gmail sending limit.**
Regular Gmail accounts can send up to 500 emails per day. If you have a bigger event, send in batches across a day or two.

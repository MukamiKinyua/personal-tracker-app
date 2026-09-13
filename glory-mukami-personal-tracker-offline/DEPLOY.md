# Putting it on your phone, laptop and tablet

Everything in the code is done. What remains are four accounts and keys that
only you can create, because they are tied to your identity: a database in the
cloud, a server on the public internet, two Google sign-in credentials, and a
signing key for the APK. This walks through them in the order they depend on
each other. Budget about an hour.

Nothing here costs money at the sizes a personal journal reaches.

---

## 0. What you are building

```
  phone (APK)  ──┐
  laptop (web) ──┼──►  your server  ──►  MongoDB Atlas
  tablet (web) ──┘     (Node, HTTPS)     (the durable copy)
```

Every device keeps its own full copy of the journal and works offline. The
server is where the copies meet; Atlas is what survives losing every device.
Google Sign-In is how a fresh install knows which journal is yours.

---

## 1. The database — MongoDB Atlas

1. Create a free account at https://www.mongodb.com/atlas and a project.
2. Build a database → **M0 Free** → choose the region nearest you (for Kenya,
   `eu-west` or `me-south` are closest).
3. **Security → Database Access**: add a database user with a strong, generated
   password. Note it; it goes into the connection string.
4. **Security → Network Access**: add `0.0.0.0/0` for now. Your hosting
   provider's outbound addresses are not fixed; the password is what protects
   the database. Tighten this later if the host gives you fixed IPs.
5. **Connect → Drivers** and copy the string. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
   Add the database name before the `?`:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/personal-tracker?retryWrites=true&w=majority
   ```
   That is your `MONGODB_URI`.

**Two things about the free tier, stated plainly:**

- It has **no automatic backups**. `scripts/backup-mongo.sh` dumps it; run it
  from your laptop on a schedule you will actually keep (weekly is fine).
- It **pauses after about 60 days with no activity**. Syncing once resumes
  it. If you stop using the app for two months, the first sync after that
  will take a minute.

---

## 2. Google Sign-In — two client IDs, one project

Go to https://console.cloud.google.com/apis/credentials. Create a project if
you do not have one (name it anything; "Personal Tracker" is fine).

If asked to configure the **OAuth consent screen** first: External, app name
"Personal Tracker", your email for both contacts, no scopes beyond the
defaults, and add your own Google account as a test user. You never need to
publish it — a test-mode app allows up to 100 test users, and there is one.

### 2a. Web client (required for both web and Android)

**Create Credentials → OAuth client ID → Web application.**

- Authorised JavaScript origins: your server's HTTPS address once you have it
  (step 3), e.g. `https://tracker.yourname.app`. Also `http://localhost:3000`
  for local testing.
- Authorised redirect URIs: none needed.

Copy the client ID. This is `GOOGLE_CLIENT_ID` **and** `VITE_GOOGLE_CLIENT_ID`
— the same value in both. The Android build also uses this one: Google's
Credential Manager requires the *web* ID as the token audience, which is
exactly why the server can verify a phone's token the same way it verifies a
browser's.

### 2b. Android client (required for the APK)

**Create Credentials → OAuth client ID → Android.**

- Package name: `com.glorymukami.tracker`
- SHA-1 certificate fingerprint: from the key that signs the APK you install.

For a **debug** build (what `npm run android:debug` makes), the key is the
default debug keystore. Get its SHA-1 with:

```
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

For a **release** build, use the SHA-1 of the key you create in step 5. You
can register both — create one Android client per signing key.

Copy this client ID into `GOOGLE_CLIENT_ID_ANDROID`. It is a safety net rather
than the main path (see `.env.example`), but the package-name + SHA-1
registration it performs is what lets the phone sign in at all. The most
common failure — `[28444] Developer console is not set up correctly` in
Android's logs — means the SHA-1 or package name here does not match the APK.

---

## 3. The server — anywhere that runs a container

The repo has a `Dockerfile`. Any host that builds from one works; these two
have free tiers that fit:

- **Render** (https://render.com): New → Web Service → connect the repo →
  Runtime: Docker. Free instances sleep after 15 minutes idle and take ~30s
  to wake; the app's sync retries, so this is an inconvenience, not a fault.
- **Fly.io** (https://fly.io): `fly launch` reads the Dockerfile; small
  machines are free-tier.

Set these **environment variables** on the host:

| Variable                   | Value                                              |
| -------------------------- | -------------------------------------------------- |
| `MONGODB_URI`              | from step 1                                        |
| `JWT_SECRET`               | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` — run once, paste, never reuse |
| `GOOGLE_CLIENT_ID`         | web client ID from 2a                              |
| `GOOGLE_CLIENT_ID_ANDROID` | Android client ID from 2b                          |
| `NODE_ENV`                 | `production`                                       |
| `PORT`                     | whatever the host expects (Render: `10000`)        |

And these **build arguments** (Docker `--build-arg`; on Render they are set
as environment variables too and picked up at build):

| Build arg               | Value                        |
| ----------------------- | ---------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | web client ID from 2a        |
| `VITE_API_URL`          | leave **empty** for the web  |

The web app and API share an origin, so `VITE_API_URL` stays blank and
`CORS_ORIGINS` is not needed.

Once deployed, go back to step 2a and add the server's HTTPS address to the
web client's Authorised JavaScript origins. Then open it in a browser, sign in
with Google, and add a glass of water. Open the same address on another
device, sign in, and the glass is there.

The web app is installable: Chrome on Android offers "Add to home screen",
and it opens offline from then on. If you only ever want the web version on
your phone, you can stop here.

---

## 4. The APK

The Android build talks to the server from step 3, so it needs to be told
where that is at build time.

Create `.env` (copy `.env.example`) with:

```
VITE_API_URL=https://tracker.yourname.app
VITE_GOOGLE_CLIENT_ID=<web client ID from 2a>
```

Then:

```
npm run android:debug
```

This builds the web app with those values, copies it into the Android
project, and runs Gradle. The APK lands at
`android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to your phone
(USB, Drive, anything) and open it; allow installing from that source when
asked.

Needs: Java 17 or newer (21 is installed here) and the Android SDK (also
here). `android/local.properties` points at the SDK and is not committed —
on another machine, run `npm run android:open` once and let Android Studio
create it.

The home-screen widget appears in the launcher's widget picker as
"Personal Tracker". Reminders are under the app's Settings → Reminders; the
first time you switch them on, Android asks for notification permission.

---

## 5. A release key (before giving the APK to anyone, or reinstalling often)

A debug APK is signed with a key anyone has. That is fine for your own phone,
but Android will not update an app across differently-signed builds, so
settle on a real key once:

```
keytool -genkeypair -v -keystore tracker-release.jks -alias tracker -keyalg RSA -keysize 2048 -validity 10000
```

Keep `tracker-release.jks` and its password somewhere you will not lose them
— **a lost release key means a fresh install for every future version**. Do
not commit it.

Create `android/keystore.properties` (also not committed):

```
storeFile=../tracker-release.jks
storePassword=...
keyAlias=tracker
keyPassword=...
```

and in `android/app/build.gradle`, inside `android { }`:

```gradle
def keystoreProps = new Properties()
def keystoreFile = rootProject.file("keystore.properties")
if (keystoreFile.exists()) keystoreProps.load(new FileInputStream(keystoreFile))

signingConfigs {
    release {
        if (keystoreFile.exists()) {
            storeFile file(keystoreProps['storeFile'])
            storePassword keystoreProps['storePassword']
            keyAlias keystoreProps['keyAlias']
            keyPassword keystoreProps['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // ...existing lines
    }
}
```

Then `npm run android:release`, register the new key's SHA-1 as a second
Android client (step 2b), and install
`android/app/build/outputs/apk/release/app-release.apk`.

---

## What each layer promises, and the limit of each

- **Offline**: every device holds the whole journal. Writes made offline
  queue and sync when a connection returns. The web app opens offline once
  installed; the APK always does.
- **Reinstall**: sign in with the same Google account and the journal comes
  back from the server. It comes back *as of the last sync*, so a device that
  never had a connection since its last entry has entries only it holds.
- **Reminders**: on the phone, delivered by Android at the set time with the
  app closed. In a browser, only while the app is open — that is the most a
  web page is allowed to do.
- **Widget**: shows what the app last wrote. It updates when you use the app
  and every 30 minutes otherwise; it is a mirror, not a second source.
- **Floating over other apps**: not built. Android's overlay permission is
  the one it warns users about most, and a home-screen widget covers the
  same glance-at-it need without it.
- **The APK is large (~185 MB)** because the exercise demonstration videos
  are packaged inside it so they play offline. Removing
  `client/public/media/runtime` from the build would make it ~15 MB at the
  cost of the videos needing a connection.

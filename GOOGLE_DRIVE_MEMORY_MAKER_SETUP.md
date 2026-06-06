# Google Drive Memory Maker Setup

Memory Maker stores photo files in Google Drive and stores album metadata in Supabase.

## 1. Create Google OAuth credentials

1. Open Google Cloud Console and create or select a project.
2. Enable the Google Drive API.
3. Configure the OAuth consent screen.
4. Create an OAuth client ID for a Web application.
5. Generate a refresh token that grants the `https://www.googleapis.com/auth/drive.file` scope.

The refresh token must belong to the Google account with the 2 TB Google One plan.
The app will automatically create an `XK Events Memory Maker` folder and its segment subfolders.

## 2. Add Vercel environment variables

Add these as sensitive Production variables:

```text
GOOGLE_DRIVE_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET
GOOGLE_DRIVE_REFRESH_TOKEN
```

`GOOGLE_DRIVE_ROOT_FOLDER_ID` is optional if you later want to use a specific app-accessible folder.

Keep the existing Supabase variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## 3. Create the Supabase table

Run `supabase/memory-maker.sql` in the Supabase SQL Editor.

## 4. Redeploy and test

Redeploy the website, open an Okinawa/Taiwan trip segment, and upload a small test photo.

Files remain private in Google Drive. The website streams them through its password-protected API.

## Upload size note

Website uploads are currently limited to 4 MB per photo because of Vercel request-size limits. Larger photos should be compressed first.

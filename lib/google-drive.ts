const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

function getDriveConfig() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken, rootFolderId };
}

export function isGoogleDriveConfigured() {
  return Boolean(getDriveConfig());
}

export async function getGoogleDriveAccessToken() {
  const config = getDriveConfig();
  if (!config) throw new Error("Google Drive is not configured.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Unable to authenticate with Google Drive.");
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Google Drive did not return an access token.");
  return data.access_token;
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function ensureAlbumFolder(accessToken: string, albumKey: string, albumName: string) {
  const config = getDriveConfig();
  if (!config) throw new Error("Google Drive is not configured.");
  const rootFolderId = config.rootFolderId || await ensureRootFolder(accessToken);

  const folderName = `${albumName} - ${albumKey}`;
  const query = [
    `name='${escapeDriveQuery(folderName)}'`,
    "mimeType='application/vnd.google-apps.folder'",
    `'${escapeDriveQuery(rootFolderId)}' in parents`,
    "trashed=false",
  ].join(" and ");

  const searchResponse = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!searchResponse.ok) throw new Error("Unable to find the Google Drive album folder.");
  const searchData = await searchResponse.json() as { files?: Array<{ id: string }> };
  if (searchData.files?.[0]?.id) return searchData.files[0].id;

  const createResponse = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    }),
  });
  if (!createResponse.ok) throw new Error("Unable to create the Google Drive album folder.");
  const created = await createResponse.json() as { id?: string };
  if (!created.id) throw new Error("Google Drive did not return a folder ID.");
  return created.id;
}

async function ensureRootFolder(accessToken: string) {
  const folderName = "XK Events Memory Maker";
  const query = [
    `name='${escapeDriveQuery(folderName)}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
  ].join(" and ");

  const searchResponse = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!searchResponse.ok) throw new Error("Unable to find the Google Drive Memory Maker folder.");
  const searchData = await searchResponse.json() as { files?: Array<{ id: string }> };
  if (searchData.files?.[0]?.id) return searchData.files[0].id;

  const createResponse = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!createResponse.ok) throw new Error("Unable to create the Google Drive Memory Maker folder.");
  const created = await createResponse.json() as { id?: string };
  if (!created.id) throw new Error("Google Drive did not return a root folder ID.");
  return created.id;
}

export async function uploadMemoryMakerFile(file: File, albumKey: string, albumName: string) {
  const accessToken = await getGoogleDriveAccessToken();
  const folderId = await ensureAlbumFolder(accessToken, albumKey, albumName);
  const boundary = `xk_events_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: file.name, parents: [folderId] });
  const fileBytes = Buffer.from(await file.arrayBuffer());
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`),
    fileBytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) throw new Error("Unable to upload the file to Google Drive.");
  return response.json() as Promise<{ id: string; name: string; mimeType: string; size?: string }>;
}

export async function downloadGoogleDriveFile(driveFileId: string, range?: string | null) {
  const accessToken = await getGoogleDriveAccessToken();
  return fetch(`${DRIVE_API}/files/${encodeURIComponent(driveFileId)}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
  });
}

export async function deleteGoogleDriveFile(driveFileId: string) {
  const accessToken = await getGoogleDriveAccessToken();
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(driveFileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to delete the photo from Google Drive.");
  }
}

export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** What each upload field accepts and where it is stored. */
export const UPLOAD_KINDS = {
  license: { accept: DOCUMENT_TYPES, folder: "documents" },
  identity: { accept: DOCUMENT_TYPES, folder: "documents" },
  photo: { accept: PHOTO_TYPES, folder: "photos" },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;

/** Signed by the server; proves which object the browser uploaded and for whom. */
export interface UploadTicket {
  key: string;
  kind: UploadKind;
  profileId: string;
  filename: string;
}

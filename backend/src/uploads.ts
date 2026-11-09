import { BadRequestException } from "@nestjs/common";

export function validateUpload(value: string, photo = false) {
  const match =
    /^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    );
  if (!match || (photo && match[1] === "application/pdf"))
    throw new BadRequestException("Upload a supported PDF or image");
  const bytes = Buffer.from(match[2], "base64");
  if (
    bytes.length > (photo ? 2 : 4) * 1024 * 1024 ||
    bytes.toString("base64") !== match[2]
  )
    throw new BadRequestException("Invalid or oversized upload");
  const valid =
    match[1] === "application/pdf"
      ? bytes.subarray(0, 5).toString() === "%PDF-"
      : match[1] === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : match[1] === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : bytes.subarray(0, 4).toString() === "RIFF" &&
            bytes.subarray(8, 12).toString() === "WEBP";
  if (!valid)
    throw new BadRequestException(
      "Upload content does not match its file type",
    );
}

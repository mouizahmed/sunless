import path from "node:path";
import { app } from "electron";

// Secure path utilities to prevent path traversal attacks

/**
 * Sanitizes a filename to prevent path traversal attacks
 * Removes potentially dangerous characters and path separators
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    throw new Error('Filename must be a string');
  }

  // Remove path separators and dangerous characters
  const sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove Windows forbidden characters
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/^\.+/, '') // Remove leading dots
    .trim();

  if (sanitized.length === 0) {
    throw new Error('Invalid filename after sanitization');
  }

  if (sanitized.length > 255) {
    throw new Error('Filename too long');
  }

  return sanitized;
}

/**
 * Creates a secure path within the app's data directory
 * Prevents path traversal by ensuring the path stays within the allowed directory
 */
export function createSecurePath(subpath: string, allowedDirectory?: string): string {
  const baseDir = allowedDirectory || app.getPath('userData');
  const sanitizedSubpath = sanitizeFilename(subpath);

  const fullPath = path.join(baseDir, sanitizedSubpath);

  // Ensure the resolved path is still within the base directory
  const resolvedPath = path.resolve(fullPath);
  const resolvedBaseDir = path.resolve(baseDir);

  if (!resolvedPath.startsWith(resolvedBaseDir + path.sep) && resolvedPath !== resolvedBaseDir) {
    throw new Error('Path traversal attempt detected');
  }

  return resolvedPath;
}

/**
 * Validates that a file path is safe for screenshot operations
 * Ensures the path is within allowed directories and has valid extension
 */
export function validateScreenshotPath(filePath: string): boolean {
  try {
    const allowedExtensions = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(filePath).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return false;
    }

    // Ensure the path is within userData directory
    const userDataDir = app.getPath('userData');
    const resolvedPath = path.resolve(filePath);
    const resolvedUserDataDir = path.resolve(userDataDir);

    return resolvedPath.startsWith(resolvedUserDataDir + path.sep);
  } catch {
    return false;
  }
}

/**
 * Creates a secure temporary file path for screenshots
 */
export function createSecureScreenshotPath(prefix = 'screenshot'): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const filename = `${sanitizeFilename(prefix)}_${timestamp}_${randomSuffix}.png`;

  return createSecurePath(filename, path.join(app.getPath('userData'), 'screenshots'));
}
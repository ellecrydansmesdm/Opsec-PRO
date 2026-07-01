import { execSync } from 'child_process';
import crypto from 'crypto';
import os from 'os';

export function getHWID(): string {
  let raw = "";

  try {
    if (process.platform === "win32") {
      // CPU ID + Baseboard Serial
      const cpu = execSync("wmic cpu get ProcessorId").toString().trim();
      const mb  = execSync("wmic baseboard get SerialNumber").toString().trim();
      raw = cpu + mb;
    } else if (process.platform === "linux") {
      raw = execSync("cat /etc/machine-id").toString().trim();
    } else if (process.platform === "darwin") {
      raw = execSync("ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID").toString().trim();
    }
  } catch (e) {
    // Fallback: system hostname + CPU architecture details
    raw = os.hostname() + os.arch() + (os.cpus()[0]?.model || "");
  }

  return crypto.createHash("sha256").update(raw).digest("hex");
}

import { execSync } from 'child_process';
import crypto from 'crypto';
import os from 'os';

export function getHWID(): string {
  let raw = "";

  try {
    if (process.platform === "win32") {
      // 1. Primary: Windows Registry MachineGuid (Universal, fast, works on Win 10 & Win 11 24H2+)
      try {
        const regOutput = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const match = regOutput.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i);
        if (match && match[1]) {
          raw = match[1].trim();
        }
      } catch (_) {}

      // 2. Secondary fallback: CIM Product UUID via PowerShell
      if (!raw) {
        try {
          raw = execSync('powershell -NoProfile -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
        } catch (_) {}
      }

      // 3. Tertiary fallback: wmic (older Windows versions)
      if (!raw) {
        try {
          const cpu = execSync("wmic cpu get ProcessorId", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
          const mb  = execSync("wmic baseboard get SerialNumber", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
          raw = cpu + mb;
        } catch (_) {}
      }
    } else if (process.platform === "linux") {
      raw = execSync("cat /etc/machine-id", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } else if (process.platform === "darwin") {
      raw = execSync("ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    }
  } catch (e) {
    // Silent catch
  }

  if (!raw) {
    // Ultimate fallback: system architecture + CPU details + network interfaces
    const interfaces = os.networkInterfaces();
    const macs = Object.values(interfaces).flat().map(i => i?.mac).filter(Boolean).sort().join('-');
    raw = os.arch() + (os.cpus()[0]?.model || "") + (macs || os.hostname());
  }

  return crypto.createHash("sha256").update(raw).digest("hex");
}

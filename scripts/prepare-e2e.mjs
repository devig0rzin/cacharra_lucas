import { rmSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const dataDir = resolve(process.cwd(), ".data");
const e2eDir = resolve(dataDir, "e2e");

if (dirname(e2eDir) !== dataDir || basename(e2eDir) !== "e2e") {
  throw new Error("Diretório temporário de E2E inválido");
}

rmSync(e2eDir, { recursive: true, force: true });

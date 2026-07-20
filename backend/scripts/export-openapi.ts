import fs from "fs";
import path from "path";
import { swaggerSpec } from "../src/config/swagger";

const outputDirPath = path.resolve(__dirname, "../../docs");
const outputFilePath = path.join(outputDirPath, "openapi.json");

if (!fs.existsSync(outputDirPath)) {
  fs.mkdirSync(outputDirPath, { recursive: true });
}

fs.writeFileSync(outputFilePath, JSON.stringify(swaggerSpec, null, 2), "utf-8");
console.log(`✅ Exported openapi.json successfully to ${outputFilePath}`);

import fs from 'fs';
import path from 'path';
import { swaggerSpec } from '../src/config/swagger';

function exportOpenApiSpec() {
  const jsonContent = JSON.stringify(swaggerSpec, null, 2);

  const backendDocsDir = path.join(__dirname, '../docs');
  const rootDocsDir = path.join(__dirname, '../../docs');

  if (!fs.existsSync(backendDocsDir)) {
    fs.mkdirSync(backendDocsDir, { recursive: true });
  }

  if (!fs.existsSync(rootDocsDir)) {
    fs.mkdirSync(rootDocsDir, { recursive: true });
  }

  const backendFilePath = path.join(backendDocsDir, 'openapi.json');
  const rootFilePath = path.join(rootDocsDir, 'openapi.json');

  fs.writeFileSync(backendFilePath, jsonContent, 'utf8');
  fs.writeFileSync(rootFilePath, jsonContent, 'utf8');

  console.log(`✅ Exported OpenAPI spec to ${backendFilePath}`);
  console.log(`✅ Exported OpenAPI spec to ${rootFilePath}`);
}

exportOpenApiSpec();

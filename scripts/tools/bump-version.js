#!/usr/bin/env node

/**
 * Script para atualizar a versão do app automaticamente
 * 
 * Uso:
 *   node scripts/bump-version.js patch   # 1.0.0 -> 1.0.1
 *   node scripts/bump-version.js minor   # 1.0.0 -> 1.1.0
 *   node scripts/bump-version.js major   # 1.0.0 -> 2.0.0
 *   node scripts/bump-version.js 1.2.3   # Define versão específica
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const CAPACITOR_CONFIG = path.join(__dirname, '..', 'capacitor.config.ts');
const ANDROID_BUILD_GRADLE = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
const IOS_PROJECT = path.join(__dirname, '..', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

function readPackageJson() {
  const content = fs.readFileSync(PACKAGE_JSON, 'utf8');
  return JSON.parse(content);
}

function writePackageJson(data) {
  fs.writeFileSync(PACKAGE_JSON, JSON.stringify(data, null, 2) + '\n');
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(currentVersion, type) {
  const parsed = parseVersion(currentVersion);
  
  switch (type) {
    case 'major':
      return formatVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
    case 'minor':
      return formatVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
    case 'patch':
      return formatVersion({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 });
    default:
      // Se for uma versão específica (ex: 1.2.3)
      if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type;
      }
      throw new Error(`Tipo de versão inválido: ${type}. Use: major, minor, patch ou X.Y.Z`);
  }
}

function getVersionCode(version) {
  const { major, minor, patch } = parseVersion(version);
  // Gera um código único: major * 10000 + minor * 100 + patch
  return major * 10000 + minor * 100 + patch;
}

function updateAndroidVersion(version) {
  const gradlePath = ANDROID_BUILD_GRADLE;
  
  if (!fs.existsSync(gradlePath)) {
    console.log('⚠️  Android: build.gradle não encontrado (execute npx cap add android primeiro)');
    return false;
  }

  let content = fs.readFileSync(gradlePath, 'utf8');
  const versionCode = getVersionCode(version);

  // Atualiza versionCode
  content = content.replace(
    /versionCode\s+\d+/,
    `versionCode ${versionCode}`
  );

  // Atualiza versionName
  content = content.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${version}"`
  );

  fs.writeFileSync(gradlePath, content);
  console.log(`✅ Android: versionCode=${versionCode}, versionName=${version}`);
  return true;
}

function updateiOSVersion(version) {
  const projectPath = IOS_PROJECT;
  
  if (!fs.existsSync(projectPath)) {
    console.log('⚠️  iOS: project.pbxproj não encontrado (execute npx cap add ios primeiro)');
    return false;
  }

  let content = fs.readFileSync(projectPath, 'utf8');
  const buildNumber = getVersionCode(version).toString();

  // Atualiza MARKETING_VERSION (versão exibida)
  content = content.replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${version};`
  );

  // Atualiza CURRENT_PROJECT_VERSION (build number)
  content = content.replace(
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${buildNumber};`
  );

  fs.writeFileSync(projectPath, content);
  console.log(`✅ iOS: MARKETING_VERSION=${version}, BUILD_NUMBER=${buildNumber}`);
  return true;
}

function updateCapacitorConfig(version) {
  if (!fs.existsSync(CAPACITOR_CONFIG)) {
    console.log('⚠️  Capacitor: capacitor.config.ts não encontrado');
    return false;
  }

  // Nota: O Capacitor não tem campo de versão no config, 
  // mas podemos adicionar um comentário ou variável se necessário
  console.log('✅ Capacitor: configuração mantida');
  return true;
}

function createGitTag(version) {
  const { execSync } = require('child_process');
  
  try {
    execSync(`git add -A`, { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
    execSync(`git tag v${version}`, { stdio: 'inherit' });
    console.log(`\n🏷️  Tag criada: v${version}`);
    console.log(`\n📤 Para publicar, execute:`);
    console.log(`   git push && git push origin v${version}`);
    return true;
  } catch (error) {
    console.log('\n⚠️  Não foi possível criar commit/tag automaticamente');
    console.log(`   Crie manualmente: git tag v${version}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0] || 'patch';
  const shouldTag = args.includes('--tag') || args.includes('-t');

  console.log('\n🚀 VAGOU - Atualizador de Versão\n');

  // Lê versão atual
  const pkg = readPackageJson();
  const currentVersion = pkg.version || '1.0.0';
  console.log(`📌 Versão atual: ${currentVersion}`);

  // Calcula nova versão
  const newVersion = bumpVersion(currentVersion, type);
  console.log(`📌 Nova versão: ${newVersion}\n`);

  // Atualiza package.json
  pkg.version = newVersion;
  writePackageJson(pkg);
  console.log(`✅ package.json atualizado`);

  // Atualiza plataformas nativas
  updateAndroidVersion(newVersion);
  updateiOSVersion(newVersion);
  updateCapacitorConfig(newVersion);

  console.log(`\n✨ Versão atualizada para ${newVersion}!\n`);

  // Cria tag se solicitado
  if (shouldTag) {
    createGitTag(newVersion);
  } else {
    console.log(`💡 Dica: Use --tag para criar commit e tag automaticamente`);
    console.log(`   node scripts/bump-version.js ${type} --tag\n`);
  }
}

main().catch(console.error);

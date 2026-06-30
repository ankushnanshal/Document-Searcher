const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

async function checkDependency(name, versionCommand, successMessage, failureMessage) {
  try {
    const { stdout, stderr } = await execAsync(versionCommand, {
      shell: isWindows ? 'powershell.exe' : '/bin/sh',
      windowsHide: true
    });
    console.log(`✅ ${name}: ${successMessage || 'installed'}`);
    const output = stdout || stderr;
    if (output) {
      const lines = output.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        console.log(`   Version: ${lines[0].trim()}`);
      }
    }
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${failureMessage || 'not found'}`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);
    return false;
  }
}

async function checkTessdata() {
  const tessdataDir = path.join(__dirname, 'tessdata');
  const projectDir = __dirname;

  const possibleLocations = [
    path.join(tessdataDir, 'hin.traineddata'),
    path.join(tessdataDir, 'eng.traineddata'),
    path.join(projectDir, 'hin.traineddata'),
    path.join(projectDir, 'eng.traineddata')
  ];

  let found = false;
  console.log('\n📁 Checking Tesseract language data:');

  for (const location of possibleLocations) {
    if (fs.existsSync(location)) {
      const stats = fs.statSync(location);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ✅ Found: ${path.basename(location)} (${sizeMB} MB)`);
      found = true;
    }
  }

  if (!found) {
    console.log('   ❌ No traineddata files found. Download from:');
    console.log('      https://github.com/tesseract-ocr/tessdata');
    console.log('      Place hin.traineddata and/or eng.traineddata in:');
    console.log(`      - ${tessdataDir}/`);
    console.log(`      - ${projectDir}/`);
  }

  return found;
}

async function checkPoppler() {
  try {
    const cmd = isWindows ? 'pdftoppm -v 2>&1' : 'pdftoppm -v 2>&1';
    const { stdout, stderr } = await execAsync(cmd, {
      shell: isWindows ? 'powershell.exe' : '/bin/sh',
      windowsHide: true
    });
    const output = stdout || stderr;
    const versionMatch = output.match(/pdftoppm version ([\d.]+)/i) ||
      output.match(/version ([\d.]+)/i);
    if (versionMatch) {
      console.log(`   Version: ${versionMatch[1]}`);
    }
    return true;
  } catch {
    return false;
  }
}

async function checkPythonPackage(packageName, importName) {
  const importNameToUse = importName || packageName;
  try {
    const cmd = isWindows
      ? `python -c "import ${importNameToUse}" 2>nul`
      : `python -c "import ${importNameToUse}" 2>/dev/null`;
    await execAsync(cmd, {
      shell: isWindows ? 'cmd.exe' : '/bin/sh',
      windowsHide: true
    });
    console.log(`   ✅ ${packageName}: installed`);
    return true;
  } catch {
    console.log(`   ⚠️  ${packageName}: not installed (optional)`);
    return false;
  }
}

async function checkWindowsDependency(name, command, checkCommand) {
  try {
    await execAsync(checkCommand || command, {
      shell: 'powershell.exe',
      windowsHide: true
    });
    console.log(`✅ ${name}: installed`);
    try {
      const { stdout } = await execAsync(command, {
        shell: 'powershell.exe',
        windowsHide: true
      });
      if (stdout) {
        const lines = stdout.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          console.log(`   Version: ${lines[0].trim()}`);
        }
      }
    } catch {}
    return true;
  } catch {
    console.log(`❌ ${name}: not found`);
    return false;
  }
}

async function main() {
  console.log('🔍 Academic Resource Finder - Dependency Check\n');
  console.log('='.repeat(50));
  console.log(`🖥️  Platform: ${process.platform} (${isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'})`);
  console.log('='.repeat(50));

  console.log('\n📦 Core Dependencies:');

  await checkDependency(
    'Node.js',
    isWindows ? 'node --version' : 'node --version',
    undefined,
    'Node.js is required. Install from https://nodejs.org/'
  );

  await checkDependency(
    'npm',
    isWindows ? 'npm --version' : 'npm --version',
    undefined,
    'npm is required. It comes with Node.js.'
  );

  console.log('\n🔧 OCR & Image Processing Dependencies:');

  if (isWindows) {
    await checkWindowsDependency(
      'Tesseract OCR',
      'tesseract --version',
      'Get-Command tesseract -ErrorAction SilentlyContinue'
    );

    const popplerInstalled = await checkPoppler();
    if (!popplerInstalled) {
      console.log('❌ Poppler Utils: not found');
      console.log('   Install: choco install poppler (with Chocolatey)');
      console.log('   Or download from: https://github.com/oschwartz10612/poppler-windows/releases/');
      console.log('   Add bin folder to PATH');
    } else {
      console.log('✅ Poppler Utils: installed');
    }

    await checkWindowsDependency(
      'ImageMagick',
      'magick --version',
      'Get-Command magick -ErrorAction SilentlyContinue'
    );

    await checkWindowsDependency(
      'Python',
      'python --version',
      'Get-Command python -ErrorAction SilentlyContinue'
    );
  } else {
    await checkDependency(
      'Tesseract OCR',
      'tesseract --version',
      undefined,
      'Tesseract OCR is required for image text extraction.\n   Install: sudo apt-get install tesseract-ocr (Ubuntu/Debian)\n   Or: brew install tesseract (macOS)'
    );

    const popplerInstalled = await checkPoppler();
    if (!popplerInstalled) {
      console.log('❌ Poppler Utils: not found');
      console.log('   Install: sudo apt-get install poppler-utils (Ubuntu/Debian)');
      console.log('   Or: brew install poppler (macOS)');
    } else {
      console.log('✅ Poppler Utils: installed');
    }

    await checkDependency(
      'ImageMagick',
      'convert --version',
      undefined,
      'ImageMagick is recommended for image processing.\n   Install: sudo apt-get install imagemagick (Ubuntu/Debian)\n   Or: brew install imagemagick (macOS)'
    );

    await checkDependency(
      'Python',
      'python3 --version',
      undefined,
      'Python is required for Word/Excel/PPT extraction.\n   Install: sudo apt-get install python3 (Ubuntu/Debian)\n   Or: brew install python (macOS)'
    );
  }

  console.log('\n🐍 Python Packages (for advanced document parsing):');

  const pythonCmd = isWindows ? 'python' : 'python3';

  try {
    await execAsync(`${pythonCmd} -c "import docx"`, {
      shell: isWindows ? 'cmd.exe' : '/bin/sh',
      windowsHide: true
    });
    console.log('   ✅ python-docx: installed');
  } catch {
    console.log('   ⚠️  python-docx: not installed (optional, for .docx files)');
    console.log(`       Install: ${isWindows ? 'pip' : 'pip3'} install python-docx`);
  }

  try {
    await execAsync(`${pythonCmd} -c "import pandas"`, {
      shell: isWindows ? 'cmd.exe' : '/bin/sh',
      windowsHide: true
    });
    console.log('   ✅ pandas: installed');
  } catch {
    console.log('   ⚠️  pandas: not installed (optional, for .xlsx files)');
    console.log(`       Install: ${isWindows ? 'pip' : 'pip3'} install pandas openpyxl`);
  }

  try {
    await execAsync(`${pythonCmd} -c "import pptx"`, {
      shell: isWindows ? 'cmd.exe' : '/bin/sh',
      windowsHide: true
    });
    console.log('   ✅ python-pptx: installed');
  } catch {
    console.log('   ⚠️  python-pptx: not installed (optional, for .pptx files)');
    console.log(`       Install: ${isWindows ? 'pip' : 'pip3'} install python-pptx`);
  }

  try {
    await execAsync(`${pythonCmd} -c "import textract"`, {
      shell: isWindows ? 'cmd.exe' : '/bin/sh',
      windowsHide: true
    });
    console.log('   ✅ textract: installed');
  } catch {
    console.log('   ⚠️  textract: not installed (optional, fallback parser)');
    console.log(`       Install: ${isWindows ? 'pip' : 'pip3'} install textract`);
  }

  console.log('\n📁 Tesseract Language Data:');
  await checkTessdata();

  console.log('\n📂 Directory Structure:');

  const dirs = [
    { name: 'uploads/documents', path: path.join(__dirname, 'uploads', 'documents') },
    { name: 'tessdata', path: path.join(__dirname, 'tessdata') }
  ];

  for (const dir of dirs) {
    if (fs.existsSync(dir.path)) {
      console.log(`   ✅ ${dir.name}: exists`);
    } else {
      console.log(`   ⚠️  ${dir.name}: not found (will be created automatically)`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Quick Installation Commands:');

  if (isWindows) {
    console.log('\nWindows (with Chocolatey):');
    console.log('  choco install tesseract poppler imagemagick python');
    console.log('  pip install python-docx pandas openpyxl python-pptx textract');
    console.log('\nWindows (Manual Installation):');
    console.log('  1. Download Tesseract: https://github.com/UB-Mannheim/tesseract/wiki');
    console.log('  2. Download Poppler: https://github.com/oschwartz10612/poppler-windows/releases/');
    console.log('  3. Download ImageMagick: https://imagemagick.org/script/download.php');
    console.log('  4. Download Python: https://www.python.org/downloads/');
    console.log('  5. Add all to PATH environment variable');
  } else if (isMac) {
    console.log('\nmacOS (with Homebrew):');
    console.log('  brew install tesseract poppler imagemagick python');
    console.log('  pip3 install python-docx pandas openpyxl python-pptx textract');
  } else {
    console.log('\nUbuntu/Debian:');
    console.log('  sudo apt-get update');
    console.log('  sudo apt-get install -y tesseract-ocr tesseract-ocr-hin poppler-utils imagemagick python3 python3-pip');
    console.log('  pip3 install python-docx pandas openpyxl python-pptx textract');
  }

  console.log('\n📥 Download traineddata files:');
  if (isWindows) {
    console.log('  curl -o tessdata\\hin.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/hin.traineddata');
    console.log('  curl -o tessdata\\eng.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata');
  } else {
    console.log('  curl -o tessdata/hin.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/hin.traineddata');
    console.log('  curl -o tessdata/eng.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata');
  }

  console.log('\n' + '='.repeat(50));

  if (isWindows) {
    console.log('\n⚠️  Windows Notes:');
    console.log('   - Make sure all binaries are in your PATH');
    console.log('   - Restart your terminal/IDE after installing dependencies');
    console.log('   - For Tesseract, install the Hindi language pack during setup');
    console.log('   - For Poppler, add the bin folder to your PATH');
  }
}

main().catch(console.error);
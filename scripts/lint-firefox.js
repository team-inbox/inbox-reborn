// Builds the Firefox package and runs Mozilla's addons-linter on it - the
// same validation addons.mozilla.org applies to an upload. Errors fail the
// run; warnings are printed for review but don't block.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const linter = require('addons-linter');

const main = async () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-reborn-firefox-'));
  const build = spawnSync(process.execPath, ['build.js', 'firefox', 'unpacked'], {
    env: { ...process.env, BUILD_OUTPUT_DIR: outputDir },
    stdio: 'inherit',
  });
  if (build.status !== 0) process.exit(build.status || 1);

  const instance = linter.createInstance({
    config: {
      _: [path.join(outputDir, 'inbox-reborn-firefox')],
      logLevel: 'fatal',
      stack: false,
      pretty: false,
      warningsAsErrors: false,
      metadata: false,
      output: 'none',
      boring: false,
      selfHosted: false,
    },
    runAsBinary: false,
  });

  const { errors, warnings, summary } = await instance.run();
  fs.rmSync(outputDir, { recursive: true, force: true });

  const report = (label, messages) =>
    messages.forEach(({ code, message, file, line }) =>
      console.log(
        `${label} ${code}: ${message}${file ? ` (${file}${line ? `:${line}` : ''})` : ''}`,
      ),
    );
  report('error  ', errors);
  report('warning', warnings);

  console.log(`addons-linter: ${summary.errors} errors, ${summary.warnings} warnings`);
  if (summary.errors) process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

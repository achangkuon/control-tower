const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
};

if (Bun.argv.length !== 2) {
  fail("Provide the password through standard input only.");
} else {
  try {
    const input = await Bun.stdin.text();
    const password = input.replace(/\r?\n$/, "");
    if (password.length === 0 || /[\r\n]/.test(password)) {
      fail("Password input must be one non-empty line.");
    } else {
      const hash = await Bun.password.hash(password, { algorithm: "argon2id" });
      process.stdout.write(`${hash}\n`);
    }
  } catch {
    fail("Unable to generate password hash.");
  }
}

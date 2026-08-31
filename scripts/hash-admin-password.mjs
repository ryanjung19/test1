import { randomBytes, scryptSync } from "node:crypto";

function readFromPipe() {
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { value += chunk; });
    process.stdin.on("end", () => resolve(value.trim()));
    process.stdin.on("error", reject);
  });
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    return readFromPipe();
  }

  return new Promise((resolve) => {
    let value = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") process.exit(130);
        if (character === "\r" || character === "\n") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (character >= " ") {
          value += character;
          process.stdout.write("*");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

const password = await readHidden("Admin password: ");
if (password.length < 16) {
  throw new Error("Use an administrator password with at least 16 characters.");
}

const salt = randomBytes(24);
const hash = scryptSync(password, salt, 64, {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});
process.stdout.write(`scrypt$32768$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}\n`);

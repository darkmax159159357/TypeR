import { spawn } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

const cwd = process.cwd();

function run(cmd, args = [], options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true, ...options });
    child.on("exit", (code) => (code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited with ${code}`))));
    child.on("error", reject);
  });
}

(async () => {
  try {
    console.log("npm run build");
    await run("npm", ["run", "build"], { cwd });

    if (process.platform === "win32") {
      const winScript = resolve(cwd, "install_win.cmd");
      if (!existsSync(winScript)) throw new Error("install_win.cmd not found in project root.");
      console.log("install_win.cmd");
      await run("cmd", ["/c", "install_win.cmd"], { cwd });
    } else if (process.platform === "darwin") {
      const macScript = resolve(cwd, "install_mac.sh");
      if (!existsSync(macScript)) throw new Error("install_mac.sh not found in project root.");
      console.log("chmod +x install_mac.sh");
      await run("chmod", ["+x", "install_mac.sh"], { cwd });
      console.log("./install_mac.sh");
      await run("./install_mac.sh", [], { cwd });
    } else {
      throw new Error(`Unsupported OS: ${process.platform}`);
    }

    console.log("Done.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();

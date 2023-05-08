import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const main = async () => {
	const getPath = (relativePath: string) => {
		return path.resolve(__dirname, relativePath);
	};
	fs.writeFileSync(getPath("../.BUILD_ID"), new Date().getTime().toString());
	console.log(fs.readFileSync(getPath("../.BUILD_ID"), "utf-8"));
};

main();

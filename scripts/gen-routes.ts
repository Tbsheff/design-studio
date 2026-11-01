const mode = process.argv.includes("--check") ? "check" : "write";

process.stdout.write(`gen-routes (${mode}): no defineOp registry yet; P4 fills this script.\n`);

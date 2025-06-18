import { spawn } from "node:child_process"; //allows us to communicate with our server
import * as readline  from "node:readline/promises";

(async function main(){
    const serverProces = spawn("node", ["../server/dist/index.js"], { //create bi-directioncal communication between the server and the client or any mcp server that we want
        stdio: ["pipe", "pipe", "inherit"]
    })

    const rl = readline.createInterface({
        input: serverProces.stdout, //this will be the output of the server process
        output: undefined,
    })

    let lastId = 0
    async function send(
        method: string,
        params: object = {},
        isNotification?: boolean,
    ){
        serverProces.stdin.write(
            JSON.stringify({
                jsonrpc: "2.0",
                method,
                params,
                id: isNotification ? undefined : lastId++,
            }) + "\n"
        )

        if (isNotification){
            return;
        }
        const json = await rl.question("")
        return JSON.parse(json).result;
    }

    const out = await send("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "MCP Client", version: "0.10.0" }
    })

    console.log(out)
})()
import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

//server information
const serverInfo = {
  name: "frazier's node mcp sever",
  version: "1.0.0",
};

const motorcycles = [
  {
    name: "Africa Twin",
    year: "2025",
    description: "this bike was built with yamaha in mind.",
  },
  {
    name: "Ducati Monster",
    year: "2020",
    description: "This is now an Italian masterpiece.",
  },
  {
    name: "KTM Duke",
    year: "2020",
    description: "This one comes from Austria, too bad it going away.",
  },
];

const resources = [
  {
    uri: "catalogue://app", //the uri has to match the resource content uri for this to work
    name: "catalogue",
    get: async () => {
      return {
        contents: [
          {
            uri: "catalogue://app",
            text: JSON.stringify(motorcycles),
          },
        ] 
      }
    },
  },
]

//allow us to take in input and output when communicating with this
const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

//our response structure which can be anything but in our case, this will do
function sendReponse(id: number, result: object) {
  const response = {
    result,
    jsonrpc: "2.0",
    id,
  };

  console.log(JSON.stringify(response)); //to return everything onto a single line
}

const tools = [
  {
    name: "getBikeNames",
    description: "Get the names of all the motorcycles in the shop",
    inputSchema: { type: "object", properties: {} },
    execute: async (args: any) => {
      return {
        //this format is part of the MCP standard for tools
        content: [
          {
            type: "text",
            text: JSON.stringify({
              names: motorcycles.map((moto) => moto.name),
            }),
          },
        ],
      };
    },
  },
  {
    name: "getBikeInfo",
    description: "get additional information on your motorcycle of choice",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
      },
      required: ["name"],
    },
    execute: async (args: any) => {
      const bike = motorcycles.find((moto) => moto.name === args.name);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(bike || { error: "Bike of choice not found" }),
          },
        ],
      };
    },
  },
];



//our function to run the server
(async function main() {
  for await (const line of rl) {
    try {
      const json = JSON.parse(line);
      if (json.jsonrpc === "2.0") {
        if (json.method === "initialize") {
          //now we send back the response to our request
          sendReponse(json.id, {
            protocolVersion: "2025-03-26",
            capabilities: {
              tools: { listChanged: true },
              resources: {listChanged: true },
            },
            serverInfo,
          });
        }
      }

      if (json.method === "tools/list") {
        sendReponse(json.id, {
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        });
      }

      if (json.method === "tools/call") {
        const tool = tools.find((tool) => tool.name === json.params.name);

        if (tool) {
          const toolResponse = await tool.execute(json.params.arguments);
          sendReponse(json.id, toolResponse);
        } else {
          sendReponse(json.id, {
            error: {
              code: -32602,
              message: `MCP error -32602: Tool ${json.params.arguments} not found in the tools list`,
            },
          });
        }
      }

      //these are needed to support the resources 

      if (json.method === "resources/list") {
        sendReponse(json.id, {
          resources: resources.map((resource) => ({
            uri: resource.uri,
            name: resource.name,
            
          })),
        });
      }

      if (json.method === "resources/read") {
        const uri = json.params.uri
        const resource = resources.find((resource) => resource.uri === uri)

        if (resource){
          sendReponse(json.id, await resource.get())
        }else{
          sendReponse(json.id, {
            error: { code: -32602, message: "requested resource not found"}
          })
        }

      }

      //as a protocol, this ping method is required for this to meet the standard

      if(json.method === "ping"){
        sendReponse(json.id, {}) //this can just be blank
      }
    } catch (error) {
      console.error(error);
    }
  }
})();

const net = require("net");
const fs = require("fs");
const zlib = require("zlib");
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage

const OK_RESPONSE = "HTTP/1.1 200 OK\r\n\r\n";
const ERROR_RESPONSE = "HTTP/1.1 404 Not Found\r\n\r\n";

const server = net.createServer((socket) => {
  socket.on("close", () => {
    socket.end();
  });

  socket.on("data", (data) => {
    const url = data.toString().split(" ")[1];
    const method = data.toString().split(" ")[0];
    const headers = data.toString().split("\r\n");
    const encoding = headers.find(
      (header) => header == "Accept-Encoding: gzip"
    );

    const requestHeader = [];
    headers.forEach((elt) => {
      requestHeader.push(elt.toLowerCase().split(": "));
    });

    if (url === "/") {
      socket.write(OK_RESPONSE);
    }
    // Return files
    else if (url.startsWith("/files/") && method === "GET") {
      const directory = process.argv[3];
      const filename = url.split("/files/")[1];

      // Check file exits or not
      if (fs.existsSync(`${directory}/${filename}`)) {
        const content = fs.readFileSync(`${directory}/${filename}`).toString();
        const res = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n${content}\r\n`;
        socket.write(res);
      } else {
        socket.write(ERROR_RESPONSE);
      }
    }
    // POST method
    else if (url.startsWith("/files/") && method === "POST") {
      const filename = process.argv[3] + url.substring(7);
      console.log(filename);
      const req = data.toString().split("\r\n");
      const body = req[req.length - 1];
      fs.writeFileSync(filename, body);
      socket.write(`HTTP/1.1 201 Created\r\n\r\n`);
    }

    // echo
    else if (url.includes("/echo/")) {
      const bodyContent = url.split("/")[2];
      const content_length = bodyContent.length.toString();
      // zlib
      const bodyEncoded = zlib.gzipSync(bodyContent);
      const bodyEncodedLength = bodyEncoded.length;

      let acceptEncoding = null;
      for (const header of requestHeader) {
        if (header[0] === "accept-encoding" && header[1].includes("gzip")) {
          acceptEncoding = "gzip";
          break;
        }
      }
      // create response for zlib
      const response = `HTTP/1.1 200 OK\r\nContent-Encoding: ${acceptEncoding}\r\nContent-Type: text/plain\r\nContent-Length: ${bodyEncodedLength}\r\n\r\n`;
      if (acceptEncoding !== null) {
        socket.write(response);
        socket.write(bodyEncoded);
      } else {
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${content_length}\r\n\r\n${bodyContent}`
        );
      }
    }
    // encoding
    else if (encoding !== undefined && encoding === "Accept-Encoding: gzip") {
      console.log(encoding);
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Encoding: gzip\r\n\r\n`
      );
    }

    // Headers (User Agent)
    else if (url === "/user-agent") {
      const userAgent = headers[2].split("User-Agent: ")[1];
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`
      );
    } else {
      socket.write(ERROR_RESPONSE);
    }
    socket.end();
  });

  socket.on("error", () => {
    socket.write("HTTP/1.1 500\r\n\r\n");
    socket.end();
  });
});

server.listen(4221, "localhost");

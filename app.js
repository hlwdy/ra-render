const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
var exec = require("child_process").exec;
const os = require("os");
const { createProxyMiddleware } = require("http-proxy-middleware");
var request = require("request");
//const fetch = require("node-fetch");
const render_app_url = "https://" + process.env.RENDER_EXTERNAL_HOSTNAME;

app.get("/", (req, res) => {
  res.send("hello world!");
});

app.get("/status", (req, res) => {
  let cmdStr = "ps -ef";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.type("html").send("<pre>error：\n" + err + "</pre>");
    } else {
      res.type("html").send("<pre>result：\n" + stdout + "</pre>");
    }
  });
});

app.get("/start", (req, res) => {
  let cmdStr = "./web.js -c ./config.json >/dev/null 2>&1 &";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.send("error：" + err);
    } else {
      res.send("result:web.js启动成功!");
    }
  });
});

app.get("/info", (req, res) => {
  let cmdStr = "cat /etc/*release | grep -E ^NAME";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.send("error：" + err);
    } else {
      res.send(
        "result：\n" +
          "Linux System:" +
          stdout +
          "\nRAM:" +
          os.totalmem() / 1000 / 1000 +
          "MB"
      );
    }
  });
});

app.use(
  "/",
  createProxyMiddleware({
    target: "http://127.0.0.1:8080/", // 需要跨域处理的请求地址
    changeOrigin: true, // 默认false，是否需要改变原始主机头为目标URL
    ws: true, // 是否代理websockets
    pathRewrite: {
      "^/": "/",
    },
    onProxyReq: function onProxyReq(proxyReq, req, res) {
      //console.log("-->  ",req.method,req.baseUrl,"->",proxyReq.host + proxyReq.path);
    },
  })
);

/* keepalive  begin */
function keepWake() {
  // 1.request主页，保持awake
  request(render_app_url, function (error, response, body) {
    if (!error) {
      console.log("send ok!");
      console.log("content: ", body);
    } else console.log("error: " + error);
  });

  //2. 本地进程检测,保活web.js
  exec("ps -ef", function (err, stdout, stderr) {
    if (err) {
      console.log("保活web.js-本地进程检测-error:" + err);
    } else {
      if (stdout.includes("./web.js -c ./config.json"))
        console.log("保活web.js-本地进程检测-web.js正在运行");
      //命令调起web.js
      else startWeb();
    }
  });
}

//保活频率
setInterval(keepWake, 50 * 1000);
/* keepalive  end */

function startWeb() {
  let startWebCMD = "chmod +x ./web.js && ./web.js -c ./config.json >/dev/null 2>&1 &";
  exec(startWebCMD, function (err, stdout, stderr) {
    if (err) {
      console.log("启动web.js-失败:" + err);
    } else {
      console.log("启动web.js-成功!");
    }
  });
}

/* init  begin */
exec("tar -zxvf src.tar.gz", function (err, stdout, stderr) {
  if (err) {
    console.log("init-解压失败:" + err);
  } else {
    console.log("init-解压成功!");
    startWeb();
  }
});
/* init  end */
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

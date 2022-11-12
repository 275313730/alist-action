const fs = require("fs");
const request = require("request");

const config = require("./config.json");

const listAPI = encodeURI(config.listAPI);
const fileAPI = encodeURI(config.fileAPI);
const timeout = config.timeout;

const root = "/AI画廊 NSFW";

let allCount = 0;
let goodCount = 0;
let badCount = 0;

function getAllFileList(callback) {
  let allFileList = [];
  getOnedriveData({ path: root, isDir: true }, allFileList);
  let interval = setInterval(() => {
    console.log(`总加载数:${allCount},加载成功:${goodCount},加载失败:${badCount}`);
    if (goodCount + badCount == allCount) {
      clearInterval(interval);
      callback(allFileList);
    }
  }, 3000);
}

function getOnedriveData(options, fileList) {
  allCount += 1;
  request(getRequestOptions(options), function (error, response, body) {
    if (!error && response.statusCode == 200) {
      options.isDir ? handleDir(options, body.data.content, fileList) : handleFile(body.data, fileList);
      goodCount += 1;
    } else {
      badCount += 1;
    }
  });
}

function getRequestOptions(options) {
  let requestOptions = {
    url: "",
    timeout,
    method: "POST",
    json: true,
    headers: {
      "content-type": "application/json",
    },
    body: {
      path: options.path,
      password: "",
    },
  };
  if (options.isDir) {
    requestOptions.url = listAPI;
    requestOptions.body.page = 1;
    requestOptions.body.per_page = 0;
    requestOptions.refresh = false;
  } else {
    requestOptions.url = fileAPI;
  }
  return requestOptions;
}

function handleDir(options, contents, fileList) {
  for (let content of contents) {
    let newFileList = [];
    if (content.is_dir) {
      fileList.push({
        name: content.name,
        isDir: true,
        files: newFileList,
      });
      getOnedriveData(
        {
          path: options.path + "/" + content.name,
          isDir: true,
        },
        newFileList
      );
    } else {
      if (!content.name.endsWith(".png")) continue;
      getOnedriveData(
        {
          path: options.path + "/" + content.name,
          isDir: false,
        },
        fileList
      );
    }
  }
}

function handleFile(data, fileList) {
  fileList.push({
    name: data.name,
    isDir: false,
    rawUrl: data.raw_url,
  });
}

getAllFileList((data) => {
  fs.writeFileSync("./fileList.json", JSON.stringify(data));
});

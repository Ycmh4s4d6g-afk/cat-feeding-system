const DEFAULT_TIMEOUT = 30000;
const BASE_URL = "http://10.100.153.147:5000";

const config = {
  baseUrl: BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  header: {}
};

function setRequestConfig(nextConfig = {}) {
  Object.assign(config, nextConfig);
}

function joinUrl(baseUrl, url) {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (!baseUrl) {
    return url;
  }

  return `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

function request(options = {}) {
  const header = Object.assign({}, config.header, options.header || {});

  return new Promise((resolve, reject) => {
    wx.request({
      url: joinUrl(options.baseUrl || config.baseUrl, options.url || ""),
      method: options.method || "GET",
      data: options.data || {},
      header,
      timeout: options.timeout || config.timeout,
      success(res) {
        console.log("request response:", {
          url: joinUrl(options.baseUrl || config.baseUrl, options.url || ""),
          statusCode: res.statusCode,
          data: res.data
        });

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        reject({
          message: `Request failed: ${res.statusCode}`,
          statusCode: res.statusCode,
          data: res.data
        });
      },
      fail(err) {
        console.error("request fail:", {
          url: joinUrl(options.baseUrl || config.baseUrl, options.url || ""),
          err
        });
        reject(err);
      }
    });
  });
}

function get(url, data = {}, options = {}) {
  return request(Object.assign({}, options, {
    url,
    data,
    method: "GET"
  }));
}

function post(url, data = {}, options = {}) {
  return request(Object.assign({}, options, {
    url,
    data,
    method: "POST"
  }));
}

function put(url, data = {}, options = {}) {
  return request(Object.assign({}, options, {
    url,
    data,
    method: "PUT"
  }));
}

function del(url, data = {}, options = {}) {
  return request(Object.assign({}, options, {
    url,
    data,
    method: "DELETE"
  }));
}

function parseUploadData(data) {
  if (typeof data !== "string") {
    return data;
  }

  try {
    return JSON.parse(data);
  } catch (err) {
    return data;
  }
}

function uploadFile(options = {}) {
  const header = Object.assign({}, config.header, options.header || {});

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: joinUrl(options.baseUrl || config.baseUrl, options.url || ""),
      filePath: options.filePath,
      name: options.name || "file",
      formData: options.formData || {},
      header,
      timeout: options.timeout || config.timeout,
      success(res) {
        const data = parseUploadData(res.data);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
          return;
        }

        reject({
          message: `Upload failed: ${res.statusCode}`,
          statusCode: res.statusCode,
          data
        });
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  BASE_URL,
  setRequestConfig,
  request,
  get,
  post,
  put,
  delete: del,
  uploadFile
};

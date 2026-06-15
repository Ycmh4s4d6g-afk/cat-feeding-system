const {
  BASE_URL,
  detectCamera,
  getScreenshotList
} = require("../../utils/api.js");

const LATEST_SCREENSHOT_URL = `${BASE_URL.replace(/\/$/, "")}/api/screenshot/latest`;
const SCREENSHOT_FILE_URL = `${BASE_URL.replace(/\/$/, "")}/api/screenshot/file`;

function toImageUrl(value) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//.test(value)) {
    return value;
  }

  return `${BASE_URL.replace(/\/$/, "")}/${String(value).replace(/^\//, "")}`;
}

function normalizeScreenshot(item = {}) {
  const imageUrl = item.image_url || item.url || item.path || item.file_path || item.filename;
  const createdAt = item.created_at || item.time || item.timestamp || "";
  const filename = item.filename || "";
  const remoteUrl = filename ? `${SCREENSHOT_FILE_URL}/${filename}` : toImageUrl(imageUrl);

  return {
    id: item.id || filename || imageUrl || createdAt || Date.now(),
    imageUrl: remoteUrl,
    displayUrl: "",
    time: createdAt,
    type: item.scene || item.type || "eating",
    confidence: item.confidence !== undefined ? item.confidence : ""
  };
}

Page({
  data: {
    latest: {
      imageUrl: LATEST_SCREENSHOT_URL,
      time: ""
    },
    captures: [],
    loading: false,
    takingPhoto: false
  },
  screenshotRequestId: 0,

  onLoad() {
    this.loadScreenshots();
  },

  onShow() {
    this.loadScreenshots();
  },

  loadScreenshots() {
    const requestId = this.screenshotRequestId + 1;
    this.screenshotRequestId = requestId;
    this.setData({ loading: true });

    getScreenshotList({ type: "eating" })
      .catch((err) => {
        console.error("screenshot list failed:", err);
        return [];
      })
      .then((listData) => {
      const screenshotItems = Array.isArray(listData) ? listData : (Array.isArray(listData.data) ? listData.data : []);
      const captures = screenshotItems.map(normalizeScreenshot);
      const latestFromList = captures[0] || {};
      const latestUrl = latestFromList.imageUrl || `${LATEST_SCREENSHOT_URL}?t=${Date.now()}`;

      this.setData({
        latest: {
          imageUrl: latestUrl,
          displayUrl: "",
          time: latestFromList.time || ""
        },
        captures,
        loading: false
      }, () => {
        this.downloadScreenshotImages(requestId);
      });
    });
  },

  refreshScreenshots() {
    this.loadScreenshots();
  },

  refreshLatestScreenshot() {
    const requestId = this.screenshotRequestId + 1;
    this.screenshotRequestId = requestId;

    this.setData({
      latest: Object.assign({}, this.data.latest, {
        imageUrl: `${LATEST_SCREENSHOT_URL}?t=${Date.now()}`,
        displayUrl: ""
      })
    }, () => {
      this.downloadLatestImage(requestId);
    });
  },

  takePhotoNow() {
    if (this.data.takingPhoto) {
      return;
    }

    this.setData({ takingPhoto: true });
    detectCamera()
      .then(() => {
        wx.showToast({ title: "拍照完成", icon: "success" });
        this.refreshLatestScreenshot();
        setTimeout(() => {
          this.loadScreenshots();
        }, 500);
      })
      .catch((err) => {
        console.error("camera detect failed:", err);
        wx.showToast({ title: "拍照失败", icon: "none" });
      })
      .finally(() => {
        this.setData({ takingPhoto: false });
      });
  },

  previewLatest() {
    if (!this.data.latest || (!this.data.latest.displayUrl && !this.data.latest.imageUrl)) {
      return;
    }

    this.previewImage(this.data.latest.displayUrl || this.data.latest.imageUrl);
  },

  previewCapture(event) {
    const url = event.currentTarget.dataset.url;
    this.previewImage(url);
  },

  previewImage(currentUrl) {
    if (!currentUrl) {
      return;
    }

    const urls = this.data.captures
      .map((item) => item.displayUrl || item.imageUrl)
      .filter(Boolean);

    if (!urls.includes(currentUrl)) {
      urls.unshift(currentUrl);
    }

    wx.previewImage({
      current: currentUrl,
      urls
    });
  },

  downloadImage(url) {
    if (!url) {
      return Promise.resolve("");
    }

    return new Promise((resolve) => {
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
            resolve(res.tempFilePath);
            return;
          }

          console.error("download screenshot failed:", res);
          resolve("");
        },
        fail: (err) => {
          console.error("download screenshot failed:", err);
          resolve("");
        }
      });
    });
  },

  downloadLatestImage(requestId) {
    const latest = this.data.latest || {};

    this.downloadImage(latest.imageUrl).then((displayUrl) => {
      if (requestId !== this.screenshotRequestId || !displayUrl) {
        return;
      }

      this.setData({
        latest: Object.assign({}, this.data.latest, { displayUrl })
      });
    });
  },

  downloadScreenshotImages(requestId) {
    this.downloadLatestImage(requestId);

    const captures = this.data.captures || [];
    captures.forEach((item, index) => {
      this.downloadImage(item.imageUrl).then((displayUrl) => {
        if (requestId !== this.screenshotRequestId || !displayUrl) {
          return;
        }

        const key = `captures[${index}].displayUrl`;
        this.setData({ [key]: displayUrl });
      });
    });
  }
});

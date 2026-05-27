const { getDeviceSnapshot } = require("../../utils/mock-device");

Page({
  data: {
    captures: []
  },

  onLoad() {
    const { captures } = getDeviceSnapshot();
    this.setData({ captures });
  },

  takePhoto() {
    this.addCapture("远程拍照", 0.82);
    wx.showToast({ title: "拍照成功", icon: "success" });
  },

  simulateDetect() {
    wx.showModal({
      title: "检测到猫咪",
      content: "红外触发后完成抓拍，模型识别为 cat，置信度 0.88。",
      showCancel: false
    });
    this.addCapture("红外触发", 0.88);
  },

  addCapture(type, confidence) {
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const capture = {
      id: Date.now(),
      time,
      type,
      confidence
    };
    this.setData({ captures: [capture, ...this.data.captures] });
  }
});

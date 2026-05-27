const { getDeviceSnapshot } = require("../../utils/mock-device");

Page({
  data: {
    status: {},
    schedules: []
  },

  onLoad() {
    const { status, schedules } = getDeviceSnapshot();
    this.setData({ status, schedules });
  },

  feedNow() {
    wx.showModal({
      title: "确认喂食",
      content: "将远程下发一次手动喂食指令，舵机打开 2 秒后自动关闭。",
      confirmText: "喂食",
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: "指令已发送", icon: "success" });
        }
      }
    });
  },

  goCamera() {
    wx.switchTab({ url: "/pages/camera/camera" });
  }
});

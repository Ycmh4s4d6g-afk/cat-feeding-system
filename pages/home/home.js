const { getDeviceSnapshot } = require("../../utils/mock-device");
const {
  PORTION_SECONDS,
  getDeviceStatus,
  getFeedSchedules,
  manualFeed,
  normalizeSchedule,
  normalizeStatus
} = require("../../utils/api.js");

Page({
  data: {
    status: {},
    schedules: []
  },

  onLoad() {
    const { status, schedules } = getDeviceSnapshot();
    this.setData({ status, schedules });
    this.loadDeviceData();
  },

  onShow() {
    this.loadDeviceData();
  },

  loadDeviceData() {
    const fallbackStatus = this.data.status;

    Promise.all([
      getDeviceStatus().catch((err) => {
        console.error("device status failed:", err);
        return null;
      }),
      getFeedSchedules().catch((err) => {
        console.error("feed schedules failed:", err);
        return null;
      })
    ]).then(([statusData, schedulesData]) => {
      const nextData = {};

      if (statusData) {
        nextData.status = normalizeStatus(statusData, fallbackStatus);
      }

      if (Array.isArray(schedulesData)) {
        nextData.schedules = schedulesData.map(normalizeSchedule);
      }

      this.setData(nextData);
    });
  },

  feedNow() {
    wx.showModal({
      title: "确认喂食",
      content: `将远程下发一次手动喂食指令，持续 ${PORTION_SECONDS} 秒。`,
      confirmText: "喂食",
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        manualFeed(PORTION_SECONDS)
          .then(() => {
            wx.showToast({ title: "已发送", icon: "success" });
            this.loadDeviceData();
          })
          .catch((err) => {
            console.error("manual feed failed:", err);
            wx.showToast({ title: "发送失败", icon: "none" });
          });
      }
    });
  },

  goCamera() {
    wx.switchTab({ url: "/pages/camera/camera" });
  }
});
